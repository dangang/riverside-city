"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { applyCommand, prepareSession } from "@/lib/game/commands";
import { createInitialCity } from "@/lib/game/engine";
import type { CityState, GameCommand } from "@/lib/game/types";

export type CloudResult =
  | { ok: true; state: CityState }
  | { ok: false; error: string };

async function requireUserCity(): Promise<
  | { ok: true; supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>; userId: string; rowId: string; state: CityState }
  | { ok: false; error: string }
> {
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("cities")
    .select("id, state, last_active_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No city" };

  return {
    ok: true,
    supabase,
    userId: user.id,
    rowId: data.id,
    state: data.state as CityState,
  };
}

export async function loadOrCreateCloudCity(): Promise<CloudResult> {
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("cities")
    .select("id, state")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.state) {
    const prepared = prepareSession(existing.state as CityState, Date.now());
    await supabase
      .from("cities")
      .update({ state: prepared, last_active_at: new Date().toISOString() })
      .eq("id", existing.id);
    return { ok: true, state: prepared };
  }

  const city = createInitialCity();
  city.tutorialStep = "name_city";
  const { error } = await supabase.from("cities").insert({
    user_id: user.id,
    name: city.name,
    state: city,
    last_active_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, state: city };
}

export async function runGameCommand(cmd: GameCommand): Promise<CloudResult> {
  const ctx = await requireUserCity();
  if (!ctx.ok) return ctx;

  // Always tick time server-side for economy
  const now = Date.now();
  const ticked = applyCommand(ctx.state, { type: "tick", now });
  const result = applyCommand(ticked.state, cmd);
  if (!result.ok) return { ok: false, error: result.error ?? "Failed" };

  const { error } = await ctx.supabase
    .from("cities")
    .update({
      name: result.state.name,
      state: result.state,
      last_active_at: new Date(result.state.lastActiveAt).toISOString(),
    })
    .eq("id", ctx.rowId)
    .eq("user_id", ctx.userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, state: result.state };
}
