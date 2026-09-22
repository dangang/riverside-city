"use client";

import { BUILDING_DEFS } from "@/lib/game/defs";
import type { Building, BuildingType, Citizen } from "@/lib/game/types";
import { cn } from "@/lib/utils";

const TILE_W = 92;
const TILE_H = 46;

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
  constructing,
  celebrating,
  night,
}: {
  type: BuildingType;
  level: number;
  maxed: boolean;
  constructing?: boolean;
  celebrating?: boolean;
  night?: boolean;
}) {
  const def = BUILDING_DEFS[type];
  const h = 42 + level * 12 + (type === "apartment" ? 28 : 0);

  if (type === "park") {
    return (
      <div className={cn("iso-building park", constructing && "constructing", celebrating && "celebrate-max")}>
        <div className="tree t1" />
        <div className="tree t2" />
        <div className="tree t3" />
        <div className="park-path" />
        <div className="park-bench" />
        {maxed && <div className="max-spark" />}
        {constructing && <div className="dust-cloud" />}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "iso-building",
        type,
        maxed && "is-max",
        constructing && "constructing",
        celebrating && "celebrate-max",
        night && "night-lit"
      )}
      style={
        {
          "--b-color": def.color,
          "--b-accent": def.accent,
          "--b-h": `${h}px`,
        } as React.CSSProperties
      }
    >
      <div className="iso-shadow" />
      <div className="iso-roof" />
      <div className="iso-face left" />
      <div className="iso-face right" />
      <div className="iso-door" />
      <div className="iso-windows" />
      {level >= 2 && <div className="iso-trim" />}
      {type === "grocery" && <div className="iso-sign">GROCERY</div>}
      {type === "gym" && <div className="iso-sign">GYM</div>}
      {maxed && <div className="max-badge">MAX</div>}
      {maxed && <div className="max-spark" />}
      {constructing && <div className="dust-cloud" />}
    </div>
  );
}

type Props = {
  buildings: Building[];
  citizens: Citizen[];
  selectedBuildingId: string | null;
  selectedCitizenId: string | null;
  buildMode: boolean;
  constructingId: string | null;
  celebratingMaxId: string | null;
  night: boolean;
  parkPromoActive: boolean;
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
  constructingId,
  celebratingMaxId,
  night,
  parkPromoActive,
  plots,
  onSelectBuilding,
  onSelectCitizen,
  onPlotClick,
}: Props) {
  const occupied = new Set(buildings.map((b) => `${b.plotX},${b.plotY}`));
  const walkers = citizens.slice(0, Math.min(10, Math.max(3, citizens.length)));

  return (
    <div className={cn("iso-world", night && "is-night")}>
      <div className="iso-ground-glow" />
      <div className="iso-road-ring" />
      <div className="iso-river">
        <span className="river-shine" />
      </div>
      <div className="birds">
        <i className="bird b1" />
        <i className="bird b2" />
      </div>
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
              <span className="iso-sidewalk" />
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
            const progress =
              upgrading && b.upgradeCompletesAt
                ? Math.min(
                    1,
                    1 -
                      (b.upgradeCompletesAt - Date.now()) /
                        Math.max(1, def.upgradeMs(b.level - 1) || 3000)
                  )
                : 0;
            return (
              <button
                key={b.id}
                type="button"
                className={cn(
                  "iso-entity",
                  selectedBuildingId === b.id && "selected",
                  celebratingMaxId === b.id && "focus-pop"
                )}
                style={{
                  left: pos.left,
                  top: pos.top,
                  zIndex: b.plotX + b.plotY + 10,
                }}
                onClick={() => onSelectBuilding(b.id)}
              >
                <BuildingVisual
                  type={b.type}
                  level={b.level}
                  maxed={maxed}
                  constructing={constructingId === b.id}
                  celebrating={celebratingMaxId === b.id}
                  night={night}
                />
                <span className="iso-label">
                  {def.short}
                  <em>
                    {maxed ? "MAX" : `Lv${b.level}`}
                  </em>
                </span>
                {upgrading && (
                  <span className="iso-upgrade-bar">
                    <i style={{ width: `${Math.max(8, progress * 100)}%` }} />
                  </span>
                )}
              </button>
            );
          })}

        {walkers.map((c, i) => {
          const home = buildings.find((b) => b.id === c.homeBuildingId);
          const dest =
            buildings.find((bld) =>
              c.job
                ? BUILDING_DEFS[bld.type].jobs.some((j) => j.role === c.job)
                : false
            ) ?? home;
          const baseX = (dest ?? home)?.plotX ?? (i % 4);
          const baseY = (dest ?? home)?.plotY ?? Math.floor(i / 4);
          const pos = isoToScreen(baseX + 0.2, baseY + 0.3);
          return (
            <button
              key={c.id}
              type="button"
              className={cn(
                "iso-citizen",
                `walk-${i % 4}`,
                selectedCitizenId === c.id && "selected",
                c.isInfluencer && "influencer",
                parkPromoActive && c.isInfluencer && "visiting-park"
              )}
              style={{
                left: pos.left + (i % 3) * 14,
                top: pos.top + (i % 2) * 10,
                zIndex: 40 + i,
                animationDelay: `${i * 0.35}s`,
              }}
              onClick={() => onSelectCitizen(c.id)}
              title={c.name}
            >
              <span
                className="citizen-dot"
                style={{
                  background: `linear-gradient(180deg, #f5d0b0, ${
                    ["#e07a3d", "#4a7ec8", "#2f8a5c", "#b04a6e"][i % 4]
                  })`,
                }}
              />
            </button>
          );
        })}

        <div className="iso-car car-a" />
        <div className="iso-car car-b" />
        {night && <div className="street-lamps" />}
      </div>
    </div>
  );
}
