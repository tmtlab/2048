// POST { initData, item }
// Creates a Telegram Stars (XTR) invoice link via the Bot API and
// returns it to the client, which opens it with Telegram.WebApp.openInvoice().

import { corsHeaders, validateInitData } from "../_shared/telegram.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

// Prices are in Stars (XTR). Adjust to taste — 1 Star ≈ $0.013 USD as of 2025.
const STAR_ITEMS: Record<string, { title: string; price: number }> = {
  shuffle: { title: "Shuffle Power-Up", price: 15 },
  hammer: { title: "Hammer Power-Up", price: 20 },
  double: { title: "2x Score Boost", price: 25 },
  shield: { title: "Shield Power-Up", price: 20 },
  coins_500: { title: "500 Coins", price: 30 },
  coins_1500: { title: "1,500 Coins", price: 75 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });

  try {
    const { initData, item } = await req.json();
    const data = await validateInitData(initData, BOT_TOKEN);
    if (!data) {
      return new Response(JSON.stringify({ error: "invalid initData" }), {
        status: 401,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    const def = STAR_ITEMS[item];
    if (!def) {
      return new Response(JSON.stringify({ error: "unknown item" }), {
        status: 400,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    const user = JSON.parse(data.user || "{}");
    const payload = JSON.stringify({ telegram_id: user.id, item, nonce: crypto.randomUUID() });

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: def.title,
        description: `Unlock ${def.title} in 2048 Master`,
        payload,
        currency: "XTR",
        prices: [{ label: def.title, amount: def.price }],
      }),
    });
    const json = await res.json();
    if (!json.ok) {
      return new Response(JSON.stringify({ error: json.description }), {
        status: 502,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: json.result }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
