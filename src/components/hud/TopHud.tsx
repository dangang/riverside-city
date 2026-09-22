"use client";

import {
  GraduationCap,
  Heart,
  Briefcase,
  Shield,
  Smile,
  Users,
  Coins,
} from "lucide-react";
import { districtCompletion, incomePerSecond } from "@/lib/game/engine";
import type { CityState } from "@/lib/game/types";
import { formatMoney, formatNumber } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

function AnimatedMoney({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (Math.abs(to - from) < 1) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const dur = 350;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setDisplay(from + (to - from) * p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <strong>{formatMoney(display)}</strong>;
}

export function TopHud({ city }: { city: CityState }) {
  const { percent } = districtCompletion(city);
  const perMin = Math.round(incomePerSecond(city) * 60);
  const stats = [
    { icon: Smile, label: "Happy", value: city.stats.happiness },
    { icon: Heart, label: "Health", value: city.stats.health },
    { icon: Shield, label: "Safety", value: city.stats.safety },
    { icon: GraduationCap, label: "Edu", value: city.stats.education },
    { icon: Briefcase, label: "Jobs", value: city.stats.employment },
  ];

  return (
    <header className="top-hud">
      <div className="hud-brand">
        <span className="hud-city-name">
          {city.name === "Untitled" ? "Your City" : city.name}
        </span>
        <span className="hud-district">Riverside · {percent}% complete</span>
      </div>
      <div className="hud-resources">
        <div className="hud-pill money" title={`~${formatMoney(perMin)}/min`}>
          <Coins size={16} />
          <AnimatedMoney value={city.money} />
        </div>
        <div className="hud-pill">
          <Users size={16} />
          <strong>{formatNumber(city.population)}</strong>
        </div>
      </div>
      <div className="hud-stats">
        {stats.map((s) => (
          <div key={s.label} className="stat-chip" title={s.label}>
            <s.icon size={14} />
            <span>{s.value}</span>
          </div>
        ))}
      </div>
      <div className="district-meter" aria-label="District completion">
        <div className="district-meter-fill" style={{ width: `${percent}%` }} />
      </div>
    </header>
  );
}
