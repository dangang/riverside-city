import { create } from "zustand";
import { applyCommand, prepareSession } from "./commands";
import { createInitialCity } from "./engine";
import type { CityState, CommandResult, GameCommand } from "./types";

const STORAGE_KEY = "riverside_city_v2";
const LEGACY_KEY = "riverside_city_v1";

function migrate(raw: CityState): CityState {
  try {
    const base = createInitialCity(
      raw.name === "Untitled" ? "Untitled" : raw.name || "Untitled",
      raw.seed ?? Date.now() % 1_000_000
    );
    return {
      ...base,
      ...raw,
      name: raw.name || base.name,
      attention: raw.attention ?? 10,
      lastIncomePulseAt: raw.lastIncomePulseAt ?? raw.tickAt ?? Date.now(),
      arrivalNote: raw.arrivalNote ?? null,
      lastEventOutcome: raw.lastEventOutcome ?? null,
      buildings: raw.buildings ?? [],
      citizens: raw.citizens ?? [],
      jobs: raw.jobs ?? [],
      posts: (raw.posts ?? []).map((p) => ({
        ...p,
        authorName: p.authorName ?? p.handle?.replace("@", "") ?? "Citizen",
        likes: p.likes ?? 10,
        comments: p.comments ?? 1,
      })),
      events: (raw.events ?? []).map((e) => ({
        ...e,
        urgency: e.urgency ?? "medium",
      })),
      unlocked: raw.unlocked?.length ? raw.unlocked : base.unlocked,
      goals: raw.goals?.length ? raw.goals : base.goals,
    };
  } catch {
    return createInitialCity();
  }
}

function loadLocal(): CityState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw) as CityState);
  } catch {
    return null;
  }
}

function saveLocal(state: CityState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

type GameStore = {
  city: CityState | null;
  mode: "guest" | "cloud";
  toast: string | null;
  selectedBuildingId: string | null;
  selectedCitizenId: string | null;
  buildMode: boolean;
  panel: "none" | "goals" | "history" | "feed" | "citizens";
  hydrated: boolean;
  hydrate: () => void;
  newGuestCity: () => void;
  setCity: (city: CityState, mode?: "guest" | "cloud") => void;
  dispatch: (cmd: GameCommand) => CommandResult | null;
  selectBuilding: (id: string | null) => void;
  selectCitizen: (id: string | null) => void;
  setBuildMode: (v: boolean) => void;
  setPanel: (p: GameStore["panel"]) => void;
  clearToast: () => void;
  exportGuestCity: () => CityState | null;
};

export const useGameStore = create<GameStore>((set, get) => ({
  city: null,
  mode: "guest",
  toast: null,
  selectedBuildingId: null,
  selectedCitizenId: null,
  buildMode: false,
  panel: "none",
  hydrated: false,

  hydrate: () => {
    const now = Date.now();
    let city = loadLocal();
    if (!city) {
      city = createInitialCity();
    } else {
      city = prepareSession(city, now);
    }
    set({ city, hydrated: true, mode: "guest" });
    saveLocal(city);
  },

  newGuestCity: () => {
    const city = createInitialCity();
    set({
      city,
      mode: "guest",
      selectedBuildingId: null,
      selectedCitizenId: null,
      panel: "none",
      hydrated: true,
    });
    saveLocal(city);
  },

  setCity: (city, mode = "guest") => {
    set({ city: migrate(city), mode, hydrated: true });
    if (mode === "guest") saveLocal(migrate(city));
  },

  dispatch: (cmd) => {
    const { city } = get();
    if (!city) return null;
    const result = applyCommand(city, cmd);
    if (!result.ok) {
      set({ toast: result.error ?? "Failed" });
      return result;
    }
    set({
      city: result.state,
      toast: result.toast ?? null,
    });
    if (get().mode === "guest") saveLocal(result.state);
    return result;
  },

  selectBuilding: (id) =>
    set({ selectedBuildingId: id, selectedCitizenId: null }),
  selectCitizen: (id) =>
    set({ selectedCitizenId: id, selectedBuildingId: null }),
  setBuildMode: (v) => set({ buildMode: v }),
  setPanel: (p) => set({ panel: p }),
  clearToast: () => set({ toast: null }),
  exportGuestCity: () => get().city,
}));
