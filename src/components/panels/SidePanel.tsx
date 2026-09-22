"use client";

import {
  BUILDING_DEFS,
  GOAL_DEFS,
  PROMOTE_PARK_COST,
  ROOM_LABELS,
  ROOM_ORDER,
  ROOM_TIER_LABELS,
  DISTRICT_REQUIREMENTS,
} from "@/lib/game/defs";
import { districtCompletion } from "@/lib/game/engine";
import type { Building, Citizen, CityState, RoomType } from "@/lib/game/types";
import { formatMoney, formatDuration, formatNumber } from "@/lib/utils";
import { Megaphone, X } from "lucide-react";

type Dispatch = (cmd: Parameters<typeof import("@/lib/game/commands").applyCommand>[1]) => void;

export function SidePanel({
  city,
  building,
  citizen,
  onClose,
  onDispatch,
  panel,
}: {
  city: CityState;
  building: Building | null;
  citizen: Citizen | null;
  onClose: () => void;
  onDispatch: Dispatch;
  panel: "none" | "goals" | "history" | "feed" | "citizens";
}) {
  if (panel === "goals") {
    const { percent, met } = districtCompletion(city);
    return (
      <aside className="side-panel">
        <PanelHeader title="City Goals" onClose={onClose} />
        <div className="panel-scroll">
          <div className="panel-block">
            <h3>Riverside · {percent}%</h3>
            <ul className="req-list">
              <li className={met.population ? "done" : ""}>
                Population {DISTRICT_REQUIREMENTS.population}
              </li>
              <li className={met.homes ? "done" : ""}>
                {DISTRICT_REQUIREMENTS.homes} homes
              </li>
              <li className={met.grocery ? "done" : ""}>Grocery Store</li>
              <li className={met.school ? "done" : ""}>School Level 3</li>
              <li className={met.clinic ? "done" : ""}>Clinic Level 2</li>
              <li className={met.police ? "done" : ""}>Police Level 2</li>
              <li className={met.fire ? "done" : ""}>Fire Level 2</li>
              <li className={met.park ? "done" : ""}>Park Level 2</li>
            </ul>
          </div>
          {GOAL_DEFS.map((g) => {
            const prog = city.goals.find((x) => x.id === g.id)!;
            return (
              <div key={g.id} className="panel-block">
                <h3>{g.title}</h3>
                <p className="muted">{g.description}</p>
                <ul className="req-list">
                  {g.requirements.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                {prog.completed && !prog.claimed && (
                  <button
                    type="button"
                    className="game-btn primary"
                    onClick={() => onDispatch({ type: "claim_goal", goalId: g.id })}
                  >
                    Claim {formatMoney(g.reward)}
                  </button>
                )}
                {prog.claimed && <span className="badge-done">Claimed</span>}
              </div>
            );
          })}
        </div>
      </aside>
    );
  }

  if (panel === "history") {
    return (
      <aside className="side-panel">
        <PanelHeader title="City History" onClose={onClose} />
        <div className="panel-scroll timeline">
          {city.history.map((h) => (
            <div key={h.id} className="timeline-item">
              <strong>{h.title}</strong>
              <p>{h.description}</p>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  if (panel === "feed") {
    return (
      <aside className="side-panel">
        <PanelHeader title="Social Feed" onClose={onClose} />
        <div className="panel-scroll">
          {city.buildings.some((b) => b.type === "park") && (
            <button
              type="button"
              className="game-btn primary full"
              onClick={() => onDispatch({ type: "promote_park" })}
            >
              <Megaphone size={16} /> Promote Riverside Park ({formatMoney(PROMOTE_PARK_COST)})
            </button>
          )}
          {city.posts.map((p) => (
            <div key={p.id} className="feed-post">
              <strong>{p.handle}</strong>
              <p>{p.text}</p>
            </div>
          ))}
          {city.posts.length === 0 && (
            <p className="muted">Citizens will post as the city grows.</p>
          )}
        </div>
      </aside>
    );
  }

  if (panel === "citizens") {
    return (
      <aside className="side-panel">
        <PanelHeader title="Citizens" onClose={onClose} />
        <div className="panel-scroll">
          {city.citizens.map((c) => (
            <div key={c.id} className="citizen-row">
              <strong>
                {c.name}
                {c.isInfluencer ? " · ✦" : ""}
              </strong>
              <span>
                {c.job ?? "Unemployed"} · {formatMoney(c.income)}/mo
              </span>
            </div>
          ))}
          {city.citizens.length === 0 && (
            <p className="muted">Build housing to attract residents.</p>
          )}
        </div>
      </aside>
    );
  }

  if (citizen) {
    const home = city.buildings.find((b) => b.id === citizen.homeBuildingId);
    return (
      <aside className="side-panel">
        <PanelHeader title={citizen.name} onClose={onClose} />
        <div className="panel-scroll">
          <div className="citizen-profile">
            <p>Age {citizen.age}</p>
            <p>Job: {citizen.job ?? "Unemployed"}</p>
            <p>Income: {formatMoney(citizen.income)}/month</p>
            <p>
              Home:{" "}
              {home
                ? BUILDING_DEFS[home.type].name
                : "Looking for housing"}
            </p>
            <p>Happiness: {citizen.happiness}</p>
            <p>Health: {citizen.health}</p>
            {citizen.followers > 0 && (
              <p>Followers: {formatNumber(citizen.followers)}</p>
            )}
            <p className="status-line">{citizen.status}</p>
          </div>
        </div>
      </aside>
    );
  }

  if (building) {
    const def = BUILDING_DEFS[building.type];
    const maxed = building.level >= def.maxLevel;
    const upgrading = building.upgradeCompletesAt
      ? Math.max(0, building.upgradeCompletesAt - city.tickAt)
      : 0;
    const jobs = city.jobs.filter((j) => j.buildingId === building.id);
    const filled = jobs.filter((j) => j.citizenId).length;

    return (
      <aside className="side-panel">
        <PanelHeader title={def.name} onClose={onClose} />
        <div className="panel-scroll">
          <p className="muted">
            Level {building.level}/{def.maxLevel}
            {maxed ? " · MAX" : ""}
          </p>
          <p>{def.benefit(building.level)}</p>
          {jobs.length > 0 && (
            <p>
              Jobs: {filled}/{jobs.length}
            </p>
          )}
          {upgrading > 0 ? (
            <p className="upgrade-timer">Upgrading… {formatDuration(upgrading)}</p>
          ) : (
            !maxed && (
              <button
                type="button"
                className="game-btn primary full"
                onClick={() =>
                  onDispatch({ type: "upgrade", buildingId: building.id })
                }
              >
                Upgrade · {formatMoney(def.upgradeCost(building.level))} ·{" "}
                {formatDuration(def.upgradeMs(building.level))}
              </button>
            )
          )}

          {def.category === "housing" && (
            <div className="rooms-block">
              <h3>Rooms</h3>
              {ROOM_ORDER.map((room) => (
                <RoomRow
                  key={room}
                  room={room}
                  building={building}
                  city={city}
                  onDispatch={onDispatch}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    );
  }

  return null;
}

function RoomRow({
  room,
  building,
  city,
  onDispatch,
}: {
  room: RoomType;
  building: Building;
  city: CityState;
  onDispatch: Dispatch;
}) {
  const tier = building.rooms[room] ?? 0;
  const busy =
    building.roomBuildCompletesAt && building.buildingRoom === room
      ? Math.max(0, building.roomBuildCompletesAt - city.tickAt)
      : 0;

  return (
    <div className="room-row">
      <span>
        {ROOM_LABELS[room]} · {ROOM_TIER_LABELS[tier]}
      </span>
      {busy > 0 ? (
        <em>{formatDuration(busy)}</em>
      ) : tier === 0 ? (
        <button
          type="button"
          className="game-btn tiny"
          onClick={() =>
            onDispatch({ type: "build_room", buildingId: building.id, room })
          }
        >
          Build
        </button>
      ) : tier < 3 ? (
        <button
          type="button"
          className="game-btn tiny"
          onClick={() =>
            onDispatch({ type: "upgrade_room", buildingId: building.id, room })
          }
        >
          Upgrade
        </button>
      ) : (
        <span className="badge-done">MAX</span>
      )}
    </div>
  );
}

function PanelHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
        <X size={18} />
      </button>
    </div>
  );
}
