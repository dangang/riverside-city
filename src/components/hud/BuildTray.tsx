"use client";

import { BUILDING_DEFS, RIVERSIDE_PLOTS } from "@/lib/game/defs";
import type { BuildingType, CityState, TutorialStep } from "@/lib/game/types";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TIPS: Partial<Record<TutorialStep, string>> = {
  name_city: "Name your city to begin.",
  build_house: "Build your first Starter House on a highlighted plot.",
  await_citizens: "Citizens are moving in…",
  build_grocery: "Build a Grocery Store so people can work.",
  see_job: "A citizen got a job — taxes are flowing in.",
  upgrade: "Upgrade a building to improve the district.",
  max_something: "Push something to MAX for a big payoff.",
};

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
  const types = Object.values(BUILDING_DEFS);
  const freePlots =
    RIVERSIDE_PLOTS.length -
    city.buildings.length;

  return (
    <div className="build-tray">
      {city.tutorialStep !== "done" && TIPS[city.tutorialStep] && (
        <div className="coach-line">{TIPS[city.tutorialStep]}</div>
      )}
      <div className="build-tray-header">
        <button
          type="button"
          className={cn("game-btn", buildMode && "primary")}
          onClick={onToggleBuild}
        >
          {buildMode ? "Cancel build" : "Build"}
        </button>
        <span className="muted">{freePlots} open plots</span>
      </div>
      <div className="build-list">
        {types.map((def) => {
          const unlocked = city.unlocked.includes(def.type);
          const owned =
            def.category !== "housing" &&
            city.buildings.some((b) => b.type === def.type);
          const canAfford = city.money >= def.buildCost;
          const disabled = !unlocked || owned || !canAfford;
          return (
            <button
              key={def.type}
              type="button"
              disabled={disabled && buildMode}
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
                  {!unlocked
                    ? def.unlockPopulation
                      ? `Unlock @ pop ${def.unlockPopulation}`
                      : "Locked"
                    : owned
                      ? "Built"
                      : formatMoney(def.buildCost)}
                </small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
