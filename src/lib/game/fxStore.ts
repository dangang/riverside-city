import { create } from "zustand";

export type FloatFx = {
  id: string;
  text: string;
  x: number;
  y: number;
  kind: "money" | "level" | "max" | "info" | "arrive";
  born: number;
};

export type ParticleBurst = {
  id: string;
  x: number;
  y: number;
  kind: "dust" | "spark" | "max";
  born: number;
};

type FxState = {
  floats: FloatFx[];
  particles: ParticleBurst[];
  saveStatus: "idle" | "saving" | "saved" | "error";
  dayMode: "auto" | "day" | "night";
  muted: boolean;
  volume: number;
  focusBuildingId: string | null;
  constructingId: string | null;
  celebratingMaxId: string | null;
  pushFloat: (f: Omit<FloatFx, "id" | "born">) => void;
  pushParticles: (p: Omit<ParticleBurst, "id" | "born">) => void;
  prune: () => void;
  setSaveStatus: (s: FxState["saveStatus"]) => void;
  setDayMode: (m: FxState["dayMode"]) => void;
  setMuted: (v: boolean) => void;
  setVolume: (v: number) => void;
  setFocusBuilding: (id: string | null) => void;
  setConstructing: (id: string | null) => void;
  setCelebratingMax: (id: string | null) => void;
};

let n = 0;
const nid = () => `fx_${++n}_${Date.now()}`;

export const useFxStore = create<FxState>((set, get) => ({
  floats: [],
  particles: [],
  saveStatus: "idle",
  dayMode: "auto",
  muted: false,
  volume: 0.28,
  focusBuildingId: null,
  constructingId: null,
  celebratingMaxId: null,

  pushFloat: (f) =>
    set({
      floats: [...get().floats.slice(-20), { ...f, id: nid(), born: Date.now() }],
    }),
  pushParticles: (p) =>
    set({
      particles: [
        ...get().particles.slice(-12),
        { ...p, id: nid(), born: Date.now() },
      ],
    }),
  prune: () => {
    const now = Date.now();
    set({
      floats: get().floats.filter((f) => now - f.born < 1600),
      particles: get().particles.filter((p) => now - p.born < 1200),
    });
  },
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setDayMode: (dayMode) => set({ dayMode }),
  setMuted: (muted) => set({ muted }),
  setVolume: (volume) => set({ volume }),
  setFocusBuilding: (focusBuildingId) => set({ focusBuildingId }),
  setConstructing: (constructingId) => set({ constructingId }),
  setCelebratingMax: (celebratingMaxId) => set({ celebratingMaxId }),
}));

export function resolveDayPhase(mode: "auto" | "day" | "night"): "day" | "evening" | "night" {
  if (mode === "day") return "day";
  if (mode === "night") return "night";
  const h = new Date().getHours();
  if (h >= 6 && h < 17) return "day";
  if (h >= 17 && h < 20) return "evening";
  return "night";
}
