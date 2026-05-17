export const CANVAS = {
  WIDTH: 800,
  HEIGHT: 600,
};

export const COLORS = {
  NEON_CYAN: '#00ffff',
  NEON_GREEN: '#39ff14',
  NEON_PINK: '#ff006e',
  NEON_PURPLE: '#b300ff',
  NEON_YELLOW: '#ffff00',
  DARK_BG: '#0a0e27',
  GRID_COLOR: 'rgba(0, 255, 255, 0.05)',
};

export const PLAYER = {
  WIDTH: 30,
  HEIGHT: 30,
  SPEED: 5,
  START_X: 400,
  START_Y: 540,
  LIVES: 3,
};

export const CENTIPEDE = {
  SEGMENT_SIZE: 20,
  INITIAL_LENGTH: 12,
  SPEED: 1.5,
  WAVE_WIDTH: 4,
  DESCENT_SPEED: 20,
};

export const PROJECTILE = {
  SPEED: 7,
  WIDTH: 2,
  HEIGHT: 8,
};

export const POWERUP = {
  SIZE: 15,
  FALL_SPEED: 2,
  DURATION: 40,
};

export const MUSHROOM = {
  SIZE: 12,
  HEALTH: 1,
};

export const GAME = {
  TARGET_FPS: 60,
  DIFFICULTY_SCALE: 1.05,
};

export const SCORING = {
  CENTIPEDE_SEGMENT: 10,
  MUSHROOM: 5,
  POWERUP_COLLECT: 20,
};

export const POWERUP_TYPES = {
  MULTISHOT: 'multishot',
  SPREAD: 'spread',
  LASER: 'laser',
  BOMB: 'bomb',
  SHIELD: 'shield',
};
