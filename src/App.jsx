import { useEffect, useState } from 'react';
import { useGame2048 } from './hooks/useGame2048';
import { Header, StatsBar, DropMeterBar, PowerupsBar, Controls, AchievementToasts } from './components/HUD';
import Board from './components/Board';
import HelpModal from './components/modals/HelpModal';
import SettingsModal from './components/modals/SettingsModal';
import ProfileModal from './components/modals/ProfileModal';
import LeaderboardModal from './components/modals/LeaderboardModal';
import ShopModal from './components/modals/ShopModal';
import { getTelegramUser, initTelegramApp, setHeaderColor, showPopup, tg } from './game/telegram';
import { BACKEND_CONFIGURED, loadProfileFromServer } from './game/supabaseApi';

export default function App() {
  const game = useGame2048();
  const [telegramUser, setTelegramUser] = useState(null);
  const [syncBadge, setSyncBadge] = useState('');
  const [modal, setModal] = useState(null); // 'help' | 'settings' | 'profile' | 'leaderboard' | 'shop' | null

  // Telegram bootstrap: theme sync, header color, user identity
  useEffect(() => {
    if (!tg) {
      setSyncBadge('Running outside Telegram — local mode only');
      return;
    }
    initTelegramApp({
      onThemeChange: (isDark, themeParams) => {
        if (localStorage.getItem('nightModeOverride2048') === null) {
          game.setNightMode(isDark);
        }
        const root = document.documentElement;
        if (themeParams.bg_color) root.style.setProperty('--bg-primary', themeParams.bg_color);
        if (themeParams.text_color) root.style.setProperty('--text-primary', themeParams.text_color);
        if (themeParams.hint_color) root.style.setProperty('--text-secondary', themeParams.hint_color);
        if (themeParams.button_color) root.style.setProperty('--accent', themeParams.button_color);
      },
    });
    const u = getTelegramUser();
    if (u) setTelegramUser(u);
    setSyncBadge(BACKEND_CONFIGURED ? '' : 'Supabase not configured — playing in local-only mode');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply theme + header color whenever nightMode changes
  useEffect(() => {
    document.body.setAttribute('data-theme', game.nightMode ? 'dark' : 'light');
    setHeaderColor(game.nightMode ? '#1a1a2e' : '#faf8ef');
  }, [game.nightMode]);

  // Pull server-side profile once we know who the user is
  useEffect(() => {
    if (!telegramUser) return;
    loadProfileFromServer(telegramUser.id).then((profile) => {
      if (profile) game.hydrateFromServer(profile);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegramUser]);

  // "You reached 2048!" popup
  useEffect(() => {
    if (game.winFlag === 0) return;
    showPopup(
      { title: '🎉 You reached 2048!', message: 'Congratulations, Master!', buttons: [{ type: 'ok' }] },
      '🎉 Congratulations! You reached 2048!',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.winFlag]);

  const playerName = telegramUser ? telegramUser.username || telegramUser.first_name || game.playerName : game.playerName;

  return (
    <div className="container">
      <Header
        telegramUser={telegramUser}
        playerName={playerName}
        onOpenSettings={() => setModal('settings')}
        onOpenProfile={() => setModal('profile')}
        onOpenShop={() => setModal('shop')}
        onOpenLeaderboard={() => setModal('leaderboard')}
        onOpenHelp={() => setModal('help')}
      />

      <div className="sync-badge">{syncBadge}</div>

      <StatsBar score={game.score} bestScore={game.bestScore} coins={game.coins} doubleScoreActive={game.doubleScoreActive} />
      <DropMeterBar dropMeter={game.dropMeter} level={game.level} difficultyMode={game.difficultyMode} />

      <Board game={{ ...game, openLeaderboard: () => setModal('leaderboard') }} />

      <PowerupsBar powerUps={game.powerUps} onUse={game.usePowerUp} />
      <Controls
        onNewGame={game.newGame}
        onUndo={game.undo}
        canUndo={game.canUndo}
        onTogglePause={game.togglePause}
        paused={game.gameState === 'paused'}
      />

      <AchievementToasts toasts={game.toasts} />

      <HelpModal open={modal === 'help'} onClose={() => setModal(null)} />
      <SettingsModal open={modal === 'settings'} onClose={() => setModal(null)} game={game} />
      <ProfileModal open={modal === 'profile'} onClose={() => setModal(null)} game={game} telegramUser={telegramUser} />
      <LeaderboardModal open={modal === 'leaderboard'} onClose={() => setModal(null)} game={game} telegramUser={telegramUser} />
      <ShopModal open={modal === 'shop'} onClose={() => setModal(null)} game={game} />
    </div>
  );
}
