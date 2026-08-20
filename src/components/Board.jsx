import { useEffect, useRef } from 'react';
import Tile from './Tile';

export default function Board({ game }) {
  const {
    board,
    obstacles,
    bombs,
    shieldedValues,
    boardVersion,
    interactionMode,
    handleTileClick,
    move,
    togglePause,
    gameState,
    popups,
    newGame,
  } = game;

  const containerRef = useRef(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const mouseState = useRef({ down: false, x: 0, y: 0 });

  useEffect(() => {
    const onKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); move('left'); break;
        case 'ArrowRight': e.preventDefault(); move('right'); break;
        case 'ArrowUp': e.preventDefault(); move('up'); break;
        case 'ArrowDown': e.preventDefault(); move('down'); break;
        case ' ': e.preventDefault(); togglePause(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [move, togglePause]);

  const handleTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    resolveSwipe(dx, dy);
  };
  const handleMouseDown = (e) => {
    mouseState.current = { down: true, x: e.clientX, y: e.clientY };
  };
  useEffect(() => {
    const onMouseUp = (e) => {
      if (!mouseState.current.down) return;
      mouseState.current.down = false;
      resolveSwipe(e.clientX - mouseState.current.x, e.clientY - mouseState.current.y);
    };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [move]);

  function resolveSwipe(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30) move('right');
      else if (dx < -30) move('left');
    } else {
      if (dy > 30) move('down');
      else if (dy < -30) move('up');
    }
  }

  const tiles = [];
  for (let index = 0; index < 16; index++) {
    const value = board[index];
    const isObstacle = obstacles.has(index);
    const isBomb = bombs.has(index);
    if (value === null && !isObstacle && !isBomb) continue;
    tiles.push(
      <Tile
        key={index}
        index={index}
        value={value}
        isObstacle={isObstacle}
        isBomb={isBomb}
        shielded={value !== null && shieldedValues.has(value)}
        interactive={!!interactionMode}
        onClick={handleTileClick}
      />,
    );
  }

  return (
    <div className="board-wrapper">
      <div
        className="board-container"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div className="board">
          {Array.from({ length: 16 }).map((_, i) => (
            <div className="cell" key={i} />
          ))}
        </div>
        <div className="tile-grid" key={boardVersion}>
          {tiles}
        </div>

        <div className="popup-layer">
          {popups.map((p) => {
            if (p.kind === 'coin') {
              return (
                <div key={p.id} className="coin-popup" style={{ left: `${(p.index % 4) * 25 + 12}%`, top: `${Math.floor(p.index / 4) * 25 + 10}%`, fontSize: '1em' }}>
                  {p.text}
                </div>
              );
            }
            if (p.kind === 'score' || p.kind === 'shield-save') {
              return (
                <div
                  key={p.id}
                  className="score-popup"
                  style={{
                    left: `${(p.index % 4) * 25 + 12}%`,
                    top: `${Math.floor(p.index / 4) * 25 + 12}%`,
                    color: p.kind === 'shield-save' ? '#00bfff' : p.color || '#ff4757',
                    fontSize: p.kind === 'shield-save' ? '1.1em' : '1.3em',
                  }}
                >
                  {p.text}
                </div>
              );
            }
            if (p.kind === 'drop') {
              const icon = { shuffle: '🔀', hammer: '🔨', double: '✨', shield: '🛡️' }[p.which];
              return (
                <div key={p.id} className="drop-popup" style={{ left: `${p.left}%`, top: `${p.top}%` }}>
                  {icon}
                </div>
              );
            }
            return null;
          })}
        </div>

        {interactionMode === 'hammer' && <div className="hint-banner">🔨 Click a tile to remove it!</div>}
        {interactionMode === 'shield' && <div className="hint-banner">🛡️ Click a number to protect it!</div>}

        {gameState === 'gameOver' && (
          <div className="game-over-overlay">
            <h2>Game Over!</h2>
            <p>Score: {game.score}</p>
            <button className="btn" onClick={newGame}>Try Again</button>
            <button className="btn" onClick={game.openLeaderboard}>View Leaderboard</button>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="game-over-overlay pause">
            <h2 style={{ fontSize: '2em' }}>Paused</h2>
            <p style={{ fontSize: '1em' }}>Take a breather!</p>
          </div>
        )}
      </div>
    </div>
  );
}
