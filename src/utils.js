export class Utils {
  static distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static rectCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.w &&
           rect1.x + rect1.w > rect2.x &&
           rect1.y < rect2.y + rect2.h &&
           rect1.y + rect1.h > rect2.y;
  }

  static circleCollision(circle1, circle2) {
    const dist = this.distance(circle1.x, circle1.y, circle2.x, circle2.y);
    return dist < circle1.r + circle2.r;
  }

  static circleRectCollision(circle, rect) {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
    const dist = this.distance(circle.x, circle.y, closestX, closestY);
    return dist < circle.r;
  }

  static randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  static randomInt(min, max) {
    return Math.floor(this.randomRange(min, max + 1));
  }

  static clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
}
