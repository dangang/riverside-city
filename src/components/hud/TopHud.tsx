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
import { districtCompletion } from "@/lib/game/engine";
import type { CityState } from "@/lib/game/types";
import { formatMoney, formatNumber } from "@/lib/utils";

export function TopHud({ city }: { city: CityState }) {
  const { percent } = districtCompletion(city);
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
        <span className="hud-city-name">{city.name}</span>
        <span className="hud-district">Riverside · {percent}% complete</span>
      </div>
      <div className="hud-resources">
        <div className="hud-pill money">
          <Coins size={16} />
          <strong>{formatMoney(city.money)}</strong>
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
