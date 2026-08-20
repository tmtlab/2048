import { useCallback, useEffect, useRef, useState } from 'react';
import { MILESTONES, ACHIEVEMENTS, COIN_PRICES } from '../game/constants';
import { initAudio, playSound } from '../game/audio';
import { haptic } from '../game/telegram';
import { syncCoinsToServer, submitScoreToServer } from '../game/supabaseApi';

const ls = {
  get(key, fallback) {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  },
  set(key, value) {
    localStorage.setItem(key, value);
  },
};

function loadInitialState() {
  return {
    bestScore: parseInt(ls.get('bestScore2048Master', '0'), 10),
    coins: parseInt(ls.get('coins2048', '0'), 10),
    soundEnabled: ls.get('soundEnabled2048', 'true') !== 'false',
    nightMode: ls.get('nightMode2048', 'false') === 'true',
    difficultyMode: ls.get('difficultyMode2048', 'true') !== 'false',
    bestTileEver: parseInt(ls.get('bestTileEver2048', '2'), 10),
    playerName: ls.get('playerName2048', 'You'),
    achievements: JSON.parse(ls.get('achievements2048', '{}')),
    gamesPlayed: parseInt(ls.get('gamesPlayed2048', '0'), 10),
    totalMerges: parseInt(ls.get('totalMerges2048', '0'), 10),
  };
}

let popupId = 0;

export function useGame2048() {
  const init = useRef(loadInitialState()).current;

  // Mutable game state that doesn't need to trigger renders on its own —
  // mirrors the original vanilla-JS approach, mutated in place inside move().
  const boardRef = useRef(Array(16).fill(null));
  const obstaclesRef = useRef(new Set());
  const bombsRef = useRef(new Set());
  const shieldedValuesRef = useRef(new Set());
  const moveHistoryRef = useRef([]);
  const doubleScoreTimerRef = useRef(null);
  const coinSyncTimerRef = useRef(null);

  // Render-triggering state
  const [boardVersion, setBoardVersion] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(init.bestScore);
  const [coins, setCoins] = useState(init.coins);
  const [powerUps, setPowerUps] = useState({ shuffle: 0, hammer: 0, double: 0, shield: 0 });
  const [level, setLevel] = useState(1);
  const [dropMeter, setDropMeter] = useState(0);
  const [gameState, setGameState] = useState('playing'); // playing | paused | gameOver
  const [doubleScoreActive, setDoubleScoreActive] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [interactionMode, setInteractionMode] = useState(null); // 'hammer' | 'shield' | null
  const [soundEnabled, setSoundEnabled] = useState(init.soundEnabled);
  const [nightMode, setNightMode] = useState(init.nightMode);
  const [difficultyMode, setDifficultyMode] = useState(init.difficultyMode);
  const [bestTileEver, setBestTileEver] = useState(init.bestTileEver);
  const [playerName, setPlayerNameState] = useState(init.playerName);
  const [achievements, setAchievements] = useState(init.achievements);
  const [gamesPlayed, setGamesPlayed] = useState(init.gamesPlayed);
  const [totalMerges, setTotalMerges] = useState(init.totalMerges);
  const [popups, setPopups] = useState([]); // floating score/coin/drop popups
  const [toasts, setToasts] = useState([]); // achievement toasts
  const [winFlag, setWinFlag] = useState(0); // increments to signal "show win popup"

  const maxTileRef = useRef(2);
  const hasWonRef = useRef(false);
  const coinsRef = useRef(coins);
  const powerUpsRef = useRef(powerUps);
  coinsRef.current = coins;
  powerUpsRef.current = powerUps;

  const bump = () => setBoardVersion((v) => v + 1);

  const addPopup = useCallback((popup) => {
    const id = ++popupId;
    setPopups((p) => [...p, { id, ...popup }]);
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 1000);
  }, []);

  const scheduleCoinSync = useCallback(() => {
    clearTimeout(coinSyncTimerRef.current);
    coinSyncTimerRef.current = setTimeout(() => {
      syncCoinsToServer(coinsRef.current, powerUpsRef.current);
    }, 1200);
  }, []);

  const addCoins = useCallback(
    (amount) => {
      if (amount <= 0) return;
      setCoins((c) => {
        const next = c + amount;
        ls.set('coins2048', next);
        return next;
      });
      playSound('coin', soundEnabled);
      scheduleCoinSync();
    },
    [soundEnabled, scheduleCoinSync],
  );

  const spendCoins = useCallback(
    (amount) => {
      let ok = false;
      setCoins((c) => {
        if (c >= amount) {
          ok = true;
          const next = c - amount;
          ls.set('coins2048', next);
          return next;
        }
        return c;
      });
      return ok;
    },
    [],
  );

  const unlockAchievement = useCallback(
    (key) => {
      setAchievements((prev) => {
        if (prev[key]) return prev;
        const next = { ...prev, [key]: true };
        ls.set('achievements2048', JSON.stringify(next));
        const ach = ACHIEVEMENTS[key];
        const id = ++popupId;
        setToasts((t) => [...t, { id, ...ach }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
        playSound('achievement', soundEnabled);
        haptic('notification', 'success');
        return next;
      });
    },
    [soundEnabled],
  );

  // addCoins reads soundEnabled via closure but unlockAchievement calls addCoins-like
  // logic separately to avoid a circular dep; grant the achievement bonus directly:
  useEffect(() => {
    // no-op effect placeholder kept for clarity of intent (bonus granted in unlockAchievement caller)
  }, []);

  const grantAchievement = useCallback(
    (key) => {
      const already = achievements[key];
      unlockAchievement(key);
      if (!already) addCoins(25);
    },
    [achievements, unlockAchievement, addCoins],
  );

  const checkAchievements = useCallback(
    (currentScore, currentLevel) => {
      if (maxTileRef.current >= 2 && currentScore > 0) grantAchievement('firstMerge');
      if (bestTileEver >= 64) grantAchievement('reach64');
      if (bestTileEver >= 128) grantAchievement('reach128');
      if (bestTileEver >= 256) grantAchievement('reach256');
      if (bestTileEver >= 512) grantAchievement('reach512');
      if (bestTileEver >= 1024) grantAchievement('reach1024');
      if (bestTileEver >= 2048) grantAchievement('reach2048');
      if (currentScore >= 1000) grantAchievement('score1000');
      if (currentScore >= 5000) grantAchievement('score5000');
      if (currentScore >= 10000) grantAchievement('score10000');
      if (currentLevel >= 5) grantAchievement('level5');
      if (currentLevel >= 10) grantAchievement('level10');
    },
    [bestTileEver, grantAchievement],
  );

  const getNeighbors = (index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    const neighbors = [];
    if (row > 0) neighbors.push(index - 4);
    if (row < 3) neighbors.push(index + 4);
    if (col > 0) neighbors.push(index - 1);
    if (col < 3) neighbors.push(index + 1);
    return neighbors;
  };

  const addRandomTile = useCallback(() => {
    const board = boardRef.current;
    const empty = board
      .map((t, i) => (t === null && !obstaclesRef.current.has(i) && !bombsRef.current.has(i) ? i : null))
      .filter((i) => i !== null);
    if (empty.length === 0) return;
    const idx = empty[Math.floor(Math.random() * empty.length)];
    board[idx] = Math.random() < 0.9 ? 2 : 4;
  }, []);

  const addObstacles = (count) => {
    const board = boardRef.current;
    const empty = board
      .map((t, i) => (t === null && !obstaclesRef.current.has(i) && !bombsRef.current.has(i) ? i : null))
      .filter((i) => i !== null);
    for (let i = 0; i < Math.min(count, empty.length); i++) {
      const idx = empty[Math.floor(Math.random() * empty.length)];
      obstaclesRef.current.add(idx);
      empty.splice(empty.indexOf(idx), 1);
    }
  };

  const addBombsSafe = (count) => {
    const board = boardRef.current;
    const empty = board
      .map((t, i) => (t === null && !obstaclesRef.current.has(i) && !bombsRef.current.has(i) ? i : null))
      .filter((i) => i !== null)
      .filter((i) => !getNeighbors(i).some((n) => board[n] !== null));
    for (let i = 0; i < Math.min(count, empty.length); i++) {
      const idx = empty[Math.floor(Math.random() * empty.length)];
      bombsRef.current.add(idx);
      empty.splice(empty.indexOf(idx), 1);
    }
  };

  const checkDifficultyIncrease = useCallback(() => {
    if (!difficultyMode) return;
    const idx = MILESTONES.indexOf(maxTileRef.current);
    if (idx > 0) {
      const newLevel = idx + 1;
      setLevel(newLevel);
      if (newLevel >= 5 && Math.random() < 0.3) addObstacles(1);
      if (newLevel >= 7 && Math.random() < 0.2) addBombsSafe(1);
    }
  }, [difficultyMode]);

  const checkPowerUpDrop = useCallback(
    (mergedValue) => {
      setDropMeter((prev) => {
        let next = prev + Math.min(mergedValue / 20, 25);
        if (next >= 100) {
          next = 0;
          const list = ['shuffle', 'hammer', 'double', 'shield'];
          const which = list[Math.floor(Math.random() * list.length)];
          setPowerUps((p) => {
            const updated = { ...p, [which]: p[which] + 1 };
            powerUpsRef.current = updated;
            return updated;
          });
          addPopup({ kind: 'drop', which, left: Math.random() * 80 + 10, top: Math.random() * 80 + 10 });
          grantAchievement('firstPowerUp');
          playSound('powerup', soundEnabled);
          haptic('impact', 'medium');
          scheduleCoinSync();
        }
        return next;
      });
    },
    [addPopup, grantAchievement, soundEnabled, scheduleCoinSync],
  );

  const rewardCoins = useCallback(
    (mergedValue, index) => {
      const coinReward = Math.floor(mergedValue / 16);
      if (coinReward > 0) {
        addCoins(coinReward);
        addPopup({ kind: 'coin', index, text: `+${coinReward}🪙` });
      }
    },
    [addCoins, addPopup],
  );

  const showShieldSavePopup = useCallback(
    (index, value) => addPopup({ kind: 'shield-save', index, text: `🛡️ ${value} Saved!` }),
    [addPopup],
  );

  const processBombs = useCallback(
    (scoreRef) => {
      const bombIndices = Array.from(bombsRef.current);
      let exploded = false;
      for (const bombIndex of bombIndices) {
        if (!bombsRef.current.has(bombIndex)) continue;
        const adjacent = getNeighbors(bombIndex).filter(
          (n) => boardRef.current[n] !== null && !obstaclesRef.current.has(n) && !bombsRef.current.has(n),
        );
        if (adjacent.length === 0) continue;
        let penalty = 0;
        for (const tileIndex of adjacent) {
          const value = boardRef.current[tileIndex];
          if (shieldedValuesRef.current.has(value)) {
            shieldedValuesRef.current.delete(value);
            showShieldSavePopup(tileIndex, value);
            continue;
          }
          if (value >= 128) penalty += Math.floor(value / 2);
          boardRef.current[tileIndex] = null;
        }
        bombsRef.current.delete(bombIndex);
        if (penalty > 0) {
          scoreRef.value = Math.max(0, scoreRef.value - penalty);
          addPopup({ kind: 'score', index: bombIndex, text: `-${penalty}`, color: '#ff4757' });
          haptic('notification', 'error');
        } else {
          addPopup({ kind: 'score', index: bombIndex, text: '💥', color: '#ff4757' });
          grantAchievement('surviveBomb');
        }
        playSound('bomb', soundEnabled);
        exploded = true;
      }
      return exploded;
    },
    [addPopup, showShieldSavePopup, grantAchievement, soundEnabled],
  );

  const isGameOver = useCallback(() => {
    const board = boardRef.current;
    for (let i = 0; i < 16; i++) {
      if (board[i] === null && !obstaclesRef.current.has(i) && !bombsRef.current.has(i)) return false;
    }
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const current = i * 4 + j;
        if (board[current] === null || obstaclesRef.current.has(current) || bombsRef.current.has(current)) continue;
        if (j < 3) {
          const right = i * 4 + j + 1;
          if (board[right] !== null && board[current] === board[right] && !obstaclesRef.current.has(right) && !bombsRef.current.has(right))
            return false;
        }
        if (i < 3) {
          const down = (i + 1) * 4 + j;
          if (board[down] !== null && board[current] === board[down] && !obstaclesRef.current.has(down) && !bombsRef.current.has(down))
            return false;
        }
      }
    }
    return true;
  }, []);

  const move = useCallback(
    (direction) => {
      if (gameState !== 'playing' || interactionMode) return;

      moveHistoryRef.current.push({
        board: [...boardRef.current],
        score,
        obstacles: new Set(obstaclesRef.current),
        bombs: new Set(bombsRef.current),
        shieldedValues: new Set(shieldedValuesRef.current),
      });
      if (moveHistoryRef.current.length > 5) moveHistoryRef.current.shift();

      let moved = false;
      let mergeScore = 0;
      const board = boardRef.current;

      for (let line = 0; line < 4; line++) {
        let indices = [];
        for (let i = 0; i < 4; i++) {
          if (direction === 'left') indices.push(line * 4 + i);
          else if (direction === 'right') indices.push(line * 4 + (3 - i));
          else if (direction === 'up') indices.push(i * 4 + line);
          else if (direction === 'down') indices.push((3 - i) * 4 + line);
        }

        let segments = [];
        let currentSegment = [];
        for (const idx of indices) {
          if (obstaclesRef.current.has(idx) || bombsRef.current.has(idx)) {
            if (currentSegment.length) {
              segments.push(currentSegment);
              currentSegment = [];
            }
          } else {
            currentSegment.push(idx);
          }
        }
        if (currentSegment.length) segments.push(currentSegment);

        for (const segment of segments) {
          const values = segment.map((idx) => board[idx]);
          let result = [];
          let i = 0;
          while (i < values.length) {
            if (values[i] === null) {
              i++;
              continue;
            }
            let j = i + 1;
            while (j < values.length && values[j] === null) j++;
            if (j < values.length && values[i] === values[j]) {
              const mergedValue = values[i] * 2;
              result.push(mergedValue);
              mergeScore += mergedValue;
              setTotalMerges((t) => {
                const next = t + 1;
                ls.set('totalMerges2048', next);
                return next;
              });
              moved = true;
              initAudio();
              playSound(mergedValue >= 128 ? 'bigMerge' : 'merge', soundEnabled);
              if (mergedValue >= 64) haptic('impact', 'light');
              checkPowerUpDrop(mergedValue);
              rewardCoins(mergedValue, segment[i]);

              if (shieldedValuesRef.current.has(values[i]) || shieldedValuesRef.current.has(values[j])) {
                shieldedValuesRef.current.delete(values[i]);
                shieldedValuesRef.current.delete(values[j]);
                shieldedValuesRef.current.add(mergedValue);
              }

              if (mergedValue > maxTileRef.current) {
                maxTileRef.current = mergedValue;
                if (mergedValue > bestTileEver) {
                  setBestTileEver(mergedValue);
                  ls.set('bestTileEver2048', mergedValue);
                }
                checkDifficultyIncrease();
              }
              if (!hasWonRef.current && mergedValue >= 2048) {
                hasWonRef.current = true;
                setWinFlag((w) => w + 1);
              }
              i = j + 1;
            } else {
              result.push(values[i]);
              i++;
            }
          }
          while (result.length < values.length) result.push(null);
          segment.forEach((idx, pos) => {
            if (board[idx] !== result[pos]) {
              board[idx] = result[pos];
              moved = true;
            }
          });
        }
      }

      if (!moved) return;

      const scoreRef = { value: score + (doubleScoreActive ? mergeScore * 2 : mergeScore) };
      processBombs(scoreRef);

      const finalScore = scoreRef.value;
      setScore(finalScore);
      setBestScore((b) => {
        if (finalScore > b) {
          ls.set('bestScore2048Master', finalScore);
          return finalScore;
        }
        return b;
      });
      checkAchievements(finalScore, level);
      setCanUndo(true);
      addRandomTile();
      bump();

      if (isGameOver()) {
        setGameState('gameOver');
        setGamesPlayed((g) => {
          const next = g + 1;
          ls.set('gamesPlayed2048', next);
          return next;
        });
        submitScoreToServer(finalScore);
        playSound('gameOver', soundEnabled);
        haptic('notification', 'warning');
      }
    },
    [
      gameState,
      interactionMode,
      score,
      doubleScoreActive,
      soundEnabled,
      checkPowerUpDrop,
      rewardCoins,
      bestTileEver,
      checkDifficultyIncrease,
      processBombs,
      checkAchievements,
      level,
      addRandomTile,
      isGameOver,
    ],
  );

  const undo = useCallback(() => {
    if (moveHistoryRef.current.length === 0 || gameState === 'gameOver') return;
    const prev = moveHistoryRef.current.pop();
    boardRef.current = prev.board;
    obstaclesRef.current = prev.obstacles;
    bombsRef.current = prev.bombs;
    shieldedValuesRef.current = prev.shieldedValues;
    setScore(prev.score);
    setCanUndo(moveHistoryRef.current.length > 0);
    bump();
  }, [gameState]);

  const newGame = useCallback(() => {
    boardRef.current = Array(16).fill(null);
    obstaclesRef.current = new Set();
    bombsRef.current = new Set();
    shieldedValuesRef.current = new Set();
    moveHistoryRef.current = [];
    hasWonRef.current = false;
    maxTileRef.current = 2;
    setScore(0);
    setLevel(1);
    setDropMeter(0);
    setCanUndo(false);
    setDoubleScoreActive(false);
    setInteractionMode(null);
    setGameState('playing');
    addRandomTile();
    addRandomTile();
    bump();
  }, [addRandomTile]);

  const togglePause = useCallback(() => {
    if (gameState === 'gameOver') return;
    setGameState((s) => (s === 'playing' ? 'paused' : 'playing'));
  }, [gameState]);

  const shuffleBoard = useCallback(() => {
    const board = boardRef.current;
    const tiles = [];
    const positions = [];
    board.forEach((t, i) => {
      if (t !== null && !obstaclesRef.current.has(i) && !bombsRef.current.has(i)) {
        tiles.push(t);
        positions.push(i);
      }
    });
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    board.forEach((t, i) => {
      if (t !== null && !obstaclesRef.current.has(i) && !bombsRef.current.has(i)) board[i] = null;
    });
    tiles.forEach((t, i) => {
      board[positions[i]] = t;
    });
    bump();
  }, []);

  const activateDoubleScore = useCallback(() => {
    setDoubleScoreActive(true);
    clearTimeout(doubleScoreTimerRef.current);
    doubleScoreTimerRef.current = setTimeout(() => setDoubleScoreActive(false), 30000);
  }, []);

  const usePowerUp = useCallback(
    (type) => {
      if (powerUpsRef.current[type] <= 0 || gameState !== 'playing') return;
      initAudio();
      playSound('click', soundEnabled);
      haptic('impact', 'light');
      if (type === 'shuffle') {
        shuffleBoard();
        grantAchievement('useShuffle');
      } else if (type === 'hammer') {
        setInteractionMode('hammer');
        grantAchievement('useHammer');
      } else if (type === 'double') {
        activateDoubleScore();
        grantAchievement('useDouble');
      } else if (type === 'shield') {
        setInteractionMode('shield');
        grantAchievement('useShield');
      }
      setPowerUps((p) => {
        const updated = { ...p, [type]: p[type] - 1 };
        powerUpsRef.current = updated;
        return updated;
      });
      scheduleCoinSync();
    },
    [gameState, soundEnabled, shuffleBoard, grantAchievement, activateDoubleScore, scheduleCoinSync],
  );

  // Tile-click handler for hammer/shield interaction modes
  const handleTileClick = useCallback(
    (index) => {
      if (interactionMode === 'hammer') {
        const board = boardRef.current;
        if (board[index] !== null || bombsRef.current.has(index) || obstaclesRef.current.has(index)) {
          if (board[index] !== null) shieldedValuesRef.current.delete(board[index]);
          board[index] = null;
          bombsRef.current.delete(index);
          obstaclesRef.current.delete(index);
          setInteractionMode(null);
          bump();
        }
      } else if (interactionMode === 'shield') {
        const board = boardRef.current;
        if (board[index] !== null && !obstaclesRef.current.has(index) && !bombsRef.current.has(index)) {
          shieldedValuesRef.current.add(board[index]);
          setInteractionMode(null);
          playSound('shield', soundEnabled);
          bump();
        }
      }
    },
    [interactionMode, soundEnabled],
  );

  // Auto-cancel hammer/shield mode after 5s, matching original UX
  useEffect(() => {
    if (!interactionMode) return;
    const t = setTimeout(() => setInteractionMode(null), 5000);
    return () => clearTimeout(t);
  }, [interactionMode]);

  const buyPowerUpWithCoins = useCallback(
    (type) => {
      const price = COIN_PRICES[type];
      if (spendCoins(price)) {
        setPowerUps((p) => {
          const updated = { ...p, [type]: p[type] + 1 };
          powerUpsRef.current = updated;
          return updated;
        });
        playSound('powerup', soundEnabled);
        haptic('notification', 'success');
        scheduleCoinSync();
      } else {
        playSound('bomb', soundEnabled);
        haptic('notification', 'error');
      }
    },
    [spendCoins, soundEnabled, scheduleCoinSync],
  );

  const grantPurchasedItem = useCallback((item, amount) => {
    if (item.startsWith('coins_')) {
      setCoins((c) => {
        const next = c + amount;
        ls.set('coins2048', next);
        return next;
      });
    } else {
      setPowerUps((p) => {
        const updated = { ...p, [item]: p[item] + 1 };
        powerUpsRef.current = updated;
        return updated;
      });
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((s) => {
      const next = !s;
      ls.set('soundEnabled2048', next);
      if (next) {
        initAudio();
        playSound('click', true);
      }
      return next;
    });
    haptic('selection');
  }, []);

  const toggleTheme = useCallback(() => {
    setNightMode((n) => {
      const next = !n;
      ls.set('nightMode2048', next);
      ls.set('nightModeOverride2048', 'true');
      return next;
    });
    haptic('selection');
  }, []);

  const toggleDifficultyMode = useCallback(() => {
    setDifficultyMode((d) => {
      const next = !d;
      ls.set('difficultyMode2048', next);
      if (!next) {
        obstaclesRef.current.clear();
        bombsRef.current.clear();
        setLevel(1);
        bump();
      }
      return next;
    });
    haptic('selection');
  }, []);

  const setPlayerName = useCallback((name) => {
    if (!name.trim()) return;
    setPlayerNameState(name.trim());
    ls.set('playerName2048', name.trim());
  }, []);

  const hydrateFromServer = useCallback((profile) => {
    if (!profile) return;
    if (profile.coins > coinsRef.current) setCoins(profile.coins);
    if (profile.best_score) setBestScore((b) => Math.max(b, profile.best_score));
    if (profile.powerups) {
      setPowerUps((p) => {
        const updated = { ...p };
        let changed = false;
        for (const k of Object.keys(updated)) {
          if (typeof profile.powerups[k] === 'number' && profile.powerups[k] > updated[k]) {
            updated[k] = profile.powerups[k];
            changed = true;
          }
        }
        if (changed) powerUpsRef.current = updated;
        return changed ? updated : p;
      });
    }
  }, []);

  return {
    // board
    board: boardRef.current,
    obstacles: obstaclesRef.current,
    bombs: bombsRef.current,
    shieldedValues: shieldedValuesRef.current,
    boardVersion,
    // stats
    score,
    bestScore,
    coins,
    powerUps,
    level,
    dropMeter,
    gameState,
    doubleScoreActive,
    canUndo,
    interactionMode,
    bestTileEver,
    achievements,
    gamesPlayed,
    totalMerges,
    playerName,
    soundEnabled,
    nightMode,
    difficultyMode,
    popups,
    toasts,
    winFlag,
    // actions
    move,
    undo,
    newGame,
    togglePause,
    usePowerUp,
    handleTileClick,
    buyPowerUpWithCoins,
    grantPurchasedItem,
    toggleSound,
    toggleTheme,
    toggleDifficultyMode,
    setPlayerName,
    hydrateFromServer,
    setNightMode,
  };
}
