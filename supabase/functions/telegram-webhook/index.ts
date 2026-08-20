// Telegram bot webhook. Two jobs:
//  1. Answer pre_checkout_query (must respond within 10s or the
//     payment is auto-cancelled by Telegram).
//  2. On successful_payment, credit the purchased item to the
//     player's profile — this is the only place coins/power-ups
//     bought with Stars actually get granted, so it's authoritative.
//
// Register this URL with:
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<function-url>&secret_token=<TELEGRAM_WEBHOOK_SECRET>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }

  const update = await req.json().catch(() => null);
  if (!update) return new Response("ok");

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1) Must-answer-fast pre-checkout confirmation.
  if (update.pre_checkout_query) {
    const q = update.pre_checkout_query;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pre_checkout_query_id: q.id, ok: true }),
    });
    return new Response("ok");
  }

  // 2) Payment completed — grant the item.
  const payment = update.message?.successful_payment;
  if (payment) {
    let payload: { telegram_id: number; item: string };
    try {
      payload = JSON.parse(payment.invoice_payload);
    } catch {
      return new Response("ok"); // malformed payload, nothing to do
    }
    const { telegram_id, item } = payload;

    // Idempotency: Telegram can redeliver updates.
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("telegram_payment_charge_id", payment.telegram_payment_charge_id)
      .maybeSingle();
    if (existing) return new Response("ok");

    await supabase.from("transactions").insert({
      telegram_id,
      item,
      amount_stars: payment.total_amount,
      telegram_payment_charge_id: payment.telegram_payment_charge_id,
      status: "completed",
    });

    if (item === "coins_500") {
      await supabase.rpc("increment_coins", { p_telegram_id: telegram_id, p_amount: 500 });
    } else if (item === "coins_1500") {
      await supabase.rpc("increment_coins", { p_telegram_id: telegram_id, p_amount: 1500 });
    } else {
      await supabase.rpc("increment_powerup", { p_telegram_id: telegram_id, p_item: item, p_amount: 1 });
    }
  }

  return new Response("ok");
});
