let audioContext = null;

export function initAudio() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

const PRESETS = {
  merge: { freq: 523, dur: 0.1, vol: 0.3 },
  bigMerge: { freq: 659, dur: 0.15, vol: 0.3 },
  bomb: { freq: 100, dur: 0.3, vol: 0.3 },
  powerup: { freq: 784, dur: 0.2, vol: 0.3 },
  achievement: { freq: 880, dur: 0.3, vol: 0.3 },
  gameOver: { freq: 200, dur: 0.5, vol: 0.3 },
  click: { freq: 440, dur: 0.05, vol: 0.2 },
  coin: { freq: 988, dur: 0.15, vol: 0.3 },
  shield: { freq: 660, dur: 0.3, vol: 0.3 },
};

export function playSound(type, soundEnabled) {
  if (!soundEnabled || !audioContext) return;
  const { freq, dur, vol } = PRESETS[type] || { freq: 440, dur: 0.1, vol: 0.3 };
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, audioContext.currentTime);
  gain.gain.setValueAtTime(vol, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + dur);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + dur);
}
