# 2048 Master — Telegram Mini App (React)

React/Vite port of the game, with Telegram WebApp integration, dual-currency
shop (in-game Coins + Telegram Stars), and Supabase persistence.

## Structure
```
src/
  game/
    constants.js      achievements, shop prices, milestones, tile colors
    telegram.js        Telegram.WebApp helpers (haptics, theme, invoices)
    supabaseApi.js      Supabase client + edge-function calls
    audio.js            Web Audio sound effects
  hooks/
    useGame2048.js       the entire game engine as a hook (board, merges,
                         power-ups, bombs, achievements, coins)
  components/
    Board.jsx, Tile.jsx, HUD.jsx (header/stats/powerups/controls)
    modals/  Help, Settings, Profile, Leaderboard, Shop
  App.jsx                wires Telegram init + Supabase hydration to the UI
supabase/                 unchanged backend: schema.sql + edge functions
```

## Run locally
```bash
npm install
cp .env.example .env      # then fill in your Supabase URL/anon key
npm run dev
```
Opening it in a plain browser (outside Telegram) works fine for UI iteration —
`src/game/telegram.js` detects the absence of `window.Telegram.WebApp` and the
app falls back to local-only mode (Stars tab disabled, no server sync).

## Deploy
1. `npm run build` → deploy the `dist/` folder anywhere with HTTPS (Vercel,
   Cloudflare Pages, GitHub Pages, your existing Pi App Studio pipeline, etc.)
2. Point your bot's Mini App URL (via @BotFather) at that URL.
3. Backend setup (Supabase schema, edge functions, bot webhook) is identical
   to the previous vanilla-JS build — see the SQL and edge functions in
   `supabase/`. In short:
   ```bash
   supabase functions deploy submit-score
   supabase functions deploy sync-coins
   supabase functions deploy create-invoice
   supabase functions deploy telegram-webhook --no-verify-jwt
   supabase secrets set TELEGRAM_BOT_TOKEN=...
   supabase secrets set TELEGRAM_WEBHOOK_SECRET=...
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<project-ref>.functions.supabase.co/telegram-webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```

## What changed from the vanilla-JS version
- Game state lives in `useGame2048` — board/obstacles/bombs/shields are refs
  (mutated in place each move, same algorithm as before) while score, coins,
  power-ups, etc. are React state so the UI re-renders correctly.
- Tile positioning no longer measures pixel widths in JS — the tile layer is
  a CSS grid overlaid on the board with matching padding/gap, so each tile is
  placed with `gridColumn`/`gridRow`. Simpler and resize-proof.
- Floating popups (coin/score/power-up-drop) and achievement toasts are React
  state arrays that self-remove via `setTimeout`, instead of direct DOM
  manipulation.
- Same trust model as before: Stars purchases are only ever granted by the
  `telegram-webhook` edge function after Telegram confirms payment; coin/
  power-up sync from gameplay trusts the client's reported totals (clamped),
  which is fine for a casual leaderboard but not tamper-proof — see the
  original backend README notes if you want to harden that later.
