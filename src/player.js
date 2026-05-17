import { PLAYER, CANVAS, COLORS } from './constants.js';
import { Utils } from './utils.js';

export class Player {
  constructor(x = PLAYER.START_X, y = PLAYER.START_Y) {
    this.x = x;
    this.y = y;
    this.width = PLAYER.WIDTH;
    this.height = PLAYER.HEIGHT;
    this.speed = PLAYER.SPEED;
    this.lives = PLAYER.LIVES;
    this.health = 1;
    this.activePowerups = [];
    this.lastShotTime = 0;
    this.shootCooldown = 200; // ms between shots
    this.invulnerable = false;
    this.invulnerabilityTime = 0;
  }

  update(input) {
    if (input.isMovingLeft()) {
      this.x = Utils.clamp(this.x - this.speed, this.width / 2, CANVAS.WIDTH - this.width / 2);
    }
    if (input.isMovingRight()) {
      this.x = Utils.clamp(this.x + this.speed, this.width / 2, CANVAS.WIDTH - this.width / 2);
    }

    // Update active powerups
    this.activePowerups = this.activePowerups.filter(p => {
      p.timeLeft -= 1 / 60; // Assuming 60 FPS
      return p.timeLeft > 0;
    });
  }

  addPowerup(type) {
    const POWERUP_DURATION = 40; // seconds
    // Check if already have this powerup, extend time instead
    const existing = this.activePowerups.find(p => p.type === type);
    if (existing) {
      existing.timeLeft = POWERUP_DURATION;
    } else {
      this.activePowerups.push({ type, timeLeft: POWERUP_DURATION });
    }
  }

  canShoot() {
    return Date.now() - this.lastShotTime > this.shootCooldown;
  }

  shoot() {
    if (!this.canShoot()) return null;
    this.lastShotTime = Date.now();
    return { x: this.x, y: this.y };
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      w: this.width,
      h: this.height,
    };
  }

  hasPowerup(type) {
    return this.activePowerups.some(p => p.type === type);
  }

  takeDamage() {
    if (this.hasPowerup('shield')) {
      this.activePowerups = this.activePowerups.filter(p => p.type !== 'shield');
      return false;
    }
    this.lives--;
    return this.lives <= 0;
  }

  reset() {
    this.x = PLAYER.START_X;
    this.y = PLAYER.START_Y;
    this.activePowerups = [];
    this.health = 1;
  }
}
