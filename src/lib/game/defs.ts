import type { BuildingType, RoomType } from "./types";

export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
export const STARTING_MONEY = 25_000;
export const PROMOTE_PARK_COST = 3_000;
export const TAX_PER_EMPLOYED_PER_SEC = 2.2;
export const BASE_PASSIVE_PER_SEC = 0.8;

export type JobDef = { role: string; count: number; salary: number };

export type BuildingDef = {
  type: BuildingType;
  name: string;
  short: string;
  category: "housing" | "business" | "civic" | "park";
  maxLevel: number;
  buildCost: number;
  unlockPopulation?: number;
  capacityPerLevel: number; // housing beds / park visitors flavor
  jobs: JobDef[];
  statBoosts: Partial<{
    happiness: number;
    health: number;
    safety: number;
    education: number;
  }>;
  upgradeCost: (level: number) => number;
  upgradeMs: (level: number) => number;
  benefit: (level: number) => string;
  color: string;
  accent: string;
};

const sec = (n: number) => n * 1000;

export const BUILDING_DEFS: Record<BuildingType, BuildingDef> = {
  starter_house: {
    type: "starter_house",
    name: "Starter House",
    short: "House",
    category: "housing",
    maxLevel: 3,
    buildCost: 1_200,
    capacityPerLevel: 2,
    jobs: [],
    statBoosts: { happiness: 2 },
    upgradeCost: (l) => 800 + l * 600,
    upgradeMs: (l) => sec(1 + l * 2),
    benefit: (l) => `Homes for ${2 + l} residents`,
    color: "#e8b86d",
    accent: "#c47a3a",
  },
  apartment: {
    type: "apartment",
    name: "Apartments",
    short: "Apt",
    category: "housing",
    maxLevel: 4,
    buildCost: 4_500,
    unlockPopulation: 40,
    capacityPerLevel: 6,
    jobs: [{ role: "Superintendent", count: 1, salary: 2800 }],
    statBoosts: { happiness: 3 },
    upgradeCost: (l) => 2_000 + l * 1_500,
    upgradeMs: (l) => sec(3 + l * 3),
    benefit: (l) => `Homes for ${6 + l * 4} residents`,
    color: "#7eb8da",
    accent: "#3d7ea6",
  },
  grocery: {
    type: "grocery",
    name: "Grocery Store",
    short: "Grocery",
    category: "business",
    maxLevel: 4,
    buildCost: 2_800,
    capacityPerLevel: 0,
    jobs: [
      { role: "Manager", count: 1, salary: 4200 },
      { role: "Worker", count: 4, salary: 2600 },
    ],
    statBoosts: { happiness: 4, health: 2 },
    upgradeCost: (l) => 1_500 + l * 1_200,
    upgradeMs: (l) => sec(2 + l * 3),
    benefit: (l) => `+${5 + l * 3} happiness · ${5 + l} jobs`,
    color: "#6ec29a",
    accent: "#2f8a5c",
  },
  gym: {
    type: "gym",
    name: "Riverside Gym",
    short: "Gym",
    category: "business",
    maxLevel: 4,
    buildCost: 3_200,
    capacityPerLevel: 0,
    jobs: [
      { role: "Manager", count: 1, salary: 4000 },
      { role: "Trainer", count: 3, salary: 3100 },
    ],
    statBoosts: { health: 8, happiness: 3 },
    upgradeCost: (l) => 1_800 + l * 1_400,
    upgradeMs: (l) => sec(3 + l * 3),
    benefit: (l) => `+${8 + l * 4} health · fitness jobs`,
    color: "#f0a06a",
    accent: "#c45d2c",
  },
  school: {
    type: "school",
    name: "Riverside School",
    short: "School",
    category: "civic",
    maxLevel: 4,
    buildCost: 5_000,
    capacityPerLevel: 20,
    jobs: [{ role: "Teacher", count: 4, salary: 3800 }],
    statBoosts: { education: 12, happiness: 2 },
    upgradeCost: (l) => 2_500 + l * 2_000,
    upgradeMs: (l) => sec(4 + l * 4),
    benefit: (l) => `Education +${12 + l * 6} · capacity ${20 + l * 15}`,
    color: "#9bb5e8",
    accent: "#4a6bb5",
  },
  clinic: {
    type: "clinic",
    name: "Clinic",
    short: "Clinic",
    category: "civic",
    maxLevel: 4,
    buildCost: 4_800,
    unlockPopulation: 50,
    capacityPerLevel: 0,
    jobs: [
      { role: "Doctor", count: 2, salary: 5500 },
      { role: "Nurse", count: 3, salary: 3400 },
    ],
    statBoosts: { health: 14 },
    upgradeCost: (l) => 2_400 + l * 1_800,
    upgradeMs: (l) => sec(4 + l * 4),
    benefit: (l) => `Health +${14 + l * 5}`,
    color: "#e8a0b8",
    accent: "#b04a6e",
  },
  police: {
    type: "police",
    name: "Police Station",
    short: "Police",
    category: "civic",
    maxLevel: 3,
    buildCost: 4_200,
    capacityPerLevel: 0,
    jobs: [
      { role: "Officer", count: 3, salary: 3600 },
      { role: "Sergeant", count: 1, salary: 4800 },
    ],
    statBoosts: { safety: 15 },
    upgradeCost: (l) => 2_200 + l * 1_600,
    upgradeMs: (l) => sec(3 + l * 4),
    benefit: (l) => `Safety +${15 + l * 8} · ${4 + l} units`,
    color: "#6a8ec8",
    accent: "#2f4f8a",
  },
  fire: {
    type: "fire",
    name: "Fire Station",
    short: "Fire",
    category: "civic",
    maxLevel: 3,
    buildCost: 4_000,
    capacityPerLevel: 0,
    jobs: [
      { role: "Firefighter", count: 4, salary: 3500 },
      { role: "Chief", count: 1, salary: 5000 },
    ],
    statBoosts: { safety: 10 },
    upgradeCost: (l) => 2_000 + l * 1_500,
    upgradeMs: (l) => sec(3 + l * 4),
    benefit: (l) => `Safety +${10 + l * 6}`,
    color: "#e87868",
    accent: "#b03828",
  },
  park: {
    type: "park",
    name: "Riverside Park",
    short: "Park",
    category: "park",
    maxLevel: 3,
    buildCost: 2_000,
    capacityPerLevel: 0,
    jobs: [{ role: "Gardener", count: 2, salary: 2400 }],
    statBoosts: { happiness: 10 },
    upgradeCost: (l) => 1_200 + l * 1_000,
    upgradeMs: (l) => sec(2 + l * 3),
    benefit: (l) => `Happiness +${10 + l * 6}`,
    color: "#7ecf7a",
    accent: "#3a8f3a",
  },
};

export const ROOM_ORDER: RoomType[] = [
  "bedroom",
  "bathroom",
  "kitchen",
  "living_room",
];

export const ROOM_LABELS: Record<RoomType, string> = {
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  kitchen: "Kitchen",
  living_room: "Living Room",
};

export const ROOM_TIER_LABELS = ["—", "Basic", "Improved", "Modern"] as const;

export const ROOM_BUILD_COST = 400;
export const ROOM_UPGRADE_COST = [0, 350, 550, 0];
export const ROOM_BUILD_MS = 1500;
export const ROOM_UPGRADE_MS = [0, 1200, 2000, 0];

export type GoalDef = {
  id: string;
  title: string;
  description: string;
  reward: number;
  check: (ctx: {
    population: number;
    buildings: { type: BuildingType; level: number }[];
    stats: {
      health: number;
      happiness: number;
      education: number;
      safety: number;
      employment: number;
    };
  }) => boolean;
  requirements: string[];
};

export const GOAL_DEFS: GoalDef[] = [
  {
    id: "growing_town",
    title: "Growing Town",
    description: "Get Riverside settled.",
    reward: 5_000,
    requirements: [
      "Reach population 50",
      "Build Grocery Store",
      "Build School",
    ],
    check: ({ population, buildings }) =>
      population >= 50 &&
      buildings.some((b) => b.type === "grocery") &&
      buildings.some((b) => b.type === "school"),
  },
  {
    id: "healthy_citizens",
    title: "Healthy Citizens",
    description: "Keep people well.",
    reward: 6_000,
    requirements: ["Build Clinic", "Build Gym", "Reach Health 75"],
    check: ({ buildings, stats }) =>
      buildings.some((b) => b.type === "clinic") &&
      buildings.some((b) => b.type === "gym") &&
      stats.health >= 75,
  },
  {
    id: "safe_streets",
    title: "Safe Streets",
    description: "Protect the district.",
    reward: 5_500,
    requirements: [
      "Police Station Level 2",
      "Fire Station Level 2",
      "Safety 70",
    ],
    check: ({ buildings, stats }) =>
      buildings.some((b) => b.type === "police" && b.level >= 2) &&
      buildings.some((b) => b.type === "fire" && b.level >= 2) &&
      stats.safety >= 70,
  },
];

export const DISTRICT_REQUIREMENTS = {
  population: 100,
  homes: 6,
  grocery: true,
  schoolLevel: 3,
  clinicLevel: 2,
  policeLevel: 2,
  fireLevel: 2,
  parkLevel: 2,
};

export const FIRST_NAMES = [
  "Maya",
  "Lena",
  "Jordan",
  "Sam",
  "Aria",
  "Noah",
  "Kai",
  "Elena",
  "Marcus",
  "Sofia",
  "Riley",
  "Chen",
  "Omar",
  "Priya",
  "Leo",
  "Nina",
  "Theo",
  "Ivy",
  "Hugo",
  "Zoe",
];

export const LAST_NAMES = [
  "Chen",
  "Kai",
  "Rivera",
  "Park",
  "Nguyen",
  "Brooks",
  "Okada",
  "Sullivan",
  "Hassan",
  "Moreau",
  "Kim",
  "Walsh",
  "Diaz",
  "Singh",
  "Adler",
];

/** Fixed plot map for Riverside — visual layout positions */
export const RIVERSIDE_PLOTS: { x: number; y: number; label?: string }[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 3, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 3, y: 1 },
  { x: 0, y: 2 },
  { x: 1, y: 2 },
  { x: 2, y: 2 },
  { x: 3, y: 2 },
  { x: 4, y: 0 },
  { x: 4, y: 1 },
  { x: 4, y: 2 },
];
