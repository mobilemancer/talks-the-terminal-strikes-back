import { MUSHROOM, CANVAS } from './constants.js';
import { Utils } from './utils.js';

export class Mushroom {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = MUSHROOM.SIZE;
    this.health = MUSHROOM.HEALTH;
  }

  getBounds() {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      w: this.radius * 2,
      h: this.radius * 2,
    };
  }

  takeDamage(amount = 1) {
    this.health -= amount;
    return this.health <= 0;
  }
}

export class MushroomManager {
  constructor() {
    this.mushrooms = [];
    this.spawnChance = 0.01; // 1% chance per frame (will scale with level)
    this.maxMushrooms = 8; // Limit mushroom count
  }

  spawnMushroom(x, y) {
    // Don't spawn if max reached
    if (this.mushrooms.length >= this.maxMushrooms) {
      return;
    }
    
    if (x < 20 || x > CANVAS.WIDTH - 20 || y < 80 || y > CANVAS.HEIGHT - 100) {
      return;
    }
    // Check if mushroom already exists nearby
    const tooClose = this.mushrooms.some(
      m => Utils.distance(m.x, m.y, x, y) < 30
    );
    if (!tooClose) {
      this.mushrooms.push(new Mushroom(x, y));
    }
  }

  update(centipedes) {
    // Chance to spawn mushrooms randomly
    if (Math.random() < this.spawnChance && this.mushrooms.length < this.maxMushrooms) {
      const randomX = Utils.randomInt(30, CANVAS.WIDTH - 30);
      const randomY = Utils.randomInt(100, 450);
      this.spawnMushroom(randomX, randomY);
    }

    // Also spawn from centipede areas periodically
    centipedes.forEach(centipede => {
      if (centipede.segments.length > 0 && this.mushrooms.length < this.maxMushrooms) {
        const segment = centipede.segments[Math.floor(Math.random() * centipede.segments.length)];
        if (Math.random() < 0.001) {
          this.spawnMushroom(
            segment.x + Utils.randomRange(-20, 20),
            segment.y + Utils.randomRange(-20, 20)
          );
        }
      }
    });
  }

  removeAt(index) {
    this.mushrooms.splice(index, 1);
  }
}
