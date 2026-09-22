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
    when: (s) => s.buildings.some((b) => b.type === "grocery"),
    create: () => ({
      type: "robbery",
      title: "Active Incident",
      body: "Robbery reported at Grocery Store.",
      choices: [
        { id: "police_1", label: "Send 1 Police Unit" },
        { id: "police_2", label: "Send 2 Police Units" },
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
      body: "A small kitchen fire was spotted. Respond quickly.",
      choices: [
        { id: "fire_1", label: "Send Fire Crew" },
        { id: "ignore", label: "Hope it dies out" },
      ],
    }),
  },
  {
    type: "healthcare",
    weight: 2,
    when: (s) => s.citizens.length > 0,
    create: (s) => {
      const c = s.citizens[Math.floor(Math.random() * s.citizens.length)];
      return {
        type: "healthcare",
        title: "Needs Care",
        body: `${c?.name ?? "A resident"} needs healthcare attention.`,
        choices: [
          { id: "clinic", label: s.buildings.some((b) => b.type === "clinic") ? "Send to Clinic" : "Offer aid ($400)" },
        ],
        payload: { citizenId: c?.id },
      };
    },
  },
  {
    type: "school_full",
    weight: 2,
    when: (s) =>
      s.buildings.some((b) => b.type === "school") && s.population >= 30,
    create: () => ({
      type: "school_full",
      title: "School Nearing Capacity",
      body: "Parents worry the school is getting crowded.",
      choices: [{ id: "ack", label: "We'll upgrade soon" }],
    }),
  },
  {
    type: "recreation",
    weight: 2,
    when: (s) => !s.buildings.some((b) => b.type === "park") || s.stats.happiness < 60,
    create: () => ({
      type: "recreation",
      title: "Need Recreation",
      body: "Citizens complain about lack of recreation.",
      choices: [{ id: "ack", label: "Got it" }],
    }),
  },
  {
    type: "good_day",
    weight: 3,
    when: (s) => s.buildings.some((b) => BUILDING_DEFS[b.type].category === "business"),
    create: () => ({
      type: "good_day",
      title: "Successful Business Day",
      body: "Shops had a great day. Extra tax revenue incoming.",
      choices: [{ id: "collect", label: "Collect +$800" }],
    }),
  },
  {
    type: "promotion",
    weight: 2,
    when: (s) => s.citizens.some((c) => c.job),
    create: (s) => {
      const c = s.citizens.filter((x) => x.job)[
        Math.floor(Math.random() * Math.max(1, s.citizens.filter((x) => x.job).length))
      ];
      return {
        type: "promotion",
        title: "Citizen Promotion",
        body: `${c?.name ?? "A worker"} got a raise at work.`,
        choices: [{ id: "cheer", label: "Celebrate" }],
        payload: { citizenId: c?.id },
      };
    },
  },
  {
    type: "influencer_post",
    weight: 2,
    when: (s) => s.citizens.some((c) => c.isInfluencer),
    create: (s) => {
      const c = s.citizens.find((x) => x.isInfluencer)!;
      return {
        type: "influencer_post",
        title: "Influencer Post",
        body: `${c.name} is posting about the city.`,
        choices: [{ id: "view", label: "Nice" }],
        payload: { citizenId: c.id },
      };
    },
  },
];

export function maybeSpawnEvent(state: CityState, now: number): CityState {
  if (state.events.some((e) => e.status === "active")) return state;
  if (state.buildings.length < 1) return state;
  // ~ every 45–90s of play when ticking
  const rng = Math.sin(now / 1000 + state.seed) * 10000;
  const roll = rng - Math.floor(rng);
  if (roll > 0.08) return state; // chance per tick (~500ms)

  const candidates = TEMPLATES.filter((t) => t.when(state));
  if (candidates.length === 0) return state;
  const total = candidates.reduce((s, t) => s + t.weight, 0);
  let r = roll * total;
  let picked = candidates[0];
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

  const posts = [...state.posts];
  if (picked.type === "school_full") {
    posts.unshift({
      id: uid("post"),
      citizenId: null,
      handle: "@ParentChat",
      text: "Why is the school already full?",
      createdAt: now,
    });
  }
  if (picked.type === "recreation") {
    posts.unshift({
      id: uid("post"),
      citizenId: null,
      handle: "@LocalVoice",
      text: "Riverside needs another place to hang out.",
      createdAt: now,
    });
  }

  return {
    ...state,
    events: [event, ...state.events].slice(0, 30),
    posts: posts.slice(0, 40),
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

  if (event.type === "robbery") {
    const police = state.buildings.find((b) => b.type === "police");
    if (choiceId === "police_2") {
      next.money += 200;
      next.stats = {
        ...next.stats,
        safety: Math.min(100, next.stats.safety + 3),
      };
      toast = "Caught quickly — citizens feel safer";
      next.history = [
        {
          id: uid("hist"),
          title: "First crime handled",
          description: "Police resolved a grocery robbery.",
          createdAt: state.tickAt,
        },
        ...next.history,
      ];
    } else if (choiceId === "police_1") {
      if (police) {
        toast = "Incident contained";
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
        toast = "Slow response — build a Police Station";
      }
    }
  } else if (event.type === "fire") {
    if (choiceId === "fire_1") {
      const hasFire = state.buildings.some((b) => b.type === "fire");
      if (hasFire) {
        toast = "Fire crew cleared it";
      } else {
        next.money = Math.max(0, next.money - 600);
        toast = "Damage costs $600 — build a Fire Station";
      }
    } else {
      next.money = Math.max(0, next.money - 1200);
      next.stats = {
        ...next.stats,
        safety: Math.max(0, next.stats.safety - 4),
      };
      toast = "Fire spread — lost $1,200";
    }
  } else if (event.type === "healthcare") {
    if (state.buildings.some((b) => b.type === "clinic")) {
      toast = "Treated at the clinic";
      next.stats = {
        ...next.stats,
        health: Math.min(100, next.stats.health + 2),
      };
    } else {
      next.money = Math.max(0, next.money - 400);
      toast = "Paid $400 for emergency aid";
    }
  } else if (event.type === "good_day" && choiceId === "collect") {
    next.money += 800;
    toast = "+$800 from booming shops";
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
    next.posts = [
      {
        id: uid("post"),
        citizenId: cid ?? null,
        handle: "@RiversideJobs",
        text: "I finally got a promotion!",
        createdAt: state.tickAt,
      },
      ...next.posts,
    ].slice(0, 40);
    toast = "Citizen celebrated";
  } else if (event.type === "influencer_post") {
    const cid = event.payload?.citizenId as string | undefined;
    const c = next.citizens.find((x) => x.id === cid);
    if (c) {
      next.posts = [
        {
          id: uid("post"),
          citizenId: c.id,
          handle: `@${c.name.replace(/\s/g, "")}`,
          text: "Loving the little riverside energy today ✨",
          createdAt: state.tickAt,
        },
        ...next.posts,
      ].slice(0, 40);
    }
    toast = "Post went live";
  } else if (event.type === "school_full" || event.type === "recreation") {
    toast = "Noted";
  }

  next = assignHomesAndJobs(checkGoalsAndUnlocks(next));
  return { ok: true, state: next, toast };
}
