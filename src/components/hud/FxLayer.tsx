"use client";

import { useEffect } from "react";
import { useFxStore } from "@/lib/game/fxStore";
import { cn } from "@/lib/utils";

export function FxLayer() {
  const floats = useFxStore((s) => s.floats);
  const particles = useFxStore((s) => s.particles);
  const prune = useFxStore((s) => s.prune);

  useEffect(() => {
    const id = window.setInterval(prune, 200);
    return () => clearInterval(id);
  }, [prune]);

  return (
    <div className="fx-layer" aria-hidden>
      {floats.map((f) => (
        <div
          key={f.id}
          className={cn("fx-float", f.kind)}
          style={{ left: f.x, top: f.y }}
        >
          {f.text}
        </div>
      ))}
      {particles.map((p) => (
        <div
          key={p.id}
          className={cn("fx-burst", p.kind)}
          style={{ left: p.x, top: p.y }}
        >
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      ))}
    </div>
  );
}

export function SaveIndicator() {
  const status = useFxStore((s) => s.saveStatus);
  if (status === "idle") return null;
  return (
    <div className={cn("save-pill", status)}>
      {status === "saving" && "Saving…"}
      {status === "saved" && "Saved ✓"}
      {status === "error" && "Save failed"}
    </div>
  );
}

export function ArrivalToast({
  name,
  detail,
  onDone,
}: {
  name: string;
  detail?: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="arrival-toast" role="status">
      <strong>{name}</strong> {detail ?? "moved to Riverside"}
    </div>
  );
}
