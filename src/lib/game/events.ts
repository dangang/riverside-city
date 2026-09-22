import { BUILDING_DEFS } from "./defs";
import { assignHomesAndJobs, checkGoalsAndUnlocks, uid } from "./engine";
import type { CityState, CommandResult, GameEvent } from "./types";

type EventTemplate = {
  type: string;
  weight: number;
  when: (s: CityState) => boolean;
  create: (s: CityState) => Omit<GameEvent, "id" | "createdAt" | "status">;
};

const TEMPLATES: EventTemplate[] = [
  {
    type: "robbery",
    weight: 3,
    when: (s) =>
      s.buildings.some((b) => b.type === "grocery") && s.buildings.length >= 2,
    create: () => ({
      type: "robbery",
      title: "Active Incident",
      body: "Shoplifting at Riverside Grocery. Suspect still nearby.",
      urgency: "high",
      locationLabel: "Riverside Grocery",
      choices: [
        { id: "police_1", label: "Send 1 Unit", hint: "Normal response" },
        {
          id: "police_2",
          label: "Send 2 Units",
          hint: "Higher success · small cost",
        },
      ],
      payload: { target: "grocery" },
    }),
  },
  {
    type: "fire",
    weight: 2,
    when: (s) => s.buildings.length >= 3,
    create: () => ({
      type: "fire",
      title: "Minor Fire",
      body: "Kitchen fire spotted on Maple Row.",
      urgency: "high",
      locationLabel: "Residential block",
      choices: [
        { id: "fire_1", label: "Send Fire Crew", hint: "Quick response" },
        { id: "ignore", label: "Hope it dies out", hint: "Risky" },
      ],
    }),
  },
  {
    type: "healthcare",
    weight: 2,
    when: (s) => s.citizens.length > 2 && s.buildings.length >= 2,
    create: (s) => {
      const c = s.citizens[Math.floor(Math.random() * s.citizens.length)]!;
      return {
        type: "healthcare",
        title: "Needs Care",
        body: `${c.name} needs healthcare attention.`,
        urgency: "medium",
        locationLabel: s.buildings.some((b) => b.type === "clinic")
          ? "Clinic"
          : "District",
        choices: [
          {
            id: "clinic",
            label: s.buildings.some((b) => b.type === "clinic")
              ? "Send to Clinic"
              : "Offer aid ($400)",
          },
        ],
        payload: { citizenId: c.id },
      };
    },
  },
  {
    type: "school_full",
    weight: 2,
    when: (s) =>
      s.buildings.some((b) => b.type === "school") && s.population >= 18,
    create: () => ({
      type: "school_full",
      title: "School Nearing Capacity",
      body: "Parents worry classrooms are getting packed.",
      urgency: "low",
      locationLabel: "Riverside School",
      choices: [{ id: "ack", label: "We'll upgrade soon" }],
    }),
  },
  {
    type: "recreation",
    weight: 2,
    when: (s) =>
      (!s.buildings.some((b) => b.type === "park") || s.stats.happiness < 55) &&
      s.population >= 4,
    create: () => ({
      type: "recreation",
      title: "Need Recreation",
      body: "Citizens want somewhere nice to hang out.",
      urgency: "low",
      locationLabel: "District",
      choices: [{ id: "ack", label: "Got it" }],
    }),
  },
  {
    type: "good_day",
    weight: 3,
    when: (s) =>
      s.buildings.some((b) => BUILDING_DEFS[b.type].category === "business"),
    create: () => ({
      type: "good_day",
      title: "Successful Business Day",
      body: "Shops had a great afternoon. Extra tax incoming.",
      urgency: "low",
      locationLabel: "Main street",
      choices: [{ id: "collect", label: "Collect +$1,200" }],
    }),
  },
  {
    type: "promotion",
    weight: 2,
    when: (s) => s.citizens.some((c) => c.job),
    create: (s) => {
      const workers = s.citizens.filter((x) => x.job);
      const c = workers[Math.floor(Math.random() * workers.length)]!;
      return {
        type: "promotion",
        title: "Citizen Promotion",
        body: `${c.name} got a raise at work.`,
        urgency: "low",
        locationLabel: c.job ?? "Work",
        choices: [{ id: "cheer", label: "Celebrate" }],
        payload: { citizenId: c.id },
      };
    },
  },
];

export function maybeSpawnEvent(state: CityState, now: number): CityState {
  if (state.events.some((e) => e.status === "active")) return state;
  if (state.buildings.length < 2) return state;
  // Delay first event ~2–3 minutes of play
  if (now - state.createdAt < 120_000) return state;

  const ageMin = (now - state.createdAt) / 60_000;
  const chance = ageMin < 5 ? 0.035 : 0.055;
  const rng = Math.sin(now / 1000 + state.seed) * 10000;
  const roll = rng - Math.floor(rng);
  if (roll > chance) return state;

  const candidates = TEMPLATES.filter((t) => t.when(state));
  if (candidates.length === 0) return state;
  const total = candidates.reduce((s, t) => s + t.weight, 0);
  let r = roll * total;
  let picked = candidates[0]!;
  for (const t of candidates) {
    r -= t.weight;
    if (r <= 0) {
      picked = t;
      break;
    }
  }

  const draft = picked.create(state);
  const event: GameEvent = {
    ...draft,
    id: uid("evt"),
    status: "active",
    createdAt: now,
  };

  return {
    ...state,
    events: [event, ...state.events].slice(0, 30),
  };
}

export function resolveEventChoice(
  state: CityState,
  eventId: string,
  choiceId: string
): CommandResult {
  const event = state.events.find((e) => e.id === eventId);
  if (!event || event.status !== "active") {
    return { ok: false, error: "No active event", state };
  }

  let next: CityState = {
    ...state,
    events: state.events.map((e) =>
      e.id === eventId ? { ...e, status: "resolved" as const } : e
    ),
  };

  let toast = "Resolved";
  let outcome = "";

  if (event.type === "robbery") {
    const police = state.buildings.find((b) => b.type === "police");
    if (choiceId === "police_2") {
      next.money = Math.max(0, next.money - 150);
      next.money += 400;
      next.stats = {
        ...next.stats,
        safety: Math.min(100, next.stats.safety + 2),
      };
      outcome =
        "Suspect detained. Goods recovered: 91%. Safety +2 · Police XP +8";
      toast = "Caught quickly";
      next.history = [
        {
          id: uid("hist"),
          title: "Crime handled",
          description: "Two units resolved a grocery shoplifting.",
          createdAt: state.tickAt,
        },
        ...next.history,
      ];
      next.posts = [
        {
          id: uid("post"),
          citizenId: null,
          handle: "@LocalVoice",
          authorName: "Local Voice",
          text: "Police got here insanely fast.",
          createdAt: state.tickAt,
          likes: 60,
          comments: 8,
        },
        ...next.posts,
      ].slice(0, 40);
    } else if (choiceId === "police_1") {
      if (police) {
        outcome = "Incident contained. Goods recovered: 74%. Safety +1";
        toast = "Contained";
        next.stats = {
          ...next.stats,
          safety: Math.min(100, next.stats.safety + 1),
        };
        next.history = [
          {
            id: uid("hist"),
            title: "Crime handled",
            description: "One unit handled the grocery call.",
            createdAt: state.tickAt,
          },
          ...next.history,
        ];
      } else {
        next.stats = {
          ...next.stats,
          safety: Math.max(0, next.stats.safety - 5),
          happiness: Math.max(0, next.stats.happiness - 3),
        };
        outcome = "Slow response — build a Police Station soon.";
        toast = "Need a station";
      }
    }
  } else if (event.type === "fire") {
    if (choiceId === "fire_1") {
      const hasFire = state.buildings.some((b) => b.type === "fire");
      if (hasFire) {
        outcome = "Fire crew cleared it. No injuries.";
        toast = "Cleared";
        next.posts = [
          {
            id: uid("post"),
            citizenId: null,
            handle: "@NeighborWatch",
            authorName: "Neighbor Watch",
            text: "Fire department got here insanely fast.",
            createdAt: state.tickAt,
            likes: 90,
            comments: 11,
          },
          ...next.posts,
        ].slice(0, 40);
      } else {
        next.money = Math.max(0, next.money - 500);
        outcome = "Damage costs $500 — build a Fire Station.";
        toast = "Damage paid";
      }
    } else {
      next.money = Math.max(0, next.money - 1200);
      next.stats = {
        ...next.stats,
        safety: Math.max(0, next.stats.safety - 4),
      };
      outcome = "Fire spread — lost $1,200.";
      toast = "Costly";
    }
  } else if (event.type === "healthcare") {
    if (state.buildings.some((b) => b.type === "clinic")) {
      outcome = "Treated at the clinic. Health +2";
      toast = "Treated";
      next.stats = {
        ...next.stats,
        health: Math.min(100, next.stats.health + 2),
      };
    } else {
      next.money = Math.max(0, next.money - 400);
      outcome = "Paid $400 for emergency aid.";
      toast = "Aid sent";
    }
  } else if (event.type === "good_day" && choiceId === "collect") {
    next.money += 1200;
    outcome = "Extra tax day: +$1,200";
    toast = "+$1,200";
  } else if (event.type === "promotion") {
    const cid = event.payload?.citizenId as string | undefined;
    next.citizens = next.citizens.map((c) =>
      c.id === cid
        ? {
            ...c,
            income: c.income + 400,
            status: "Recently promoted",
            happiness: Math.min(100, c.happiness + 5),
          }
        : c
    );
    outcome = "Citizen celebrated a promotion.";
    toast = "Promoted!";
  } else {
    outcome = "Noted.";
    toast = "Noted";
  }

  next.lastEventOutcome = outcome;
  next.events = next.events.map((e) =>
    e.id === eventId ? { ...e, outcomeText: outcome } : e
  );
  next = assignHomesAndJobs(checkGoalsAndUnlocks(next));
  return {
    ok: true,
    state: next,
    toast,
    fx: { kind: "reward" },
  };
}
