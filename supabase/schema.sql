-- ============================================================
-- 2048 Master — Telegram Mini App backend schema
-- Run this in the Supabase SQL editor (or `supabase db push`)
-- ============================================================

create table if not exists profiles (
  telegram_id  bigint primary key,
  username     text,
  first_name   text,
  coins        integer not null default 0,
  best_score   integer not null default 0,
  powerups     jsonb not null default '{"shuffle":0,"hammer":0,"double":0,"shield":0}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists scores (
  id           bigserial primary key,
  telegram_id  bigint not null references profiles(telegram_id) on delete cascade,
  score        integer not null,
  created_at   timestamptz not null default now()
);

create table if not exists transactions (
  id                          bigserial primary key,
  telegram_id                 bigint not null,
  item                        text not null,
  amount_stars                integer,
  telegram_payment_charge_id  text unique,
  status                      text not null default 'completed',
  created_at                  timestamptz not null default now()
);

create index if not exists idx_scores_telegram_id on scores(telegram_id);
create index if not exists idx_scores_created_at on scores(created_at desc);
create index if not exists idx_profiles_best_score on profiles(best_score desc);

-- ============================================================
-- Row Level Security
-- Public (anon key) can READ profiles/scores for the leaderboard.
-- Nobody can write via anon key — all writes go through Edge
-- Functions using the service role key, after validating the
-- Telegram initData signature. This is what stops someone from
-- opening devtools and setting their own coins/score.
-- ============================================================
alter table profiles enable row level security;
alter table scores enable row level security;
alter table transactions enable row level security;

create policy "profiles are publicly readable"
  on profiles for select using (true);

create policy "scores are publicly readable"
  on scores for select using (true);

-- transactions: intentionally no public policy — service role only.

-- ============================================================
-- Helper RPCs used by the telegram-webhook function to credit
-- Stars purchases atomically.
-- ============================================================
create or replace function increment_coins(p_telegram_id bigint, p_amount integer)
returns void language plpgsql as $$
begin
  update profiles
  set coins = greatest(coins + p_amount, 0),
      updated_at = now()
  where telegram_id = p_telegram_id;
end;
$$;

create or replace function increment_powerup(p_telegram_id bigint, p_item text, p_amount integer)
returns void language plpgsql as $$
begin
  update profiles
  set powerups = jsonb_set(
        powerups,
        array[p_item],
        to_jsonb(greatest(coalesce((powerups->>p_item)::int, 0) + p_amount, 0))
      ),
      updated_at = now()
  where telegram_id = p_telegram_id;
end;
$$;
