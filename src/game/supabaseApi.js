import { createClient } from '@supabase/supabase-js';
import { getInitData, IN_TELEGRAM } from './telegram';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const CONFIGURED = SUPABASE_URL.includes('supabase.co') && !!SUPABASE_ANON_KEY;
const FUNCTIONS_BASE = CONFIGURED ? `${SUPABASE_URL}/functions/v1` : '';

export const supabaseClient = CONFIGURED ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
export const BACKEND_CONFIGURED = CONFIGURED;

async function callFunction(name, body) {
  if (!IN_TELEGRAM || !CONFIGURED) return null;
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ initData: getInitData(), ...body }),
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } catch (e) {
    console.warn(`callFunction(${name}) failed`, e);
    return null;
  }
}

export async function loadProfileFromServer(telegramId) {
  if (!supabaseClient || !telegramId) return null;
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('coins, best_score, powerups')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export function syncCoinsToServer(coins, powerups) {
  return callFunction('sync-coins', { coins, powerups });
}

export async function submitScoreToServer(score) {
  return callFunction('submit-score', { score });
}

export async function createStarsInvoice(item) {
  return callFunction('create-invoice', { item });
}

export async function fetchLeaderboard(tab, telegramUser, playerName) {
  if (!supabaseClient) return null;
  try {
    if (tab === 'all') {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('telegram_id, username, first_name, best_score')
        .order('best_score', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data.map((r) => ({ id: r.telegram_id, name: r.username || r.first_name || 'Player', score: r.best_score }));
    }
    const since = new Date();
    since.setDate(since.getDate() - (tab === 'weekly' ? 7 : 1));
    const { data, error } = await supabaseClient
      .from('scores')
      .select('telegram_id, score, created_at')
      .gte('created_at', since.toISOString())
      .order('score', { ascending: false })
      .limit(200);
    if (error) throw error;
    const bestPerUser = new Map();
    for (const row of data) {
      if (!bestPerUser.has(row.telegram_id) || bestPerUser.get(row.telegram_id) < row.score) {
        bestPerUser.set(row.telegram_id, row.score);
      }
    }
    const ids = [...bestPerUser.keys()];
    let names = {};
    if (ids.length) {
      const { data: profs } = await supabaseClient.from('profiles').select('telegram_id, username, first_name').in('telegram_id', ids);
      (profs || []).forEach((p) => {
        names[p.telegram_id] = p.username || p.first_name || 'Player';
      });
    }
    return [...bestPerUser.entries()]
      .map(([id, score]) => ({ id, name: names[id] || 'Player', score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch (e) {
    console.warn('leaderboard fetch failed', e);
    return null;
  }
}
