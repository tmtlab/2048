import { useEffect, useState } from 'react';
import Modal from './Modal';

export default function SettingsModal({ open, onClose, game }) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName(game.playerName === 'You' ? '' : game.playerName);
  }, [open, game.playerName]);

  function handleClose() {
    if (name.trim()) game.setPlayerName(name.trim());
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Settings">
      <h3>Player Name</h3>
      <input
        className="player-name-input"
        type="text"
        placeholder="Enter your name..."
        maxLength={15}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <h3>Sound</h3>
      <div className="settings-option" onClick={game.toggleSound}>
        <span className="option-label">🔊 Sound Effects</span>
        <div className={`toggle-switch${game.soundEnabled ? ' active' : ''}`}><div className="toggle-knob" /></div>
      </div>

      <h3>Theme</h3>
      <div className="settings-option" onClick={game.toggleTheme}>
        <span className="option-label">🌙 Night Mode</span>
        <div className={`toggle-switch${game.nightMode ? ' active' : ''}`}><div className="toggle-knob" /></div>
      </div>
      <p style={{ fontSize: '0.7em', color: 'var(--text-secondary)', marginTop: '-6px' }}>
        Auto-set from your Telegram theme; toggle to override.
      </p>

      <h3>Difficulty Mode</h3>
      <div className="settings-option" onClick={game.toggleDifficultyMode}>
        <span className="option-label">📈 Progressive Difficulty</span>
        <div className={`toggle-switch${game.difficultyMode ? ' active' : ''}`}><div className="toggle-knob" /></div>
      </div>
    </Modal>
  );
}
