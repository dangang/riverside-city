/** Deterministic lightweight citizen avatars */

const HAIR = ["#1a1a1a", "#3b2a1a", "#6b4423", "#c4a35a", "#8b4513", "#2c3e50"];
const SKIN = ["#f5d0b0", "#e8b890", "#c48a6a", "#8d5524", "#f1c27d", "#d4a574"];
const SHIRT = ["#e07a3d", "#4a7ec8", "#2f8a5c", "#b04a6e", "#6a5acd", "#c45d22"];
const ACC = ["none", "glasses", "hat", "scarf"] as const;

export type AvatarParts = {
  hair: string;
  skin: string;
  shirt: string;
  accessory: (typeof ACC)[number];
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function avatarFromId(id: string, name: string): AvatarParts {
  const h = hash(id + name);
  return {
    hair: HAIR[h % HAIR.length]!,
    skin: SKIN[(h >> 3) % SKIN.length]!,
    shirt: SHIRT[(h >> 6) % SHIRT.length]!,
    accessory: ACC[(h >> 9) % ACC.length]!,
  };
}

export function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
