"use client";

import { avatarFromId } from "@/lib/game/avatar";
import { cn } from "@/lib/utils";

export function CitizenAvatar({
  id,
  name,
  size = 40,
  className,
}: {
  id: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const a = avatarFromId(id, name);
  return (
    <div
      className={cn("citizen-avatar", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <circle cx="20" cy="20" r="20" fill="#efe6d8" />
        <ellipse cx="20" cy="24" rx="11" ry="12" fill={a.skin} />
        <path
          d="M8 18 Q20 4 32 18 L30 22 Q20 10 10 22 Z"
          fill={a.hair}
        />
        <rect x="12" y="30" width="16" height="12" rx="2" fill={a.shirt} />
        {a.accessory === "glasses" && (
          <g stroke="#222" strokeWidth="1.2" fill="none">
            <circle cx="15" cy="22" r="3" />
            <circle cx="25" cy="22" r="3" />
            <path d="M18 22 H22" />
          </g>
        )}
        {a.accessory === "hat" && (
          <ellipse cx="20" cy="12" rx="10" ry="4" fill="#333" />
        )}
        {a.accessory === "scarf" && (
          <path d="M12 30 Q20 34 28 30" stroke={a.shirt} strokeWidth="3" fill="none" />
        )}
      </svg>
    </div>
  );
}
