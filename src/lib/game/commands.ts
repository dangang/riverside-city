import {
  BUILDING_DEFS,
  PROMOTE_PARK_COST,
  ROOM_BUILD_COST,
  ROOM_BUILD_MS,
  ROOM_ORDER,
  ROOM_UPGRADE_COST,
  ROOM_UPGRADE_MS,
  GOAL_DEFS,
} from "./defs";
import {
  assignHomesAndJobs,
  checkGoalsAndUnlocks,
  computeOfflineSummary,
  applyOfflineToState,
  createJobsForBuilding,
  incomePerSecond,
  spawnCitizens,
  uid,
  housingCapacity,
} from "./engine";
import { maybeReactToState } from "./feed";
import { maybeSpawnEvent, resolveEventChoice } from "./events";
import type {
  Building,
  CommandResult,
  GameCommand,
  CityState,
  RoomTier,
} from "./types";

function fail(state: CityState, error: string): CommandResult {
  return { ok: false, error, state };
}

function ok(
  state: CityState,
  toast?: string,
  fx?: CommandResult["fx"]
): CommandResult {
  return { ok: true, state, toast, fx };
}

function advanceTutorial(state: CityState): CityState {
  const step = state.tutorialStep;
  // name_city only advances via the name_city command
  if (step === "build_house" && state.buildings.some((b) => b.type === "starter_house")) {
    return { ...state, tutorialStep: "await_citizens" };
  }
  if (step === "await_citizens" && state.citizens.length > 0) {
    return { ...state, tutorialStep: "build_grocery" };
  }
  if (step === "build_grocery" && state.buildings.some((b) => b.type === "grocery")) {
    return { ...state, tutorialStep: "see_job" };
  }
  if (step === "see_job" && state.citizens.some((c) => c.job)) {
    return { ...state, tutorialStep: "upgrade" };
  }
  if (step === "upgrade" && state.buildings.some((b) => b.level >= 2)) {
    return { ...state, tutorialStep: "max_something" };
  }
  if (
    step === "max_something" &&
    state.buildings.some((b) => b.level >= BUILDING_DEFS[b.type].maxLevel)
  ) {
    return {
      ...state,
      tutorialStep: "done",
      pendingMilestone: state.pendingMilestone ?? {
        id: "first_max",
        title: "First MAX",
        body: "You maxed a building. Riverside is starting to shine.",
        unlocks: ["Faster early upgrades", "Social feed tips"],
      },
    };
  }
  return state;
}

export function applyCommand(
  state: CityState,
  cmd: GameCommand
): CommandResult {
  switch (cmd.type) {
    case "name_city": {
      const name = cmd.name.trim().slice(0, 32);
      if (name.length < 2) return fail(state, "Name must be at least 2 characters");
      let next: CityState = {
        ...state,
        name,
        tutorialStep: "build_house",
        history: [
          {
            id: uid("hist"),
            title: `${name} founded`,
            description: "A fresh district waits by the water.",
            createdAt: state.tickAt,
          },
          ...state.history,
        ],
      };
      return ok(next, `Welcome to ${name}`);
    }

    case "build": {
      const def = BUILDING_DEFS[cmd.buildingType];
      if (!def) return fail(state, "Unknown building");
      if (!state.unlocked.includes(cmd.buildingType)) {
        return fail(state, "Building not unlocked yet");
      }
      if (state.money < def.buildCost) return fail(state, "Not enough money");
      const occupied = state.buildings.some(
        (b) => b.plotX === cmd.plotX && b.plotY === cmd.plotY
      );
      if (occupied) return fail(state, "Plot already occupied");

      // one of each civic/business type for slice simplicity (housing can repeat)
      if (
        def.category !== "housing" &&
        state.buildings.some((b) => b.type === cmd.buildingType)
      ) {
        return fail(state, `You already have a ${def.name}`);
      }

      const building: Building = {
        id: uid("bld"),
        type: cmd.buildingType,
        level: 1,
        plotX: cmd.plotX,
        plotY: cmd.plotY,
        rooms:
          def.category === "housing"
            ? { bedroom: 1 as RoomTier }
            : {},
        upgradeCompletesAt: null,
        roomBuildCompletesAt: null,
        buildingRoom: null,
        justBuiltAt: state.tickAt,
      };

      const prev = state;
      let next: CityState = {
        ...state,
        money: state.money - def.buildCost,
        buildings: [...state.buildings, building],
        jobs: [...state.jobs, ...createJobsForBuilding(building)],
        history: [
          {
            id: uid("hist"),
            title: `${def.name} opened`,
            description: `${def.name} is now part of ${state.name}.`,
            createdAt: state.tickAt,
          },
          ...state.history,
        ],
        posts: state.posts,
      };

      if (def.category === "housing") {
        const room = housingCapacity(next.buildings) - next.citizens.length;
        const spawn = Math.min(room, def.capacityPerLevel);
        if (spawn > 0) next = spawnCitizens(next, spawn);
      } else {
        next = assignHomesAndJobs(next);
      }

      next = advanceTutorial(
        checkGoalsAndUnlocks(maybeReactToState(prev, next))
      );
      return ok(next, `Built ${def.name}`, {
        kind: "build",
        buildingId: building.id,
        plotX: cmd.plotX,
        plotY: cmd.plotY,
        amount: -def.buildCost,
      });
    }

    case "upgrade": {
      const building = state.buildings.find((b) => b.id === cmd.buildingId);
      if (!building) return fail(state, "Building not found");
      if (building.upgradeCompletesAt)
        return fail(state, "Already upgrading");
      const def = BUILDING_DEFS[building.type];
      if (building.level >= def.maxLevel) return fail(state, "Already MAX");
      const cost = def.upgradeCost(building.level);
      if (state.money < cost) return fail(state, "Not enough money");
      const ms = def.upgradeMs(building.level);
      const next: CityState = {
        ...state,
        money: state.money - cost,
        buildings: state.buildings.map((b) =>
          b.id === building.id
            ? { ...b, upgradeCompletesAt: state.tickAt + ms }
            : b
        ),
      };
      return ok(advanceTutorial(next), `Upgrading ${def.name}…`, {
        kind: "upgrade",
        buildingId: building.id,
      });
    }

    case "build_room": {
      const building = state.buildings.find((b) => b.id === cmd.buildingId);
      if (!building) return fail(state, "Building not found");
      if (BUILDING_DEFS[building.type].category !== "housing") {
        return fail(state, "Rooms only on homes");
      }
      if (building.roomBuildCompletesAt)
        return fail(state, "Room work in progress");
      const tier = building.rooms[cmd.room] ?? 0;
      if (tier > 0) return fail(state, "Room already built");
      // sequential unlock
      const idx = ROOM_ORDER.indexOf(cmd.room);
      if (idx > 0) {
        const prev = ROOM_ORDER[idx - 1];
        if ((building.rooms[prev] ?? 0) < 1) {
          return fail(state, `Build ${prev.replace("_", " ")} first`);
        }
      }
      if (state.money < ROOM_BUILD_COST) return fail(state, "Not enough money");
      const next: CityState = {
        ...state,
        money: state.money - ROOM_BUILD_COST,
        buildings: state.buildings.map((b) =>
          b.id === building.id
            ? {
                ...b,
                buildingRoom: cmd.room,
                roomBuildCompletesAt: state.tickAt + ROOM_BUILD_MS,
              }
            : b
        ),
      };
      return ok(next, "Building room…");
    }

    case "upgrade_room": {
      const building = state.buildings.find((b) => b.id === cmd.buildingId);
      if (!building) return fail(state, "Building not found");
      if (building.roomBuildCompletesAt)
        return fail(state, "Room work in progress");
      const tier = (building.rooms[cmd.room] ?? 0) as RoomTier;
      if (tier < 1) return fail(state, "Build the room first");
      if (tier >= 3) return fail(state, "Room already MAX");
      const cost = ROOM_UPGRADE_COST[tier];
      if (state.money < cost) return fail(state, "Not enough money");
      const ms = ROOM_UPGRADE_MS[tier];
      const next: CityState = {
        ...state,
        money: state.money - cost,
        buildings: state.buildings.map((b) =>
          b.id === building.id
            ? {
                ...b,
                buildingRoom: cmd.room,
                roomBuildCompletesAt: state.tickAt + ms,
              }
            : b
        ),
      };
      return ok(next, "Upgrading room…");
    }

    case "resolve_event": {
      return resolveEventChoice(state, cmd.eventId, cmd.choiceId);
    }

    case "collect_offline": {
      if (!state.pendingOffline) return fail(state, "Nothing to collect");
      return ok(applyOfflineToState(state, state.pendingOffline), "Collected!");
    }

    case "promote_park": {
      const park = state.buildings.find((b) => b.type === "park");
      if (!park) return fail(state, "Build Riverside Park first");
      if (state.money < PROMOTE_PARK_COST)
        return fail(state, "Not enough money");
      if (state.parkPromoUntil && state.parkPromoUntil > state.tickAt) {
        return fail(state, "A campaign is already running");
      }
      const influencer =
        state.citizens.find((c) => c.isInfluencer) ?? state.citizens[0];
      const handle = influencer
        ? `@${influencer.name.replace(/\s/g, "")}`
        : "@LenaKai";
      const authorName = influencer?.name ?? "Lena Kai";
      const next: CityState = {
        ...state,
        money: state.money - PROMOTE_PARK_COST,
        attention: Math.min(100, (state.attention ?? 10) + 5),
        parkPromoUntil: state.tickAt + 3 * 60 * 1000,
        stats: {
          ...state.stats,
          happiness: Math.min(100, state.stats.happiness + 5),
        },
        posts: [
          {
            id: uid("post"),
            citizenId: influencer?.id ?? null,
            handle,
            authorName,
            text: "Riverside Park is actually such a nice place to spend the afternoon.",
            createdAt: state.tickAt,
            likes: 120 + Math.floor(Math.random() * 400),
            comments: 10 + Math.floor(Math.random() * 40),
          },
          ...state.posts,
        ].slice(0, 40),
        history: [
          {
            id: uid("hist"),
            title: "Park campaign",
            description: `${authorName} promoted Riverside Park.`,
            createdAt: state.tickAt,
          },
          ...state.history,
        ],
      };
      return ok(checkGoalsAndUnlocks(next), "Campaign live!", {
        kind: "reward",
        buildingId: park.id,
        amount: -PROMOTE_PARK_COST,
      });
    }

    case "claim_goal": {
      const goal = state.goals.find((g) => g.id === cmd.goalId);
      if (!goal) return fail(state, "Goal not found");
      if (!goal.completed) return fail(state, "Goal not complete");
      if (goal.claimed) return fail(state, "Already claimed");
      const def = GOAL_DEFS.find((g) => g.id === cmd.goalId);
      const reward = def?.reward ?? 1000;
      const next: CityState = {
        ...state,
        money: state.money + reward,
        goals: state.goals.map((g) =>
          g.id === cmd.goalId ? { ...g, claimed: true } : g
        ),
        history: [
          {
            id: uid("hist"),
            title: `Goal: ${def?.title ?? cmd.goalId}`,
            description: `Claimed $${reward.toLocaleString()}.`,
            createdAt: state.tickAt,
          },
          ...state.history,
        ],
      };
      return ok(next, `+$${reward.toLocaleString()}`, {
        kind: "reward",
        amount: reward,
      });
    }

    case "dismiss_milestone": {
      let next = { ...state, pendingMilestone: null };
      if (state.pendingMilestone?.id === "district_complete") {
        next = {
          ...next,
          districtCelebrated: true,
          money: next.money + 15_000,
        };
      }
      return ok(next);
    }

    case "sync_time":
    case "tick": {
      return ok(tickCity(state, cmd.now));
    }

    default:
      return fail(state, "Unknown command");
  }
}

export function tickCity(state: CityState, now: number): CityState {
  let next = { ...state, tickAt: now };

  // complete upgrades
  let buildingsChanged = false;
  next.buildings = next.buildings.map((b) => {
    let building = b;
    if (b.upgradeCompletesAt && b.upgradeCompletesAt <= now) {
      buildingsChanged = true;
      const def = BUILDING_DEFS[b.type];
      const newLevel = Math.min(def.maxLevel, b.level + 1);
      building = {
        ...b,
        level: newLevel,
        upgradeCompletesAt: null,
        justLeveledAt: now,
      };
      next.history = [
        {
          id: uid("hist"),
          title:
            newLevel >= def.maxLevel
              ? `${def.name} reached MAX`
              : `${def.name} upgraded`,
          description: `${def.name} is now level ${newLevel}.`,
          createdAt: now,
        },
        ...next.history,
      ];
      if (newLevel >= def.maxLevel) {
        next.posts = [
          {
            id: uid("post"),
            citizenId: null,
            handle: "@RiversidePulse",
            authorName: "Riverside Pulse",
            text: `${def.name} looks brand new — maxed out!`,
            createdAt: now,
            likes: 50,
            comments: 6,
          },
          ...next.posts,
        ].slice(0, 40);
      }
    }
    if (b.roomBuildCompletesAt && b.roomBuildCompletesAt <= now && b.buildingRoom) {
      buildingsChanged = true;
      const room = b.buildingRoom;
      const current = (b.rooms[room] ?? 0) as RoomTier;
      const nextTier = (current < 1 ? 1 : Math.min(3, current + 1)) as RoomTier;
      building = {
        ...building,
        rooms: { ...building.rooms, [room]: nextTier },
        roomBuildCompletesAt: null,
        buildingRoom: null,
      };
    }
    return building;
  });

  if (buildingsChanged) {
    // refresh job slots for upgraded buildings
    const jobByBuilding = new Map<string, typeof next.jobs>();
    for (const j of next.jobs) {
      const list = jobByBuilding.get(j.buildingId) ?? [];
      list.push(j);
      jobByBuilding.set(j.buildingId, list);
    }
    const rebuilt = [];
    for (const b of next.buildings) {
      const def = BUILDING_DEFS[b.type];
      if (def.jobs.length === 0) continue;
      const existing = jobByBuilding.get(b.id) ?? [];
      const desired = createJobsForBuilding(b);
      // keep filled where possible
      for (let i = 0; i < desired.length; i++) {
        const prev = existing[i];
        rebuilt.push(
          prev
            ? { ...desired[i], id: prev.id, citizenId: prev.citizenId }
            : desired[i]
        );
      }
    }
    next.jobs = rebuilt;
    next = assignHomesAndJobs(next);
  }

  // income — pulse float every ~8s
  const dt = Math.max(0, Math.min(5, (now - state.tickAt) / 1000));
  if (dt > 0 && state.tickAt > 0) {
    const earned = incomePerSecond(next) * dt;
    next.money = next.money + earned;
    if (now - (state.lastIncomePulseAt || 0) > 8000 && earned > 0) {
      next.lastIncomePulseAt = now;
    }
  }

  // expire promo
  if (next.parkPromoUntil && next.parkPromoUntil <= now) {
    next.parkPromoUntil = null;
  }

  next = maybeSpawnEvent(next, now);
  next = advanceTutorial(checkGoalsAndUnlocks(next));
  next.lastActiveAt = now;
  return next;
}

export function prepareSession(state: CityState, now: number): CityState {
  const summary = computeOfflineSummary(state, now);
  let next = { ...state, tickAt: now };
  if (summary && summary.earned > 0) {
    next.pendingOffline = summary;
  }
  return next;
}
