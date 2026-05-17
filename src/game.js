import { CANVAS, COLORS, SCORING, GAME, CENTIPEDE } from './constants.js';
import { Player } from './player.js';
import { Projectile } from './projectile.js';
import { Centipede } from './centipede.js';
import { MushroomManager } from './mushroom.js';
import { PowerupManager } from './powerup.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { Utils } from './utils.js';

export class Game {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.renderer = new Renderer(ctx);
    this.input = new InputHandler();

    this.gameState = 'menu'; // menu, levelStart, playing, gameOver
    this.level = 1;
    this.score = 0;
    this.player = new Player();
    this.projectiles = [];
    this.centipedes = [];
    this.mushroomManager = new MushroomManager();
    this.powerupManager = new PowerupManager();

    this.lastFrameTime = Date.now();
    this.deltaTime = 0;
    this.frameCount = 0;

    this.levelStartTime = 0;
    this.levelStartDuration = 2; // seconds

    this.restartFlag = false;
  }

  init() {
    // Initialize game
    this.spawnInitialCentipede();
  }

  spawnInitialCentipede() {
    const segmentCount = Math.min(12 + this.level * 2, 20);
    const startY = this.level === 1 ? 50 : 40; // Start higher on later levels
    const newCentipede = new Centipede(segmentCount, 50, startY);
    
    // Speed increases with level
    newCentipede.speed = CENTIPEDE.SPEED * Math.pow(GAME.DIFFICULTY_SCALE, this.level - 1);
    
    // Clamp speed for first level to be more forgiving
    if (this.level === 1) {
      newCentipede.speed = Math.max(newCentipede.speed, CENTIPEDE.SPEED);
    }
    
    this.centipedes.push(newCentipede);
  }

  start() {
    const gameLoop = () => {
      this.update();
      this.render();
      requestAnimationFrame(gameLoop);
    };
    requestAnimationFrame(gameLoop);
  }

  update() {
    const now = Date.now();
    this.deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    this.frameCount++;

    if (this.gameState === 'menu') {
      if (this.input.isShooting()) {
        this.gameState = 'levelStart';
        this.levelStartTime = now;
        this.input.keys[' '] = false;
      }
    } else if (this.gameState === 'levelStart') {
      const elapsed = (now - this.levelStartTime) / 1000;
      if (elapsed > this.levelStartDuration) {
        this.gameState = 'playing';
      }
    } else if (this.gameState === 'playing') {
      this.updatePlaying();
    } else if (this.gameState === 'gameOver') {
      if (this.input.isRestarting() || this.input.isShooting()) {
        this.reset();
        this.gameState = 'menu';
      }
    }
  }

  updatePlaying() {
    this.player.update(this.input);

    // Give player 1 second grace period at level start
    if (this.frameCount < 60) {
      this.player.invulnerable = true;
      this.player.invulnerabilityTime = 1;
    }

    // Shooting
    if (this.input.isShooting()) {
      const shootPos = this.player.shoot();
      if (shootPos) {
        this.projectiles.push(new Projectile(shootPos.x, shootPos.y, this.player.activePowerups));
        this.input.keys[' '] = false;
      }
    }

    // Update projectiles
    this.projectiles.forEach(p => p.update());
    this.projectiles = this.projectiles.filter(p => p.active);

    // Update centipedes
    this.centipedes.forEach(c => c.update());

    // Update mushrooms
    this.mushroomManager.update(this.centipedes);

    // Update powerups
    this.powerupManager.update();

    // Collision detection: projectiles vs centipede/mushroom
    for (let projIdx = this.projectiles.length - 1; projIdx >= 0; projIdx--) {
      const proj = this.projectiles[projIdx];
      const hitboxes = proj.getHitboxes();
      const explosionRadius = proj.getExplosionRadius();
      let projHit = false;

      // Reverse iterate centipedes
      for (let cIdx = this.centipedes.length - 1; cIdx >= 0; cIdx--) {
        const centipede = this.centipedes[cIdx];
        for (let segIdx = centipede.segments.length - 1; segIdx >= 0; segIdx--) {
          const segment = centipede.segments[segIdx];
          const segBounds = segment.getBounds();
          let hitSegment = false;

          // Check each hitbox against segment
          for (let hIdx = 0; hIdx < hitboxes.length; hIdx++) {
            if (Utils.rectCollision(hitboxes[hIdx], segBounds)) {
              hitSegment = true;
              hitboxes.splice(hIdx, 1);
              hIdx--;
            }
          }

          // Check explosion radius (if bomb)
          if (explosionRadius > 0) {
            const firstProj = proj.projectiles[0];
            if (firstProj && Utils.distance(firstProj.x, firstProj.y, segment.x, segment.y) < explosionRadius) {
              hitSegment = true;
            }
          }

          if (hitSegment) {
            if (segment.takeDamage(1)) {
              this.score += SCORING.CENTIPEDE_SEGMENT;
              this.powerupManager.spawnPowerup(segment.x, segment.y);
              centipede.removeSegment(segIdx);
              
              if (!centipede.isAlive()) {
                this.centipedes.splice(cIdx, 1);
              }
            }
            projHit = true;
          }
        }
      }

      // Also check projectile vs mushrooms
      for (let hIdx = hitboxes.length - 1; hIdx >= 0; hIdx--) {
        const hitbox = hitboxes[hIdx];
        for (let mushIdx = this.mushroomManager.mushrooms.length - 1; mushIdx >= 0; mushIdx--) {
          const mush = this.mushroomManager.mushrooms[mushIdx];
          if (Utils.rectCollision(hitbox, mush.getBounds())) {
            if (mush.takeDamage()) {
              this.score += SCORING.MUSHROOM;
              this.mushroomManager.removeAt(mushIdx);
            }
            hitboxes.splice(hIdx, 1);
            hIdx--;
            break;
          }
        }
      }

      // Check explosion radius against mushrooms
      if (explosionRadius > 0) {
        const firstProj = proj.projectiles[0];
        if (firstProj) {
          for (let mushIdx = this.mushroomManager.mushrooms.length - 1; mushIdx >= 0; mushIdx--) {
            const mush = this.mushroomManager.mushrooms[mushIdx];
            if (Utils.distance(firstProj.x, firstProj.y, mush.x, mush.y) < explosionRadius) {
              if (mush.takeDamage()) {
                this.score += SCORING.MUSHROOM;
                this.mushroomManager.removeAt(mushIdx);
              }
            }
          }
        }
      }

      // Remove projectile if no hitboxes left or hit something
      if (hitboxes.length === 0 || projHit) {
        this.projectiles.splice(projIdx, 1);
      }
    }

    // Collision detection: player vs centipede (with invulnerability)
    if (!this.player.invulnerable) {
      const playerBounds = this.player.getBounds();
      for (let cIdx = this.centipedes.length - 1; cIdx >= 0; cIdx--) {
        const centipede = this.centipedes[cIdx];
        for (let segIdx = centipede.segments.length - 1; segIdx >= 0; segIdx--) {
          const segment = centipede.segments[segIdx];
          if (Utils.rectCollision(playerBounds, segment.getBounds())) {
            if (this.player.takeDamage()) {
              this.gameState = 'gameOver';
            } else {
              // Set invulnerability for 2 seconds
              this.player.invulnerable = true;
              this.player.invulnerabilityTime = 2;
            }
            return; // Exit immediately
          }
        }
      }
    }

    // Update invulnerability timer
    if (this.player.invulnerable) {
      this.player.invulnerabilityTime -= 1 / 60;
      if (this.player.invulnerabilityTime <= 0) {
        this.player.invulnerable = false;
      }
    }

    // Collision detection: player vs powerup
    const playerBounds = this.player.getBounds();
    for (let idx = this.powerupManager.powerups.length - 1; idx >= 0; idx--) {
      const powerup = this.powerupManager.powerups[idx];
      if (Utils.rectCollision(playerBounds, powerup.getBounds())) {
        this.player.addPowerup(powerup.type);
        this.score += SCORING.POWERUP_COLLECT;
        this.powerupManager.removeAt(idx);
      }
    }

    // Win condition: all centipedes destroyed
    if (this.centipedes.length === 0) {
      this.nextLevel();
    }
  }

  checkLevelProgression() {
    // No more centipedes = level complete
  }

  nextLevel() {
    this.level++;
    
    // Level completion bonus
    const levelBonus = 500 * this.level;
    this.score += levelBonus;
    
    this.player.reset();
    this.projectiles = [];
    this.centipedes = [];
    this.mushroomManager = new MushroomManager();
    this.mushroomManager.spawnChance = 0.01 * this.level; // Slightly increase as level increases
    this.powerupManager = new PowerupManager();
    
    // Difficulty scaling
    const scaledSegments = Math.min(12 + this.level * 2, 20);
    const newCentipede = new Centipede(scaledSegments, 50, 30);
    
    // Speed increases with level (1.05x per level)
    newCentipede.speed = CENTIPEDE.SPEED * Math.pow(GAME.DIFFICULTY_SCALE, this.level - 1);
    
    this.centipedes.push(newCentipede);
  }

  reset() {
    this.level = 1;
    this.score = 0;
    this.player = new Player();
    this.projectiles = [];
    this.centipedes = [];
    this.mushroomManager = new MushroomManager();
    this.powerupManager = new PowerupManager();
    this.spawnInitialCentipede();
  }

  render() {
    this.renderer.clear();

    if (this.gameState === 'menu') {
      this.renderer.drawMenu();
    } else if (this.gameState === 'levelStart') {
      this.renderer.drawLevelStart(this.level);
    } else if (this.gameState === 'playing') {
      this.renderPlaying();
    } else if (this.gameState === 'gameOver') {
      this.renderPlaying();
      this.renderer.drawGameOver(this.score, this.level);
    }
  }

  renderPlaying() {
    // Draw player (with blinking if invulnerable)
    if (!this.player.invulnerable || Math.floor(this.player.invulnerabilityTime * 10) % 2 === 0) {
      const playerColor = this.player.invulnerable ? COLORS.NEON_YELLOW : COLORS.NEON_GREEN;
      this.renderer.drawPlayer(this.player.x, this.player.y, playerColor);
    }

    // Draw projectiles
    this.projectiles.forEach(proj => {
      proj.projectiles.forEach(p => {
        let color = COLORS.NEON_CYAN;
        if (p.type === 'laser') {
          color = COLORS.NEON_PURPLE;
          // Draw laser as a wider beam
          this.renderer.drawLineWithGlow(p.x - 3, p.y, p.x - 3, p.y + 15, color, 6);
          this.renderer.drawLineWithGlow(p.x + 3, p.y, p.x + 3, p.y + 15, color, 6);
        } else if (p.type === 'spread') {
          color = COLORS.NEON_PINK;
          this.renderer.drawProjectile(p.x, p.y, color);
        } else if (p.type === 'bomb') {
          color = COLORS.NEON_YELLOW;
          // Draw bomb as larger circle
          this.renderer.drawCircleWithGlow(p.x, p.y, 5, color);
          // Draw explosion radius indicator
          this.renderer.ctx.strokeStyle = `rgba(255, 255, 0, 0.2)`;
          this.renderer.ctx.lineWidth = 1;
          this.renderer.ctx.beginPath();
          this.renderer.ctx.arc(p.x, p.y, 40, 0, Math.PI * 2);
          this.renderer.ctx.stroke();
        } else {
          this.renderer.drawProjectile(p.x, p.y, color);
        }
      });
    });

    // Draw centipedes
    this.centipedes.forEach(centipede => {
      centipede.segments.forEach(segment => {
        this.renderer.drawCentipedeSegment(segment.x, segment.y, COLORS.NEON_GREEN);
      });
    });

    // Draw mushrooms
    this.mushroomManager.mushrooms.forEach(mushroom => {
      this.renderer.drawMushroom(mushroom.x, mushroom.y, COLORS.NEON_PINK);
    });

    // Draw powerups
    this.powerupManager.getActive().forEach(powerup => {
      this.renderer.drawPowerup(powerup.x, powerup.y, powerup.type, powerup.getColor());
    });

    // Draw HUD
    this.renderer.drawHUD(this.score, this.player.lives, this.level, this.player.activePowerups);
  }
}
