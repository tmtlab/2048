import { useEffect, useState } from 'react';
import Modal from './Modal';
import { fetchLeaderboard } from '../../game/supabaseApi';

function readLocalFallback() {
  try {
    const saved = localStorage.getItem('leaderboard2048Master');
    return saved ? JSON.parse(saved).all || [] : [];
  } catch {
    return [];
  }
}

export default function LeaderboardModal({ open, onClose, game, telegramUser }) {
  const [tab, setTab] = useState('all');
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchLeaderboard(tab, telegramUser, game.playerName).then((result) => {
      if (cancelled) return;
      if (result) {
        setRows(result);
      } else {
        setRows(readLocalFallback().slice(0, 10).map((e) => ({ name: e.name, score: e.score })));
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, tab, telegramUser, game.playerName]);

  let playerRank = -1;
  (rows || []).forEach((r, i) => {
    const isYou = telegramUser ? r.id === telegramUser.id : r.name === game.playerName;
    if (isYou) playerRank = i + 1;
  });

  return (
    <Modal open={open} onClose={onClose} title="🏆 Leaderboard">
      <div className="leaderboard-tabs">
        {['all', 'weekly', 'daily'].map((t) => (
          <button key={t} className={`leaderboard-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'all' ? 'All Time' : t === 'weekly' ? 'Weekly' : 'Daily'}
          </button>
        ))}
      </div>
      <div className="player-rank-display">
        Your Rank: <span className="highlight">{playerRank > 0 ? `#${playerRank}` : 'Not ranked yet'}</span>
      </div>
      {loading ? (
        'Loading…'
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr><th>Rank</th><th>Player</th><th>Score</th></tr>
          </thead>
          <tbody>
            {(rows || []).length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: 'center' }}>No scores yet!</td></tr>
            )}
            {(rows || []).map((entry, i) => {
              const rank = i + 1;
              const isYou = telegramUser ? entry.id === telegramUser.id : entry.name === game.playerName;
              const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
              return (
                <tr key={entry.id ?? i} className={isYou ? 'you' : ''}>
                  <td className={`rank ${rankClass}`}>{rank}</td>
                  <td className="player-name">{entry.name}{isYou ? ' (You)' : ''}</td>
                  <td className="player-score">{entry.score.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
