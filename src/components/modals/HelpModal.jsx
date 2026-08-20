import Modal from './Modal';

export default function HelpModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="How to Play">
      <h3>Power-Ups</h3>
      <ul>
        <li>🔀 Shuffle: Rearrange tiles</li>
        <li>🔨 Hammer: Remove any tile</li>
        <li>✨ 2x Score: Double points for 30s</li>
        <li>🛡️ Shield: Protect a number from bombs - follows the number!</li>
      </ul>
      <h3>Currencies</h3>
      <ul>
        <li>🪙 Coins: earned by merging tiles in-game</li>
        <li>⭐ Telegram Stars: buy power-ups or coin bundles instantly from the Shop</li>
      </ul>
    </Modal>
  );
}
