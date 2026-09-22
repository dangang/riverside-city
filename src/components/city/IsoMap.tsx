"use client";

import { BUILDING_DEFS } from "@/lib/game/defs";
import type { Building, BuildingType, Citizen } from "@/lib/game/types";
import { cn } from "@/lib/utils";

const TILE_W = 88;
const TILE_H = 44;

export function isoToScreen(x: number, y: number) {
  return {
    left: (x - y) * (TILE_W / 2),
    top: (x + y) * (TILE_H / 2),
  };
}

function BuildingVisual({
  type,
  level,
  maxed,
}: {
  type: BuildingType;
  level: number;
  maxed: boolean;
}) {
  const def = BUILDING_DEFS[type];
  const h = 36 + level * 10 + (type === "apartment" ? 24 : 0);

  if (type === "park") {
    return (
      <div className="iso-building park">
        <div className="tree t1" />
        <div className="tree t2" />
        <div className="tree t3" />
        <div className="park-path" />
        {maxed && <div className="max-spark" />}
      </div>
    );
  }

  return (
    <div
      className={cn("iso-building", type, maxed && "is-max")}
      style={
        {
          "--b-color": def.color,
          "--b-accent": def.accent,
          "--b-h": `${h}px`,
        } as React.CSSProperties
      }
    >
      <div className="iso-roof" />
      <div className="iso-face left" />
      <div className="iso-face right" />
      <div className="iso-windows" />
      {level >= 2 && <div className="iso-trim" />}
      {maxed && <div className="max-spark" />}
    </div>
  );
}

type Props = {
  buildings: Building[];
  citizens: Citizen[];
  selectedBuildingId: string | null;
  selectedCitizenId: string | null;
  buildMode: boolean;
  plots: { x: number; y: number }[];
  onSelectBuilding: (id: string) => void;
  onSelectCitizen: (id: string) => void;
  onPlotClick: (x: number, y: number) => void;
};

export function IsoMap({
  buildings,
  citizens,
  selectedBuildingId,
  selectedCitizenId,
  buildMode,
  plots,
  onSelectBuilding,
  onSelectCitizen,
  onPlotClick,
}: Props) {
  const occupied = new Set(buildings.map((b) => `${b.plotX},${b.plotY}`));

  // ambient walkers near homes
  const walkers = citizens.slice(0, 8);

  return (
    <div className="iso-world">
      <div className="iso-ground-glow" />
      <div className="iso-river" />
      <div className="iso-stage">
        {plots.map((p) => {
          const pos = isoToScreen(p.x, p.y);
          const isEmpty = !occupied.has(`${p.x},${p.y}`);
          return (
            <button
              key={`plot-${p.x}-${p.y}`}
              type="button"
              className={cn(
                "iso-plot",
                buildMode && isEmpty && "plot-buildable",
                !isEmpty && "plot-filled"
              )}
              style={{
                left: pos.left,
                top: pos.top,
                zIndex: p.x + p.y,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (buildMode && isEmpty) onPlotClick(p.x, p.y);
              }}
              aria-label={`Plot ${p.x},${p.y}`}
            >
              <span className="iso-tile" />
            </button>
          );
        })}

        {buildings
          .slice()
          .sort((a, b) => a.plotX + a.plotY - (b.plotX + b.plotY))
          .map((b) => {
            const pos = isoToScreen(b.plotX, b.plotY);
            const def = BUILDING_DEFS[b.type];
            const maxed = b.level >= def.maxLevel;
            const upgrading = !!b.upgradeCompletesAt;
            return (
              <button
                key={b.id}
                type="button"
                className={cn(
                  "iso-entity",
                  selectedBuildingId === b.id && "selected"
                )}
                style={{ left: pos.left, top: pos.top, zIndex: b.plotX + b.plotY + 10 }}
                onClick={() => onSelectBuilding(b.id)}
              >
                <BuildingVisual type={b.type} level={b.level} maxed={maxed} />
                <span className="iso-label">
                  {def.short}
                  <em>
                    Lv{b.level}
                    {maxed ? " MAX" : ""}
                  </em>
                </span>
                {upgrading && <span className="iso-progress">…</span>}
              </button>
            );
          })}

        {walkers.map((c, i) => {
          const home = buildings.find((b) => b.id === c.homeBuildingId);
          const baseX = home?.plotX ?? (i % 4);
          const baseY = home?.plotY ?? Math.floor(i / 4);
          const pos = isoToScreen(baseX + 0.15, baseY + 0.25);
          return (
            <button
              key={c.id}
              type="button"
              className={cn(
                "iso-citizen",
                `walk-${i % 4}`,
                selectedCitizenId === c.id && "selected",
                c.isInfluencer && "influencer"
              )}
              style={{
                left: pos.left + (i % 3) * 12,
                top: pos.top + (i % 2) * 8,
                zIndex: 40 + i,
                animationDelay: `${i * 0.4}s`,
              }}
              onClick={() => onSelectCitizen(c.id)}
              title={c.name}
            >
              <span className="citizen-dot" />
            </button>
          );
        })}

        {/* ambient cars on road strip */}
        <div className="iso-car car-a" />
        <div className="iso-car car-b" />
      </div>
    </div>
  );
}
