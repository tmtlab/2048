// POST { initData, score }
// Validates the Telegram session, records the score, and bumps
// best_score if this run beat it. Called once on game-over.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, validateInitData } from "../_shared/telegram.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });

  try {
    const { initData, score } = await req.json();
    const data = await validateInitData(initData, BOT_TOKEN);
    if (!data) {
      return new Response(JSON.stringify({ error: "invalid initData" }), {
        status: 401,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 10_000_000) {
      return new Response(JSON.stringify({ error: "invalid score" }), {
        status: 400,
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

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    await supabase.from("profiles").upsert(
      {
        telegram_id: telegramId,
        username: user.username ?? null,
        first_name: user.first_name ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "telegram_id" },
    );

    await supabase.from("scores").insert({ telegram_id: telegramId, score });

    const { data: profile } = await supabase
      .from("profiles")
      .select("best_score")
      .eq("telegram_id", telegramId)
      .single();

    let bestScore = profile?.best_score ?? 0;
    if (score > bestScore) {
      bestScore = score;
      await supabase.from("profiles").update({ best_score: score }).eq("telegram_id", telegramId);
    }

    return new Response(JSON.stringify({ ok: true, bestScore }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
