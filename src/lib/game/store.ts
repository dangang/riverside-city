import { create } from "zustand";
import { applyCommand, prepareSession } from "./commands";
import { createInitialCity } from "./engine";
import type { CityState, GameCommand } from "./types";

const STORAGE_KEY = "riverside_city_v1";

function loadLocal(): CityState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CityState;
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
  dispatch: (cmd: GameCommand) => string | undefined;
  selectBuilding: (id: string | null) => void;
  selectCitizen: (id: string | null) => void;
  setBuildMode: (v: boolean) => void;
  setPanel: (p: GameStore["panel"]) => void;
  clearToast: () => void;
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

  setCity: (city, mode = "guest") => {
    set({ city, mode, hydrated: true });
    if (mode === "guest") saveLocal(city);
  },

  dispatch: (cmd) => {
    const { city } = get();
    if (!city) return "No city";
    const result = applyCommand(city, cmd);
    if (!result.ok) {
      set({ toast: result.error ?? "Failed" });
      return result.error;
    }
    set({
      city: result.state,
      toast: result.toast ?? null,
    });
    if (get().mode === "guest") saveLocal(result.state);
    return undefined;
  },

  selectBuilding: (id) =>
    set({ selectedBuildingId: id, selectedCitizenId: null }),
  selectCitizen: (id) =>
    set({ selectedCitizenId: id, selectedBuildingId: null }),
  setBuildMode: (v) => set({ buildMode: v }),
  setPanel: (p) => set({ panel: p }),
  clearToast: () => set({ toast: null }),
}));
