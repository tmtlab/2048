import { useState } from 'react';
import Modal from './Modal';
import { ACHIEVEMENTS } from '../../game/constants';

export default function ProfileModal({ open, onClose, game, telegramUser }) {
  const [tab, setTab] = useState('stats');
  const unlockedCount = Object.values(game.achievements).filter(Boolean).length;
  const total = Object.keys(ACHIEVEMENTS).length;
  const progress = total ? Math.floor((unlockedCount / total) * 100) : 0;

  return (
    <Modal open={open} onClose={onClose} title="Player Profile">
      <div className="profile-header">
        <div className="profile-avatar">
          {telegramUser?.photo_url ? <img src={telegramUser.photo_url} alt="" /> : game.playerName.charAt(0).toUpperCase()}
        </div>
        <div className="profile-name">{game.playerName}</div>
      </div>
      <div className="profile-stats">
        <div className="profile-stat"><div className="p-label">Best Score</div><div className="p-value">{game.bestScore}</div></div>
        <div className="profile-stat"><div className="p-label">Games</div><div className="p-value">{game.gamesPlayed}</div></div>
        <div className="profile-stat"><div className="p-label">Coins</div><div className="p-value">{game.coins}</div></div>
      </div>
      <div className="profile-tabs">
        <button className={`profile-tab${tab === 'stats' ? ' active' : ''}`} onClick={() => setTab('stats')}>Stats</button>
        <button className={`profile-tab${tab === 'achievements' ? ' active' : ''}`} onClick={() => setTab('achievements')}>Achievements</button>
      </div>

      {tab === 'stats' ? (
        <>
          <div className="profile-progress">
            <div className="pp-label">Achievements: {unlockedCount}/{total} ({progress}%)</div>
            <div className="pp-bar"><div className="pp-fill" style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="profile-stats">
            <div className="profile-stat"><div className="p-label">Best Tile</div><div className="p-value">{game.bestTileEver}</div></div>
            <div className="profile-stat"><div className="p-label">Merges</div><div className="p-value">{game.totalMerges}</div></div>
          </div>
        </>
      ) : (
        <div className="achievements-grid">
          {Object.entries(ACHIEVEMENTS).map(([key, ach]) => {
            const unlocked = !!game.achievements[key];
            return (
              <div key={key} className={`achievement-card${unlocked ? ' unlocked' : ' locked'}`}>
                <div className="ach-icon">{unlocked ? ach.icon : '🔒'}</div>
                <div className="ach-name">{ach.name}</div>
                <div className="ach-desc">{ach.desc}</div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
