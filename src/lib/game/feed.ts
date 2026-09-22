import { BUILDING_DEFS } from "./defs";
import { uid } from "./engine";
import type { CityState, SocialPost } from "./types";

function post(
  state: CityState,
  text: string,
  citizenId: string | null = null,
  authorName = "Riverside Pulse"
): SocialPost {
  const handle =
    authorName === "Riverside Pulse"
      ? "@RiversidePulse"
      : `@${authorName.replace(/\s/g, "")}`;
  return {
    id: uid("post"),
    citizenId,
    handle,
    authorName,
    text,
    createdAt: state.tickAt,
    likes: 5 + Math.floor(Math.random() * 80),
    comments: Math.floor(Math.random() * 12),
  };
}

/** State-driven social posts — call after meaningful changes */
export function maybeReactToState(
  prev: CityState,
  next: CityState
): CityState {
  const posts = [...next.posts];
  const add = (p: SocialPost) => {
    if (posts.some((x) => x.text === p.text && next.tickAt - x.createdAt < 60_000))
      return;
    posts.unshift(p);
  };

  const had = (t: keyof typeof BUILDING_DEFS) =>
    prev.buildings.some((b) => b.type === t);
  const has = (t: keyof typeof BUILDING_DEFS) =>
    next.buildings.some((b) => b.type === t);

  if (!had("gym") && has("gym")) {
    add(post(next, "Finally a decent gym in Riverside."));
  }
  if (!had("grocery") && has("grocery")) {
    add(post(next, "Grocery store! No more long trips out of town."));
  }
  if (!had("park") && has("park")) {
    add(post(next, "Riverside Park is such a nice place to spend the afternoon."));
  }
  if (!had("school") && has("school")) {
    add(post(next, "School bells are ringing — this place feels real."));
  }
  if (!had("clinic") && has("clinic")) {
    add(post(next, "Clinic opened. About time."));
  }

  const park = next.buildings.find((b) => b.type === "park");
  const prevPark = prev.buildings.find((b) => b.type === "park");
  if (
    park &&
    prevPark &&
    park.level >= BUILDING_DEFS.park.maxLevel &&
    prevPark.level < BUILDING_DEFS.park.maxLevel
  ) {
    add(post(next, "Riverside Park looks amazing now."));
  }

  if (next.stats.employment < 40 && next.citizens.length >= 6) {
    if (Math.random() < 0.15) add(post(next, "Anyone hiring around here?"));
  }
  if (
    next.buildings.some((b) => b.type === "school") &&
    next.population >= 20 &&
    Math.random() < 0.1
  ) {
    add(post(next, "Classrooms are getting PACKED lately."));
  }
  if (
    next.buildings.some((b) => b.type === "clinic") &&
    next.stats.health < 55 &&
    Math.random() < 0.1
  ) {
    add(post(next, "Been waiting forever at the clinic."));
  }

  const newlyEmployed = next.citizens.filter(
    (c) => c.job && !prev.citizens.find((p) => p.id === c.id)?.job
  );
  for (const c of newlyEmployed.slice(0, 1)) {
    add(post(next, "I finally got a job!", c.id, c.name));
  }

  return { ...next, posts: posts.slice(0, 40) };
}
