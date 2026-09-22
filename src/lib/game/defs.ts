import type { BuildingType, RoomType } from "./types";

export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
export const STARTING_MONEY = 18_000;
export const PROMOTE_PARK_COST = 2_500;
export const TAX_PER_EMPLOYED_PER_SEC = 4.5;
export const BASE_PASSIVE_PER_SEC = 1.5;

export type JobDef = { role: string; count: number; salary: number };

export type BuildingDef = {
  type: BuildingType;
  name: string;
  short: string;
  category: "housing" | "business" | "civic" | "park";
  menuGroup: "housing" | "business" | "services" | "leisure";
  maxLevel: number;
  buildCost: number;
  unlockPopulation?: number;
  capacityPerLevel: number;
  jobs: JobDef[];
  incomePerMin?: (level: number) => number;
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
    menuGroup: "housing",
    maxLevel: 3,
    buildCost: 800,
    capacityPerLevel: 3,
    jobs: [],
    statBoosts: { happiness: 3 },
    upgradeCost: (l) => 500 + l * 400,
    upgradeMs: (l) => sec(1 + l),
    benefit: (l) => `Homes for ${3 + l * 2} residents`,
    color: "#e8b86d",
    accent: "#c47a3a",
  },
  apartment: {
    type: "apartment",
    name: "Apartments",
    short: "Apt",
    category: "housing",
    menuGroup: "housing",
    maxLevel: 4,
    buildCost: 3_200,
    unlockPopulation: 25,
    capacityPerLevel: 8,
    jobs: [{ role: "Superintendent", count: 1, salary: 2800 }],
    incomePerMin: (l) => 40 + l * 25,
    statBoosts: { happiness: 4 },
    upgradeCost: (l) => 1_400 + l * 1_000,
    upgradeMs: (l) => sec(2 + l * 2),
    benefit: (l) => `Homes for ${8 + l * 4} residents`,
    color: "#7eb8da",
    accent: "#3d7ea6",
  },
  grocery: {
    type: "grocery",
    name: "Grocery Store",
    short: "Grocery",
    category: "business",
    menuGroup: "business",
    maxLevel: 4,
    buildCost: 1_600,
    capacityPerLevel: 0,
    jobs: [
      { role: "Manager", count: 1, salary: 4200 },
      { role: "Worker", count: 4, salary: 2600 },
    ],
    incomePerMin: (l) => 180 + l * 90,
    statBoosts: { happiness: 5, health: 2 },
    upgradeCost: (l) => 900 + l * 700,
    upgradeMs: (l) => sec(1.5 + l * 2),
    benefit: (l) => `+$${180 + l * 90}/min · ${5 + l} jobs`,
    color: "#6ec29a",
    accent: "#2f8a5c",
  },
  gym: {
    type: "gym",
    name: "Riverside Gym",
    short: "Gym",
    category: "business",
    menuGroup: "business",
    maxLevel: 3,
    buildCost: 2_200,
    unlockPopulation: 8,
    capacityPerLevel: 0,
    jobs: [
      { role: "Manager", count: 1, salary: 4000 },
      { role: "Trainer", count: 3, salary: 3100 },
    ],
    incomePerMin: (l) => 220 + l * 100,
    statBoosts: { health: 10, happiness: 4 },
    upgradeCost: (l) => 1_200 + l * 900,
    upgradeMs: (l) => sec(2 + l * 2),
    benefit: (l) => `Health +${10 + l * 5} · +$${220 + l * 100}/min`,
    color: "#f0a06a",
    accent: "#c45d2c",
  },
  school: {
    type: "school",
    name: "Riverside School",
    short: "School",
    category: "civic",
    menuGroup: "services",
    maxLevel: 4,
    buildCost: 2_800,
    unlockPopulation: 12,
    capacityPerLevel: 25,
    jobs: [{ role: "Teacher", count: 4, salary: 3800 }],
    incomePerMin: (l) => 60 + l * 30,
    statBoosts: { education: 14, happiness: 2 },
    upgradeCost: (l) => 1_500 + l * 1_200,
    upgradeMs: (l) => sec(3 + l * 3),
    benefit: (l) => `Education +${14 + l * 6}`,
    color: "#9bb5e8",
    accent: "#4a6bb5",
  },
  clinic: {
    type: "clinic",
    name: "Clinic",
    short: "Clinic",
    category: "civic",
    menuGroup: "services",
    maxLevel: 4,
    buildCost: 2_600,
    unlockPopulation: 20,
    capacityPerLevel: 0,
    jobs: [
      { role: "Doctor", count: 2, salary: 5500 },
      { role: "Nurse", count: 3, salary: 3400 },
    ],
    incomePerMin: (l) => 80 + l * 40,
    statBoosts: { health: 16 },
    upgradeCost: (l) => 1_400 + l * 1_100,
    upgradeMs: (l) => sec(3 + l * 3),
    benefit: (l) => `Health +${16 + l * 5}`,
    color: "#e8a0b8",
    accent: "#b04a6e",
  },
  police: {
    type: "police",
    name: "Police Station",
    short: "Police",
    category: "civic",
    menuGroup: "services",
    maxLevel: 3,
    buildCost: 2_400,
    unlockPopulation: 15,
    capacityPerLevel: 0,
    jobs: [
      { role: "Officer", count: 3, salary: 3600 },
      { role: "Sergeant", count: 1, salary: 4800 },
    ],
    incomePerMin: (l) => 40 + l * 20,
    statBoosts: { safety: 16 },
    upgradeCost: (l) => 1_300 + l * 1_000,
    upgradeMs: (l) => sec(2 + l * 3),
    benefit: (l) => `Safety +${16 + l * 8}`,
    color: "#6a8ec8",
    accent: "#2f4f8a",
  },
  fire: {
    type: "fire",
    name: "Fire Station",
    short: "Fire",
    category: "civic",
    menuGroup: "services",
    maxLevel: 3,
    buildCost: 2_200,
    unlockPopulation: 15,
    capacityPerLevel: 0,
    jobs: [
      { role: "Firefighter", count: 4, salary: 3500 },
      { role: "Chief", count: 1, salary: 5000 },
    ],
    incomePerMin: (l) => 35 + l * 20,
    statBoosts: { safety: 12 },
    upgradeCost: (l) => 1_200 + l * 900,
    upgradeMs: (l) => sec(2 + l * 3),
    benefit: (l) => `Safety +${12 + l * 6}`,
    color: "#e87868",
    accent: "#b03828",
  },
  park: {
    type: "park",
    name: "Riverside Park",
    short: "Park",
    category: "park",
    menuGroup: "leisure",
    maxLevel: 3,
    buildCost: 1_200,
    unlockPopulation: 6,
    capacityPerLevel: 0,
    jobs: [{ role: "Gardener", count: 2, salary: 2400 }],
    incomePerMin: (l) => 90 + l * 50,
    statBoosts: { happiness: 12 },
    upgradeCost: (l) => 800 + l * 700,
    upgradeMs: (l) => sec(1.5 + l * 2),
    benefit: (l) => `Happiness +${12 + l * 6}`,
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
    title: "Growing Riverside",
    description: "Get the district settled.",
    reward: 8_000,
    requirements: [
      "Population 25",
      "Build Grocery Store",
      "Build School",
    ],
    check: ({ population, buildings }) =>
      population >= 25 &&
      buildings.some((b) => b.type === "grocery") &&
      buildings.some((b) => b.type === "school"),
  },
  {
    id: "fit_city",
    title: "Fit City",
    description: "Keep people healthy and active.",
    reward: 6_000,
    requirements: ["Build Gym", "Health 70", "Gym Level 2"],
    check: ({ buildings, stats }) =>
      buildings.some((b) => b.type === "gym" && b.level >= 2) &&
      stats.health >= 70,
  },
  {
    id: "safe_streets",
    title: "Safe Streets",
    description: "Protect the district.",
    reward: 5_500,
    requirements: [
      "Police Station Level 2",
      "Fire Station Level 2",
      "Safety 65",
    ],
    check: ({ buildings, stats }) =>
      buildings.some((b) => b.type === "police" && b.level >= 2) &&
      buildings.some((b) => b.type === "fire" && b.level >= 2) &&
      stats.safety >= 65,
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
