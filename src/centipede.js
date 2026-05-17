import { CENTIPEDE, CANVAS } from './constants.js';

export class CentipedeSegment {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.health = 1;
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

export class Centipede {
  constructor(length = CENTIPEDE.INITIAL_LENGTH, startX = 50, startY = 30) {
    this.segments = [];
    this.waveDirection = 1; // 1 for right, -1 for left
    this.waveX = 0;
    this.speed = CENTIPEDE.SPEED;
    this.waveWidth = CENTIPEDE.WAVE_WIDTH;

    for (let i = 0; i < length; i++) {
      this.segments.push(new CentipedeSegment(startX + i * 20, startY));
    }
  }

  update() {
    this.waveX += this.speed * this.waveDirection;

    // Check if wave should reverse
    if (this.waveX > this.waveWidth * 20 || this.waveX < -this.waveWidth * 20) {
      this.waveDirection *= -1;
      this.segments.forEach(seg => (seg.y += CENTIPEDE.DESCENT_SPEED));
    }

    // Update segment positions
    this.segments.forEach((seg, i) => {
      const baseX = 50 + i * 20;
      seg.x = baseX + this.waveX;
      // Keep within bounds
      seg.x = Math.max(10, Math.min(CANVAS.WIDTH - 10, seg.x));
    });
  }

  getSegmentsBelow(index) {
    return this.segments.slice(index + 1);
  }

  removeSegment(index) {
    this.segments.splice(index, 1);
  }

  getBottomY() {
    return Math.max(...this.segments.map(seg => seg.y));
  }

  isAlive() {
    return this.segments.length > 0;
  }
}
