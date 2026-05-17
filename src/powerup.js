import { POWERUP, POWERUP_TYPES, CANVAS } from './constants.js';
import { Utils } from './utils.js';

const POWERUP_COLORS = {
  [POWERUP_TYPES.MULTISHOT]: '#ffff00',
  [POWERUP_TYPES.SPREAD]: '#ff006e',
  [POWERUP_TYPES.LASER]: '#b300ff',
  [POWERUP_TYPES.BOMB]: '#ff6600',
  [POWERUP_TYPES.SHIELD]: '#00ff00',
};

const POWERUP_TYPES_ARRAY = Object.values(POWERUP_TYPES);

export class Powerup {
  constructor(x, y, type = null) {
    this.x = x;
    this.y = y;
    this.vy = POWERUP.FALL_SPEED;
    this.type = type || POWERUP_TYPES_ARRAY[Utils.randomInt(0, POWERUP_TYPES_ARRAY.length - 1)];
    this.radius = POWERUP.SIZE / 2;
    this.active = true;
  }

  update() {
    this.y += this.vy;
    if (this.y > CANVAS.HEIGHT + 10) {
      this.active = false;
    }
  }

  getBounds() {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      w: this.radius * 2,
      h: this.radius * 2,
    };
  }

  getColor() {
    return POWERUP_COLORS[this.type] || '#ffffff';
  }
}

export class PowerupManager {
  constructor() {
    this.powerups = [];
  }

  spawnPowerup(x, y, type = null) {
    // Small chance to spawn a powerup
    if (Math.random() < 0.6) {
      // Add random offset so it's not exact
      const offsetX = Utils.randomRange(-10, 10);
      const offsetY = Utils.randomRange(-10, 10);
      this.powerups.push(new Powerup(x + offsetX, y + offsetY, type));
    }
  }

  update() {
    this.powerups = this.powerups.filter(p => {
      p.update();
      return p.active;
    });
  }

  removeAt(index) {
    this.powerups.splice(index, 1);
  }

  getActive() {
    return this.powerups;
  }
}
