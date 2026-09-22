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
import { districtCompletion, incomePerSecond } from "@/lib/game/engine";
import { formatFollowers } from "@/lib/game/avatar";
import type { Building, Citizen, CityState, GameCommand, RoomType } from "@/lib/game/types";
import { formatMoney, formatDuration } from "@/lib/utils";
import { Megaphone, X } from "lucide-react";
import { CitizenAvatar } from "@/components/citizens/CitizenAvatar";
import { sfx } from "@/lib/audio/sfx";

type Dispatch = (cmd: GameCommand) => void;

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
                    onClick={() => {
                      sfx.reward();
                      onDispatch({ type: "claim_goal", goalId: g.id });
                    }}
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
    const influencer = city.citizens.find((c) => c.isInfluencer);
    const park = city.buildings.find((b) => b.type === "park");
    const campaignActive = !!(
      city.parkPromoUntil && city.parkPromoUntil > city.tickAt
    );
    return (
      <aside className="side-panel">
        <PanelHeader title="Pulse" onClose={onClose} />
        <div className="panel-scroll">
          {influencer && park && (
            <div className="influencer-card">
              <div className="influencer-head">
                <CitizenAvatar id={influencer.id} name={influencer.name} size={44} />
                <div>
                  <strong>{influencer.name}</strong>
                  <p className="muted">
                    {influencer.niche ?? "Lifestyle / Travel"} ·{" "}
                    {formatFollowers(influencer.followers)} followers
                  </p>
                  <p className="muted">
                    Reputation: {influencer.reputation ?? 80}
                  </p>
                </div>
              </div>
              <div className="campaign-box">
                <strong>City Campaign</strong>
                <p>Promote Riverside Park</p>
                <ul className="req-list">
                  <li>Visitors +20%</li>
                  <li>Park income +15%</li>
                  <li>City Attention +5</li>
                </ul>
                <p className="muted">Cost {formatMoney(PROMOTE_PARK_COST)}</p>
                <button
                  type="button"
                  className="game-btn primary full"
                  disabled={campaignActive}
                  onClick={() => {
                    sfx.click();
                    onDispatch({ type: "promote_park" });
                  }}
                >
                  <Megaphone size={16} />
                  {campaignActive ? "Campaign running…" : "Offer Campaign"}
                </button>
              </div>
            </div>
          )}
          {city.posts.map((p) => (
            <div key={p.id} className="feed-post">
              <div className="feed-head">
                {p.citizenId ? (
                  <CitizenAvatar
                    id={p.citizenId}
                    name={p.authorName || p.handle}
                    size={28}
                  />
                ) : (
                  <div className="pulse-dot" />
                )}
                <strong>{p.authorName || p.handle}</strong>
              </div>
              <p>{p.text}</p>
              <small className="muted">
                ♥ {p.likes ?? 0} · 💬 {p.comments ?? 0}
              </small>
            </div>
          ))}
          {city.posts.length === 0 && (
            <p className="muted">Citizens will react as the city grows.</p>
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
            <div key={c.id} className="citizen-row with-avatar">
              <CitizenAvatar id={c.id} name={c.name} size={36} />
              <div>
                <strong>
                  {c.name}
                  {c.isInfluencer ? " · ✦" : ""}
                </strong>
                <span>
                  {c.job ?? "Unemployed"} · {formatMoney(c.income)}/mo
                </span>
              </div>
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
            <CitizenAvatar id={citizen.id} name={citizen.name} size={64} />
            <p className="muted">Age {citizen.age}</p>
            <p>
              <strong>{citizen.job ?? "Unemployed"}</strong>
              {citizen.job && home ? "" : ""}
            </p>
            {citizen.job && (
              <p className="muted">
                at{" "}
                {city.buildings.find((b) =>
                  city.jobs.some(
                    (j) => j.citizenId === citizen.id && j.buildingId === b.id
                  )
                )
                  ? BUILDING_DEFS[
                      city.buildings.find((b) =>
                        city.jobs.some(
                          (j) =>
                            j.citizenId === citizen.id && j.buildingId === b.id
                        )
                      )!.type
                    ].name
                  : "work"}
              </p>
            )}
            <p>Income: {formatMoney(citizen.income)}/month</p>
            <p>
              Home:{" "}
              {home ? BUILDING_DEFS[home.type].name : "Looking for housing"}
            </p>
            <p>Happiness: {citizen.happiness}%</p>
            <p>Health: {citizen.health}%</p>
            {citizen.followers > 0 && (
              <p>Followers: {formatFollowers(citizen.followers)}</p>
            )}
            <p className="status-line">“{citizen.status}”</p>
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
    const residents = city.citizens.filter(
      (c) => c.homeBuildingId === building.id
    ).length;
    const incomeMin = def.incomePerMin?.(building.level) ?? 0;
    const share = Math.round(
      (incomePerSecond(city) * 60) /
        Math.max(1, city.buildings.filter((b) => BUILDING_DEFS[b.type].incomePerMin).length)
    );

    return (
      <aside className="side-panel">
        <PanelHeader title={def.name} onClose={onClose} />
        <div className="panel-scroll">
          <p className="level-line">
            Level {building.level} / {def.maxLevel}
            {maxed ? " · MAX" : ""}
          </p>
          {def.category === "housing" ? (
            <p>
              Residents {residents}/
              {def.capacityPerLevel +
                (building.level - 1) *
                  Math.max(1, Math.floor(def.capacityPerLevel / 2))}
            </p>
          ) : (
            <>
              {jobs.length > 0 && (
                <p>
                  Employees: {filled}/{jobs.length}
                </p>
              )}
              {def.statBoosts.health ? (
                <p>
                  Health contribution: +
                  {Math.round(def.statBoosts.health * (1 + (building.level - 1) * 0.35))}
                </p>
              ) : null}
              {(incomeMin > 0 || share > 0) && (
                <p>Income: +{formatMoney(incomeMin || share)}/min</p>
              )}
            </>
          )}
          <p className="muted">{def.benefit(building.level)}</p>

          {upgrading > 0 ? (
            <div className="upgrade-timer-block">
              <p className="upgrade-timer">Upgrading… {formatDuration(upgrading)}</p>
              <div className="panel-progress">
                <i
                  style={{
                    width: `${Math.max(
                      5,
                      100 -
                        (upgrading / Math.max(1, def.upgradeMs(building.level))) *
                          100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            !maxed && (
              <button
                type="button"
                className="game-btn primary full"
                onClick={() => {
                  sfx.upgradeStart();
                  onDispatch({ type: "upgrade", buildingId: building.id });
                }}
              >
                Upgrade – {formatMoney(def.upgradeCost(building.level))}
                <small>
                  {formatDuration(def.upgradeMs(building.level))}
                </small>
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
        {tier >= 3 ? " MAX" : ""}
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
