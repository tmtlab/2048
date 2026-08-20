// POST { initData, coins, powerups }
// Persists the player's current coin balance and power-up counts.
//
// NOTE ON TRUST: this endpoint accepts the client's current totals
// rather than recomputing them server-side, so it's a convenience
// sync, not a full anti-cheat system — a modified client could in
// theory report inflated numbers. It's clamped to a sane ceiling
// to limit damage. If you need tournament-grade integrity later,
// move coin/power-up awarding into submit-score (server decides
// rewards from the score delta) instead of trusting client state.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, validateInitData } from "../_shared/telegram.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_COINS = 999_999;
const MAX_POWERUPS = 999;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });

  try {
    const { initData, coins, powerups } = await req.json();
    const data = await validateInitData(initData, BOT_TOKEN);
    if (!data) {
      return new Response(JSON.stringify({ error: "invalid initData" }), {
        status: 401,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    const user = JSON.parse(data.user || "{}");
    const telegramId = user.id;
    if (!telegramId) {
      return new Response(JSON.stringify({ error: "no telegram user in initData" }), {
        status: 400,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    const clampedCoins = Math.max(0, Math.min(Math.floor(coins ?? 0), MAX_COINS));
    let clampedPowerups: Record<string, number> | undefined;
    if (powerups && typeof powerups === "object") {
      clampedPowerups = {};
      for (const key of ["shuffle", "hammer", "double", "shield"]) {
        clampedPowerups[key] = Math.max(0, Math.min(Math.floor(powerups[key] ?? 0), MAX_POWERUPS));
      }
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    await supabase.from("profiles").upsert(
      {
        telegram_id: telegramId,
        username: user.username ?? null,
        first_name: user.first_name ?? null,
        coins: clampedCoins,
        ...(clampedPowerups ? { powerups: clampedPowerups } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "telegram_id" },
    );

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
