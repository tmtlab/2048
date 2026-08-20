import { POWERUP_ICONS, POWERUP_NAMES } from '../game/constants';

export function Header({ telegramUser, playerName, onOpenSettings, onOpenProfile, onOpenShop, onOpenLeaderboard, onOpenHelp }) {
  const initial = playerName?.charAt(0)?.toUpperCase() || '?';
  return (
    <div className="header-top">
      <div className="header-left">
        <button className="hamburger-menu" onClick={onOpenSettings} aria-label="Settings">
          <span></span><span></span><span></span>
        </button>
        <div className="logo-container">
          <h1>2048</h1>
          <div className="subtitle">MASTER EDITION</div>
        </div>
      </div>
      <div className="header-right">
        <a href="#" className="profile-btn" onClick={(e) => { e.preventDefault(); onOpenProfile(); }} title="Profile">
          {telegramUser?.photo_url ? <img src={telegramUser.photo_url} alt="" /> : initial}
        </a>
        <a href="#" className="shop-btn" onClick={(e) => { e.preventDefault(); onOpenShop(); }} title="Shop">🛒</a>
        <a href="#" className="leaderboard-btn" onClick={(e) => { e.preventDefault(); onOpenLeaderboard(); }} title="Leaderboard">🏆</a>
        <a href="#" className="help-btn" onClick={(e) => { e.preventDefault(); onOpenHelp(); }}>Help</a>
      </div>
    </div>
  );
}

export function StatsBar({ score, bestScore, coins, doubleScoreActive }) {
  return (
    <div className="stats-container">
      <div className="stat-box">
        <div className="label">Score</div>
        <div className="value" style={{ color: doubleScoreActive ? '#ffd700' : 'white' }}>{score}</div>
      </div>
      <div className="stat-box">
        <div className="label">Best</div>
        <div className="value">{bestScore}</div>
      </div>
      <div className="stat-box">
        <div className="label">Coins</div>
        <div className="value" style={{ color: '#ffd700' }}>{coins}</div>
      </div>
    </div>
  );
}

export function DropMeterBar({ dropMeter, level, difficultyMode }) {
  const pct = Math.min(dropMeter, 100);
  return (
    <div className={`drop-meter-container${pct >= 100 ? ' ready' : ''}`}>
      <div className="drop-meter-left">
        <span className="drop-meter-label">🎁</span>
        <div className="drop-meter-bar">
          <div className="drop-meter-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="drop-meter-percentage">{Math.floor(pct)}%</span>
      </div>
      <span className={`level-indicator${difficultyMode ? '' : ' inactive'}`}>{difficultyMode ? `Level ${level}` : 'Level Off'}</span>
    </div>
  );
}

export function PowerupsBar({ powerUps, onUse }) {
  return (
    <div className="powerups-bar">
      {['shuffle', 'hammer', 'double', 'shield'].map((key) => (
        <div key={key} className={`powerup${powerUps[key] > 0 ? '' : ' disabled'}`} onClick={() => onUse(key)}>
          <span className="icon">{POWERUP_ICONS[key]}</span>
          <span className="name">{POWERUP_NAMES[key]}</span>
          <span className={`count${powerUps[key] > 0 ? '' : ' zero'}`}>{powerUps[key]}</span>
        </div>
      ))}
    </div>
  );
}

export function Controls({ onNewGame, onUndo, canUndo, onTogglePause, paused }) {
  return (
    <div className="controls">
      <button className="btn secondary" onClick={onNewGame}>New Game</button>
      <button className="btn secondary" onClick={onUndo} disabled={!canUndo}>Undo</button>
      <button className="btn" onClick={onTogglePause}>{paused ? 'Resume' : 'Pause'}</button>
    </div>
  );
}

export function AchievementToasts({ toasts }) {
  return (
    <div className="achievement-toasts">
      {toasts.map((t) => (
        <div key={t.id} className="achievement-popup">
          {t.icon} <strong>{t.name}</strong> - {t.desc}
        </div>
      ))}
    </div>
  );
}
