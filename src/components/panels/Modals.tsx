"use client";

import { formatDuration, formatMoney } from "@/lib/utils";
import type { CityState, GameEvent, Milestone } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/audio/sfx";

export function OfflineModal({
  city,
  onCollect,
}: {
  city: CityState;
  onCollect: () => void;
}) {
  const s = city.pendingOffline;
  if (!s) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-card celebrate">
        <h2>Welcome Back</h2>
        <p>You were away {formatDuration(s.awayMs)}</p>
        <p className="big-earn">Your city earned: +{formatMoney(s.earned)}</p>
        <p className="muted">While you were gone:</p>
        <ul>
          {s.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <button
          type="button"
          className="game-btn primary full"
          onClick={() => {
            sfx.money();
            onCollect();
          }}
        >
          Collect
        </button>
      </div>
    </div>
  );
}

export function MilestoneModal({
  milestone,
  onContinue,
}: {
  milestone: Milestone;
  onContinue: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card celebrate milestone">
        <h2>{milestone.title}</h2>
        <p>{milestone.body}</p>
        {milestone.unlocks.length > 0 && (
          <>
            <p className="muted">Unlocked:</p>
            <ul>
              {milestone.unlocks.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="game-btn primary"
            onClick={() => {
              sfx.reward();
              onContinue();
            }}
          >
            Continue
          </button>
          <button type="button" className="game-btn" onClick={onContinue}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

export function NameCityModal({
  onSubmit,
}: {
  onSubmit: (name: string) => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2>Name your city</h2>
        <p className="muted">A small district waits by the river.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = String(fd.get("name") || "").trim();
            if (name.length >= 2) {
              sfx.reward();
              onSubmit(name);
            }
          }}
        >
          <input
            name="name"
            className="game-input"
            placeholder="e.g. Riverside"
            defaultValue="Riverside"
            autoFocus
            maxLength={32}
          />
          <button type="submit" className="game-btn primary full">
            Found City
          </button>
        </form>
      </div>
    </div>
  );
}

export function EventBanner({
  event,
  onChoose,
}: {
  event: GameEvent;
  onChoose: (choiceId: string) => void;
}) {
  if (event.status !== "active") return null;
  return (
    <div className={cn("event-banner", `urgency-${event.urgency ?? "medium"}`)}>
      <div>
        <div className="event-meta">
          <span className={cn("urgency-pill", event.urgency ?? "medium")}>
            {(event.urgency ?? "medium").toUpperCase()}
          </span>
          {event.locationLabel && (
            <span className="muted">{event.locationLabel}</span>
          )}
        </div>
        <strong>{event.title}</strong>
        <p>{event.body}</p>
      </div>
      <div className="event-choices">
        {(event.choices ?? [{ id: "ok", label: "OK" }]).map((c) => (
          <button
            key={c.id}
            type="button"
            className="game-btn primary"
            title={c.hint}
            onClick={() => {
              sfx.click();
              onChoose(c.id);
            }}
          >
            {c.label}
            {c.hint && <small>{c.hint}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  return (
    <div className="toast" onAnimationEnd={onDone} role="status">
      {message}
    </div>
  );
}

export function OutcomeToast({
  text,
  onDone,
}: {
  text: string;
  onDone: () => void;
}) {
  return (
    <div className="outcome-toast" onAnimationEnd={onDone} role="status">
      {text}
    </div>
  );
}
