export type BuildingType =
  | "starter_house"
  | "apartment"
  | "grocery"
  | "gym"
  | "school"
  | "clinic"
  | "police"
  | "fire"
  | "park";

export type RoomType = "bedroom" | "bathroom" | "kitchen" | "living_room";
export type RoomTier = 0 | 1 | 2 | 3;

export type CityStats = {
  happiness: number;
  health: number;
  safety: number;
  education: number;
  employment: number;
};

export type JobSlot = {
  id: string;
  buildingId: string;
  role: string;
  citizenId: string | null;
  salary: number;
};

export type Building = {
  id: string;
  type: BuildingType;
  level: number;
  plotX: number;
  plotY: number;
  rooms: Partial<Record<RoomType, RoomTier>>;
  upgradeCompletesAt: number | null;
  roomBuildCompletesAt: number | null;
  buildingRoom: RoomType | null;
  justBuiltAt?: number;
  justLeveledAt?: number;
};

export type Citizen = {
  id: string;
  name: string;
  age: number;
  job: string | null;
  income: number;
  homeBuildingId: string | null;
  jobSlotId: string | null;
  happiness: number;
  health: number;
  followers: number;
  status: string;
  isInfluencer: boolean;
  niche?: string;
  reputation?: number;
};

export type GameEvent = {
  id: string;
  type: string;
  title: string;
  body: string;
  status: "active" | "resolved";
  urgency: "low" | "medium" | "high";
  locationLabel?: string;
  choices?: { id: string; label: string; hint?: string }[];
  createdAt: number;
  payload?: Record<string, unknown>;
  outcomeText?: string;
};

export type SocialPost = {
  id: string;
  citizenId: string | null;
  handle: string;
  authorName: string;
  text: string;
  createdAt: number;
  likes: number;
  comments: number;
};

export type HistoryEntry = {
  id: string;
  title: string;
  description: string;
  createdAt: number;
};

export type GoalProgress = {
  id: string;
  completed: boolean;
  claimed: boolean;
};

export type Milestone = {
  id: string;
  title: string;
  body: string;
  unlocks: string[];
};

export type OfflineSummary = {
  awayMs: number;
  earned: number;
  bullets: string[];
} | null;

export type TutorialStep =
  | "name_city"
  | "build_house"
  | "await_citizens"
  | "build_grocery"
  | "see_job"
  | "upgrade"
  | "max_something"
  | "done";

export type ArrivalNote = {
  name: string;
  at: number;
  detail?: string;
};

export type CityState = {
  id: string;
  name: string;
  money: number;
  population: number;
  stats: CityStats;
  attention: number;
  buildings: Building[];
  citizens: Citizen[];
  jobs: JobSlot[];
  events: GameEvent[];
  posts: SocialPost[];
  history: HistoryEntry[];
  goals: GoalProgress[];
  tutorialStep: TutorialStep;
  lastActiveAt: number;
  createdAt: number;
  parkPromoUntil: number | null;
  pendingOffline: OfflineSummary;
  pendingMilestone: Milestone | null;
  districtCelebrated: boolean;
  unlocked: BuildingType[];
  seed: number;
  tickAt: number;
  lastIncomePulseAt: number;
  arrivalNote: ArrivalNote | null;
  lastEventOutcome: string | null;
};

export type GameCommand =
  | { type: "name_city"; name: string }
  | { type: "build"; buildingType: BuildingType; plotX: number; plotY: number }
  | { type: "upgrade"; buildingId: string }
  | { type: "build_room"; buildingId: string; room: RoomType }
  | { type: "upgrade_room"; buildingId: string; room: RoomType }
  | { type: "resolve_event"; eventId: string; choiceId: string }
  | { type: "collect_offline" }
  | { type: "promote_park" }
  | { type: "claim_goal"; goalId: string }
  | { type: "dismiss_milestone" }
  | { type: "tick"; now: number }
  | { type: "sync_time"; now: number };

export type CommandResult = {
  ok: boolean;
  error?: string;
  state: CityState;
  toast?: string;
  fx?: {
    kind: "build" | "upgrade" | "max" | "money" | "arrive" | "reward" | "alert";
    buildingId?: string;
    amount?: number;
    plotX?: number;
    plotY?: number;
  };
};
