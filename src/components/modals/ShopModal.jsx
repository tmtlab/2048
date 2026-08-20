import { useState } from 'react';
import Modal from './Modal';
import { COIN_PRICES, POWERUP_ICONS, POWERUP_NAMES, STAR_ITEMS } from '../../game/constants';
import { createStarsInvoice } from '../../game/supabaseApi';
import { haptic, IN_TELEGRAM, openInvoice, showAlert } from '../../game/telegram';

export default function ShopModal({ open, onClose, game }) {
  const [currency, setCurrency] = useState('coins');
  const [buyingItem, setBuyingItem] = useState(null);

  function switchCurrency(c) {
    setCurrency(c);
    haptic('selection');
  }

  async function buyWithStars(item) {
    if (!IN_TELEGRAM) {
      haptic('notification', 'error');
      return;
    }
    setBuyingItem(item.key);
    const result = await createStarsInvoice(item.key);
    if (!result?.url) {
      setBuyingItem(null);
      showAlert('Could not start payment. Please try again.');
      return;
    }
    openInvoice(result.url, (status) => {
      setBuyingItem(null);
      if (status === 'paid') {
        haptic('notification', 'success');
        game.grantPurchasedItem(item.key, item.amount);
      } else if (status === 'failed' || status === 'cancelled') {
        haptic('notification', 'error');
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="🛒 Shop">
      <p style={{ textAlign: 'center', marginBottom: 12 }}>
        🪙 <strong>{game.coins}</strong> coins &nbsp;•&nbsp;
        <span style={{ fontSize: '0.75em', color: 'var(--text-secondary)' }}>
          {IN_TELEGRAM ? "⭐ Stars purchases open Telegram's payment sheet" : '⭐ Stars purchases only work inside Telegram'}
        </span>
      </p>

      <div className="currency-tabs">
        <button className={`currency-tab${currency === 'coins' ? ' active' : ''}`} onClick={() => switchCurrency('coins')}>🪙 Coins</button>
        <button className={`currency-tab${currency === 'stars' ? ' active' : ''}`} onClick={() => switchCurrency('stars')}>⭐ Stars</button>
      </div>

      {currency === 'coins'
        ? Object.keys(COIN_PRICES).map((key) => (
            <div className="shop-item" key={key}>
              <div className="shop-icon">{POWERUP_ICONS[key]}</div>
              <div className="shop-info">
                <div className="shop-name">{POWERUP_NAMES[key]}</div>
                <div className="shop-price">🪙 {COIN_PRICES[key]} coins</div>
              </div>
              <button className="shop-buy-btn" disabled={game.coins < COIN_PRICES[key]} onClick={() => game.buyPowerUpWithCoins(key)}>
                Buy
              </button>
            </div>
          ))
        : STAR_ITEMS.map((item) => (
            <div className="shop-item" key={item.key}>
              <div className="shop-icon">{item.icon}</div>
              <div className="shop-info">
                <div className="shop-name">{item.name}</div>
                <div className="shop-price" style={{ color: 'var(--star-color)' }}>⭐ {item.price} Stars</div>
              </div>
              <button className="shop-buy-btn" disabled={!IN_TELEGRAM || buyingItem === item.key} onClick={() => buyWithStars(item)}>
                {buyingItem === item.key ? '…' : 'Buy'}
              </button>
            </div>
          ))}
    </Modal>
  );
}
