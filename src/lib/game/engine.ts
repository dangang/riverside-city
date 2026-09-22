import {
  BASE_PASSIVE_PER_SEC,
  BUILDING_DEFS,
  DISTRICT_REQUIREMENTS,
  FIRST_NAMES,
  GOAL_DEFS,
  LAST_NAMES,
  OFFLINE_CAP_MS,
  STARTING_MONEY,
  TAX_PER_EMPLOYED_PER_SEC,
} from "./defs";
import type {
  Building,
  BuildingType,
  Citizen,
  CityState,
  CityStats,
  GoalProgress,
  HistoryEntry,
  JobSlot,
  OfflineSummary,
  SocialPost,
} from "./types";

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createInitialCity(
  name = "Untitled",
  seed = Date.now() % 1_000_000
): CityState {
  const now = Date.now();
  return {
    id: uid("city"),
    name,
    money: STARTING_MONEY,
    population: 0,
    stats: {
      happiness: 55,
      health: 55,
      safety: 50,
      education: 40,
      employment: 0,
    },
    attention: 10,
    buildings: [],
    citizens: [],
    jobs: [],
    events: [],
    posts: [],
    history: [
      {
        id: uid("hist"),
        title: "A new district",
        description: `Open lots wait along the river.`,
        createdAt: now,
      },
    ],
    goals: GOAL_DEFS.map(
      (g): GoalProgress => ({
        id: g.id,
        completed: false,
        claimed: false,
      })
    ),
    tutorialStep: "name_city",
    lastActiveAt: now,
    createdAt: now,
    parkPromoUntil: null,
    pendingOffline: null,
    pendingMilestone: null,
    districtCelebrated: false,
    unlocked: ["starter_house", "grocery"],
    seed,
    tickAt: now,
    lastIncomePulseAt: now,
    arrivalNote: null,
    lastEventOutcome: null,
  };
}

export function housingCapacity(buildings: Building[]): number {
  let cap = 0;
  for (const b of buildings) {
    const def = BUILDING_DEFS[b.type];
    if (def.category !== "housing") continue;
    let beds = def.capacityPerLevel + (b.level - 1) * Math.max(1, Math.floor(def.capacityPerLevel / 2));
    // rooms add a little capacity
    const roomBonus = Object.values(b.rooms).filter((t) => (t ?? 0) > 0).length;
    beds += Math.floor(roomBonus / 2);
    cap += beds;
  }
  return cap;
}

export function createJobsForBuilding(building: Building): JobSlot[] {
  const def = BUILDING_DEFS[building.type];
  const slots: JobSlot[] = [];
  for (const job of def.jobs) {
    for (let i = 0; i < job.count + Math.max(0, building.level - 1); i++) {
      if (i >= job.count && building.level < 2) continue;
      slots.push({
        id: uid("job"),
        buildingId: building.id,
        role: job.role,
        citizenId: null,
        salary: job.salary + (building.level - 1) * 150,
      });
    }
  }
  return slots;
}

export function recomputeStats(state: CityState): CityStats {
  const base: CityStats = {
    happiness: 45,
    health: 45,
    safety: 40,
    education: 35,
    employment: 0,
  };

  for (const b of state.buildings) {
    const def = BUILDING_DEFS[b.type];
    const mult = 1 + (b.level - 1) * 0.35;
    if (def.statBoosts.happiness)
      base.happiness += def.statBoosts.happiness * mult;
    if (def.statBoosts.health) base.health += def.statBoosts.health * mult;
    if (def.statBoosts.safety) base.safety += def.statBoosts.safety * mult;
    if (def.statBoosts.education)
      base.education += def.statBoosts.education * mult;
  }

  if (state.parkPromoUntil && state.parkPromoUntil > state.tickAt) {
    base.happiness += 8;
  }

  const employed = state.citizens.filter((c) => c.job).length;
  const pop = Math.max(1, state.citizens.length);
  base.employment = Math.round((employed / pop) * 100);

  // unemployment drag
  if (base.employment < 50) base.happiness -= 8;
  if (base.employment >= 80) base.happiness += 5;

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  return {
    happiness: clamp(base.happiness),
    health: clamp(base.health),
    safety: clamp(base.safety),
    education: clamp(base.education),
    employment: clamp(base.employment),
  };
}

export function incomePerSecond(state: CityState): number {
  const employed = state.citizens.filter((c) => c.job).length;
  let rate = BASE_PASSIVE_PER_SEC + employed * TAX_PER_EMPLOYED_PER_SEC;
  for (const b of state.buildings) {
    const def = BUILDING_DEFS[b.type];
    if (def.incomePerMin) {
      rate += def.incomePerMin(b.level) / 60;
    } else if (def.category === "business") {
      rate += 1.5 * b.level;
    }
  }
  if (state.parkPromoUntil && state.parkPromoUntil > state.tickAt) {
    rate *= 1.35;
  }
  return rate;
}

function pickName(rng: () => number, used: Set<string>): string {
  for (let i = 0; i < 40; i++) {
    const n = `${FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]} ${
      LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]
    }`;
    if (!used.has(n)) {
      used.add(n);
      return n;
    }
  }
  return `Citizen ${Math.floor(rng() * 9000)}`;
}

export function spawnCitizens(state: CityState, count: number): CityState {
  const rng = mulberry32(state.seed + state.citizens.length * 17 + count);
  const used = new Set(state.citizens.map((c) => c.name));
  const next = { ...state, citizens: [...state.citizens] };
  const posts: SocialPost[] = [...state.posts];
  const history: HistoryEntry[] = [...state.history];
  let arrivalName: string | null = null;

  for (let i = 0; i < count; i++) {
    const isInfluencer =
      rng() < 0.1 || (next.citizens.length >= 5 && !next.citizens.some((c) => c.isInfluencer));
    const c: Citizen = {
      id: uid("cit"),
      name: pickName(rng, used),
      age: 18 + Math.floor(rng() * 45),
      job: null,
      income: 0,
      homeBuildingId: null,
      jobSlotId: null,
      happiness: 60 + Math.floor(rng() * 25),
      health: 55 + Math.floor(rng() * 35),
      followers: isInfluencer
        ? 12_000 + Math.floor(rng() * 90_000)
        : Math.floor(rng() * 400),
      status: isInfluencer ? "Lifestyle influencer" : "Just arrived",
      isInfluencer,
      niche: isInfluencer ? "Lifestyle / Travel" : undefined,
      reputation: isInfluencer ? 70 + Math.floor(rng() * 25) : undefined,
    };
    arrivalName = c.name;
    next.citizens.push(c);
    if (isInfluencer) {
      history.push({
        id: uid("hist"),
        title: "Influencer moved in",
        description: `${c.name} arrived with ${c.followers.toLocaleString()} followers.`,
        createdAt: state.tickAt,
      });
      posts.unshift({
        id: uid("post"),
        citizenId: c.id,
        handle: `@${c.name.replace(/\s/g, "")}`,
        authorName: c.name,
        text: "Just moved to Riverside — cute little district vibes.",
        createdAt: state.tickAt,
        likes: 40 + Math.floor(rng() * 200),
        comments: 2 + Math.floor(rng() * 20),
      });
    }
  }

  next.population = next.citizens.length;
  next.posts = posts.slice(0, 40);
  next.history = history;
  next.seed = state.seed + count;
  next.arrivalNote = arrivalName
    ? {
        name: arrivalName,
        at: state.tickAt,
        detail: count > 1 ? `+${count} residents` : "moved to Riverside",
      }
    : state.arrivalNote;
  return assignHomesAndJobs(next);
}

export function assignHomesAndJobs(state: CityState): CityState {
  const next = {
    ...state,
    citizens: state.citizens.map((c) => ({ ...c })),
    jobs: state.jobs.map((j) => ({ ...j })),
  };

  // clear invalid assignments
  const buildingIds = new Set(state.buildings.map((b) => b.id));
  for (const c of next.citizens) {
    if (c.homeBuildingId && !buildingIds.has(c.homeBuildingId)) {
      c.homeBuildingId = null;
    }
  }

  // homes
  const housing = state.buildings.filter(
    (b) => BUILDING_DEFS[b.type].category === "housing"
  );
  const capacityMap = new Map<string, number>();
  for (const b of housing) {
    const def = BUILDING_DEFS[b.type];
    const beds =
      def.capacityPerLevel +
      (b.level - 1) * Math.max(1, Math.floor(def.capacityPerLevel / 2));
    capacityMap.set(b.id, beds);
  }
  const occupied = new Map<string, number>();
  for (const c of next.citizens) {
    if (c.homeBuildingId) {
      occupied.set(
        c.homeBuildingId,
        (occupied.get(c.homeBuildingId) ?? 0) + 1
      );
    }
  }
  for (const c of next.citizens) {
    if (c.homeBuildingId) continue;
    for (const b of housing) {
      const used = occupied.get(b.id) ?? 0;
      const cap = capacityMap.get(b.id) ?? 0;
      if (used < cap) {
        c.homeBuildingId = b.id;
        occupied.set(b.id, used + 1);
        break;
      }
    }
  }

  // jobs — reset slots then fill
  for (const j of next.jobs) j.citizenId = null;
  for (const c of next.citizens) {
    c.job = null;
    c.income = 0;
    c.jobSlotId = null;
  }

  const homelessLast = [...next.citizens].sort((a, b) => {
    if (!!a.homeBuildingId === !!b.homeBuildingId) return 0;
    return a.homeBuildingId ? -1 : 1;
  });

  for (const c of homelessLast) {
    const open = next.jobs.find((j) => !j.citizenId);
    if (!open) break;
    open.citizenId = c.id;
    c.job = open.role;
    c.income = open.salary;
    c.jobSlotId = open.id;
    if (c.status === "New in town") c.status = `Working as ${open.role}`;
  }

  next.population = next.citizens.length;
  next.stats = recomputeStats(next);
  return next;
}

export function districtCompletion(state: CityState): {
  percent: number;
  met: Record<string, boolean>;
} {
  const homes = state.buildings.filter(
    (b) => BUILDING_DEFS[b.type].category === "housing"
  ).length;
  const levelOf = (t: BuildingType) =>
    state.buildings.find((b) => b.type === t)?.level ?? 0;

  const met = {
    population: state.population >= DISTRICT_REQUIREMENTS.population,
    homes: homes >= DISTRICT_REQUIREMENTS.homes,
    grocery: state.buildings.some((b) => b.type === "grocery"),
    school: levelOf("school") >= DISTRICT_REQUIREMENTS.schoolLevel,
    clinic: levelOf("clinic") >= DISTRICT_REQUIREMENTS.clinicLevel,
    police: levelOf("police") >= DISTRICT_REQUIREMENTS.policeLevel,
    fire: levelOf("fire") >= DISTRICT_REQUIREMENTS.fireLevel,
    park: levelOf("park") >= DISTRICT_REQUIREMENTS.parkLevel,
  };

  const keys = Object.keys(met);
  const done = keys.filter((k) => met[k as keyof typeof met]).length;
  return { percent: Math.round((done / keys.length) * 100), met };
}

export function checkGoalsAndUnlocks(state: CityState): CityState {
  const next = { ...state, goals: state.goals.map((g) => ({ ...g })) };
  const ctx = {
    population: next.population,
    buildings: next.buildings.map((b) => ({ type: b.type, level: b.level })),
    stats: next.stats,
  };

  for (const g of next.goals) {
    if (g.completed) continue;
    const def = GOAL_DEFS.find((d) => d.id === g.id);
    if (def?.check(ctx)) {
      g.completed = true;
    }
  }

  // unlocks by progress
  const unlocked = new Set(next.unlocked);
  unlocked.add("starter_house");
  unlocked.add("grocery");
  if (next.population >= 6) unlocked.add("park");
  if (next.population >= 8) unlocked.add("gym");
  if (next.population >= 12) unlocked.add("school");
  if (next.population >= 15) {
    unlocked.add("police");
    unlocked.add("fire");
  }
  if (next.population >= 20) unlocked.add("clinic");
  if (next.population >= 25) unlocked.add("apartment");
  if (next.goals.find((g) => g.id === "growing_town")?.claimed) {
    unlocked.add("apartment");
  }
  if (next.population >= 100 && !next.pendingMilestone) {
    const already = next.history.some((h) => h.title === "A Real Town");
    if (!already) {
      next.pendingMilestone = {
        id: "real_town",
        title: "A Real Town",
        body: "Population reached 100. Riverside feels like a real place.",
        unlocks: ["Apartments", "Clinic", "New city goal"],
      };
      next.history = [
        {
          id: uid("hist"),
          title: "A Real Town",
          description: "Population reached 100.",
          createdAt: next.tickAt,
        },
        ...next.history,
      ];
    }
  }

  next.unlocked = Array.from(unlocked) as BuildingType[];

  const { percent } = districtCompletion(next);
  if (percent >= 100 && !next.districtCelebrated) {
    next.pendingMilestone = {
      id: "district_complete",
      title: "Riverside Complete",
      body: "Every requirement for Riverside is met. The district thrives.",
      unlocks: ["District ribbon", "+$15,000 celebration bonus"],
    };
  }

  return next;
}

export function computeOfflineSummary(
  state: CityState,
  now: number
): OfflineSummary {
  const elapsed = Math.min(
    OFFLINE_CAP_MS,
    Math.max(0, now - state.lastActiveAt)
  );
  if (elapsed < 30_000) return null;

  const secs = elapsed / 1000;
  const rate = incomePerSecond(state);
  const earned = Math.floor(rate * secs);

  const bullets: string[] = [];
  const openJobs = state.jobs.filter((j) => !j.citizenId).length;
  const unemployed = state.citizens.filter((c) => !c.job).length;
  const jobsFound = Math.min(openJobs, unemployed, Math.floor(secs / 120));
  if (jobsFound > 0) bullets.push(`${jobsFound} citizens found jobs`);

  const cap = housingCapacity(state.buildings);
  const room = Math.max(0, cap - state.citizens.length);
  const movedIn = Math.min(room, Math.floor(secs / 900));
  if (movedIn > 0) bullets.push(`${movedIn} new citizen(s) moved in`);

  if (state.buildings.some((b) => b.type === "gym")) {
    bullets.push("Gym memberships increased");
  }
  if (secs > 3600) bullets.push("One minor incident occurred");
  if (bullets.length === 0) bullets.push("Your city kept humming along");

  return { awayMs: elapsed, earned, bullets };
}

export function applyOfflineToState(
  state: CityState,
  summary: OfflineSummary
): CityState {
  if (!summary) return state;
  let next = { ...state, money: state.money + summary.earned };
  const movedMatch = summary.bullets.find((b) => b.includes("moved in"));
  if (movedMatch) {
    const n = parseInt(movedMatch, 10);
    if (n > 0) next = spawnCitizens(next, n);
  }
  next = assignHomesAndJobs(next);
  next.pendingOffline = null;
  next.lastActiveAt = Date.now();
  next.history = [
    {
      id: uid("hist"),
      title: "Welcome back",
      description: `Collected ${summary.earned.toLocaleString()} while away.`,
      createdAt: Date.now(),
    },
    ...next.history,
  ];
  return checkGoalsAndUnlocks(next);
}
