export const MILESTONES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

export const COIN_PRICES = { shuffle: 50, hammer: 75, double: 100, shield: 80 };

export const STAR_ITEMS = [
  { key: 'shuffle', icon: '🔀', name: 'Shuffle', price: 15, type: 'powerup' },
  { key: 'hammer', icon: '🔨', name: 'Hammer', price: 20, type: 'powerup' },
  { key: 'double', icon: '✨', name: '2x Score', price: 25, type: 'powerup' },
  { key: 'shield', icon: '🛡️', name: 'Shield', price: 20, type: 'powerup' },
  { key: 'coins_500', icon: '🪙', name: '500 Coins', price: 30, type: 'coins', amount: 500 },
  { key: 'coins_1500', icon: '🪙', name: '1,500 Coins', price: 75, type: 'coins', amount: 1500 },
];

export const POWERUP_ICONS = { shuffle: '🔀', hammer: '🔨', double: '✨', shield: '🛡️' };
export const POWERUP_NAMES = { shuffle: 'Shuffle', hammer: 'Hammer', double: '2x Score', shield: 'Shield' };

export const ACHIEVEMENTS = {
  firstMerge: { icon: '🔗', name: 'First Merge', desc: 'Merge your first tiles' },
  reach64: { icon: '📊', name: 'Getting Serious', desc: 'Reach tile 64' },
  reach128: { icon: '🎯', name: 'Century Club', desc: 'Reach tile 128' },
  reach256: { icon: '💪', name: 'Power Player', desc: 'Reach tile 256' },
  reach512: { icon: '🚀', name: 'High Roller', desc: 'Reach tile 512' },
  reach1024: { icon: '🏆', name: 'Almost There', desc: 'Reach tile 1024' },
  reach2048: { icon: '👑', name: '2048 Master', desc: 'Reach tile 2048' },
  score1000: { icon: '💰', name: 'Point Collector', desc: 'Score 1000 points' },
  score5000: { icon: '💎', name: 'Score Hunter', desc: 'Score 5000 points' },
  score10000: { icon: '🌟', name: 'Score Legend', desc: 'Score 10000 points' },
  firstPowerUp: { icon: '🎁', name: 'Power Up', desc: 'Collect first power-up' },
  useHammer: { icon: '🔨', name: 'Demolition', desc: 'Use hammer power-up' },
  useShuffle: { icon: '🔀', name: 'Mix Master', desc: 'Use shuffle power-up' },
  useDouble: { icon: '✨', name: 'Double Trouble', desc: 'Use 2x score power-up' },
  useShield: { icon: '🛡️', name: 'Protected', desc: 'Use shield power-up' },
  surviveBomb: { icon: '💣', name: 'Bomb Survivor', desc: 'Survive a bomb explosion' },
  level5: { icon: '📈', name: 'Level Up', desc: 'Reach difficulty level 5' },
  level10: { icon: '🔥', name: 'Maximum Difficulty', desc: 'Reach difficulty level 10' },
};

export const TILE_COLORS = {
  2: { bg: '#eee4da', color: '#776e65' },
  4: { bg: '#ede0c8', color: '#776e65' },
  8: { bg: '#f2b179', color: '#f9f6f2' },
  16: { bg: '#f59563', color: '#f9f6f2' },
  32: { bg: '#f67c5f', color: '#f9f6f2' },
  64: { bg: '#f65e3b', color: '#f9f6f2' },
  128: { bg: '#edcf72', color: '#f9f6f2' },
  256: { bg: '#edcc61', color: '#f9f6f2' },
  512: { bg: '#edc850', color: '#f9f6f2' },
  1024: { bg: '#edc53f', color: '#f9f6f2' },
  2048: { bg: '#edc22e', color: '#f9f6f2' },
};
