"use client";

import { BUILDING_DEFS } from "@/lib/game/defs";
import type { BuildingType, CityState } from "@/lib/game/types";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { sfx } from "@/lib/audio/sfx";

const TIPS: Partial<Record<CityState["tutorialStep"], string>> = {
  name_city: "Name your city to begin.",
  build_house: "Build your first Starter House on a glowing plot.",
  await_citizens: "Citizens are moving in…",
  build_grocery: "Build a Grocery Store so people can work.",
  see_job: "Someone got a job — taxes are flowing.",
  upgrade: "Upgrade a building — watch it level up.",
  max_something: "Push something to MAX for a big payoff.",
};

const GROUPS: {
  id: "housing" | "business" | "services" | "leisure";
  label: string;
}[] = [
  { id: "housing", label: "Housing" },
  { id: "business", label: "Business" },
  { id: "services", label: "Services" },
  { id: "leisure", label: "Leisure" },
];

type Props = {
  city: CityState;
  selectedType: BuildingType | null;
  onSelectType: (t: BuildingType | null) => void;
  buildMode: boolean;
  onToggleBuild: () => void;
};

export function BuildTray({
  city,
  selectedType,
  onSelectType,
  buildMode,
  onToggleBuild,
}: Props) {
  const [group, setGroup] = useState<(typeof GROUPS)[number]["id"]>("housing");
  const types = Object.values(BUILDING_DEFS).filter((d) => d.menuGroup === group);
  const freePlots = 15 - city.buildings.length;

  return (
    <div className="build-tray">
      {city.tutorialStep !== "done" && TIPS[city.tutorialStep] && (
        <div className="coach-line">{TIPS[city.tutorialStep]}</div>
      )}
      <div className="build-tray-header">
        <button
          type="button"
          className={cn("game-btn", buildMode && "primary")}
          onClick={() => {
            sfx.click();
            onToggleBuild();
          }}
        >
          {buildMode ? "Cancel" : "Build"}
        </button>
        <div className="build-tabs">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={cn("build-tab", group === g.id && "active")}
              onClick={() => {
                sfx.click();
                setGroup(g.id);
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
        <span className="muted">{freePlots} plots</span>
      </div>
      <div className="build-list">
        {types.map((def) => {
          const unlocked = city.unlocked.includes(def.type);
          const owned =
            def.category !== "housing" &&
            city.buildings.some((b) => b.type === def.type);
          const canAfford = city.money >= def.buildCost;
          const jobs = def.jobs.reduce((n, j) => n + j.count, 0);
          const hint = !unlocked
            ? def.unlockPopulation
              ? `Pop ${def.unlockPopulation}`
              : "Locked"
            : owned
              ? "Built"
              : formatMoney(def.buildCost);
          return (
            <button
              key={def.type}
              type="button"
              disabled={(!unlocked || owned) && buildMode}
              className={cn(
                "build-card",
                selectedType === def.type && buildMode && "selected",
                !unlocked && "locked",
                city.tutorialStep === "build_house" &&
                  def.type === "starter_house" &&
                  "pulse-hint",
                city.tutorialStep === "build_grocery" &&
                  def.type === "grocery" &&
                  "pulse-hint"
              )}
              onClick={() => {
                if (!unlocked || owned) return;
                sfx.click();
                onSelectType(def.type);
                if (!buildMode) onToggleBuild();
              }}
            >
              <span
                className="build-swatch"
                style={{ background: def.color, borderColor: def.accent }}
              />
              <span className="build-meta">
                <strong>{def.name}</strong>
                <small>
                  {hint}
                  {unlocked && !owned && jobs > 0 ? ` · ${jobs} jobs` : ""}
                  {unlocked && !owned && def.category === "housing"
                    ? ` · +${def.capacityPerLevel} beds`
                    : ""}
                </small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
