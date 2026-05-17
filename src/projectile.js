import { PROJECTILE, POWERUP_TYPES } from './constants.js';

export class Projectile {
  constructor(x, y, activePowerups = []) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = -PROJECTILE.SPEED;
    this.active = true;
    this.activePowerups = activePowerups;
    this.damage = 1;
    this.projectiles = []; // for multishot/spread
    
    this.initializeProjectiles();
  }

  initializeProjectiles() {
    this.projectiles = [];
    const hasMultishot = this.activePowerups.some(p => p.type === POWERUP_TYPES.MULTISHOT);
    const hasSpread = this.activePowerups.some(p => p.type === POWERUP_TYPES.SPREAD);
    const hasLaser = this.activePowerups.some(p => p.type === POWERUP_TYPES.LASER);
    const hasBomb = this.activePowerups.some(p => p.type === POWERUP_TYPES.BOMB);

    if (hasLaser) {
      this.projectiles.push({
        x: this.x,
        y: this.y,
        vx: 0,
        vy: -PROJECTILE.SPEED * 1.5,
        type: 'laser',
        damage: 2,
      });
    } else if (hasSpread) {
      const spreadAngles = [-20, -10, 0, 10, 20];
      spreadAngles.forEach(angle => {
        const rad = (angle * Math.PI) / 180;
        this.projectiles.push({
          x: this.x,
          y: this.y,
          vx: Math.sin(rad) * 3,
          vy: -Math.cos(rad) * PROJECTILE.SPEED,
          type: 'spread',
          damage: 1,
        });
      });
    } else if (hasMultishot) {
      this.projectiles.push(
        { x: this.x - 8, y: this.y, vx: 0, vy: -PROJECTILE.SPEED, type: 'normal', damage: 1 },
        { x: this.x, y: this.y, vx: 0, vy: -PROJECTILE.SPEED, type: 'normal', damage: 1 },
        { x: this.x + 8, y: this.y, vx: 0, vy: -PROJECTILE.SPEED, type: 'normal', damage: 1 }
      );
    } else {
      this.projectiles.push({
        x: this.x,
        y: this.y,
        vx: 0,
        vy: -PROJECTILE.SPEED,
        type: hasBomb ? 'bomb' : 'normal',
        damage: hasBomb ? 3 : 1,
      });
    }
  }

  getExplosionRadius() {
    return this.activePowerups.some(p => p.type === POWERUP_TYPES.BOMB) ? 40 : 0;
  }

  update() {
    this.projectiles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
    });

    // Remove off-screen projectiles
    this.projectiles = this.projectiles.filter(p => p.y > -10 && p.y < 610);
    
    if (this.projectiles.length === 0) {
      this.active = false;
    }
  }

  hasLaser() {
    return this.activePowerups.some(p => p.type === POWERUP_TYPES.LASER);
  }

  hasBomb() {
    return this.activePowerups.some(p => p.type === POWERUP_TYPES.BOMB);
  }

  getHitboxes() {
    return this.projectiles.map(p => ({
      x: p.x - 2,
      y: p.y - 4,
      w: 4,
      h: 8,
    }));
  }
}
