export class InputHandler {
  constructor() {
    this.keys = {};
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
      e.preventDefault();
    });
  }

  isKeyPressed(key) {
    return this.keys[key] || false;
  }

  isMovingLeft() {
    return this.isKeyPressed('ArrowLeft');
  }

  isMovingRight() {
    return this.isKeyPressed('ArrowRight');
  }

  isShooting() {
    return this.isKeyPressed(' ');
  }

  isRestarting() {
    return this.isKeyPressed('r') || this.isKeyPressed('R');
  }

  isPausing() {
    return this.isKeyPressed('Escape') || this.isKeyPressed('p') || this.isKeyPressed('P');
  }
}
