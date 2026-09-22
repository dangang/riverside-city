import { GameShell } from "@/components/game/GameShell";
import { createServerSupabase } from "@/lib/supabase/server";
import { loadOrCreateCloudCity } from "@/app/actions/game";
import type { CityState } from "@/lib/game/types";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const supabase = await createServerSupabase();
  let email: string | null = null;
  let cloudState: CityState | null = null;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      email = user.email;
      const res = await loadOrCreateCloudCity();
      if (res.ok) cloudState = res.state;
    }
  }

  return (
    <GameShell
      cloudUser={email ? { email } : null}
      initialCloudState={cloudState}
    />
  );
}
