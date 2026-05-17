import { CANVAS, COLORS } from './constants.js';

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  clear() {
    this.ctx.fillStyle = COLORS.DARK_BG;
    this.ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
    this.drawGrid();
  }

  drawGrid() {
    this.ctx.strokeStyle = COLORS.GRID_COLOR;
    this.ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < CANVAS.WIDTH; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, CANVAS.HEIGHT);
      this.ctx.stroke();
    }
    for (let y = 0; y < CANVAS.HEIGHT; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(CANVAS.WIDTH, y);
      this.ctx.stroke();
    }
  }

  drawRectWithGlow(x, y, w, h, color) {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
    this.ctx.shadowBlur = 0;
  }

  drawCircleWithGlow(x, y, r, color) {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  drawLineWithGlow(x1, y1, x2, y2, color, width = 2) {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  drawText(text, x, y, color, size = 16, align = 'left') {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = color;
    this.ctx.font = `bold ${size}px 'Courier New'`;
    this.ctx.textAlign = align;
    this.ctx.fillText(text, x, y);
    this.ctx.shadowBlur = 0;
  }

  drawHUD(score, lives, level, activePowerups) {
    this.drawText(`SCORE: ${score}`, 20, 30, COLORS.NEON_CYAN, 14);
    this.drawText(`LIVES: ${lives}`, 20, 60, COLORS.NEON_GREEN, 14);
    this.drawText(`LEVEL: ${level}`, CANVAS.WIDTH - 150, 30, COLORS.NEON_PINK, 14);

    let powerupText = 'POWER: ';
    if (activePowerups.length > 0) {
      powerupText += activePowerups.map(p => `${p.type}(${Math.floor(p.timeLeft)}s)`).join(' + ');
    } else {
      powerupText += 'NONE';
    }
    this.drawText(powerupText, CANVAS.WIDTH - 400, 60, COLORS.NEON_YELLOW, 12);
  }

  drawLevelComplete(level) {
    this.ctx.fillStyle = 'rgba(10, 14, 39, 0.7)';
    this.ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
    
    this.drawText('LEVEL COMPLETE!', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 40, COLORS.NEON_GREEN, 32, 'center');
    this.drawText(`Next: LEVEL ${level}`, CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 20, COLORS.NEON_CYAN, 24, 'center');
  }

  drawLevelStart(level) {
    this.ctx.fillStyle = 'rgba(10, 14, 39, 0.9)';
    this.ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
    this.drawGrid();
    
    this.drawText('LEVEL ' + level, CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 40, COLORS.NEON_PINK, 48, 'center');
    
    const difficulty = level === 1 ? 'NOVICE' : level < 5 ? 'INTERMEDIATE' : 'EXPERT';
    this.drawText(difficulty, CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 20, COLORS.NEON_YELLOW, 20, 'center');
    
    this.drawText('Get Ready!', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 80, COLORS.NEON_GREEN, 16, 'center');
  }

  drawPlayer(x, y, color) {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - 15);
    this.ctx.lineTo(x - 12, y + 15);
    this.ctx.lineTo(x + 12, y + 15);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  drawProjectile(x, y, color) {
    this.drawLineWithGlow(x, y, x, y + 8, color, 2);
  }

  drawCentipedeSegment(x, y, color) {
    this.drawCircleWithGlow(x, y, 10, color);
  }

  drawMushroom(x, y, color) {
    this.drawCircleWithGlow(x, y, 6, color);
  }

  drawPowerup(x, y, type, color) {
    this.drawRectWithGlow(x - 7, y - 7, 14, 14, color);
    const label = type[0].toUpperCase();
    this.ctx.fillStyle = '#0a0e27';
    this.ctx.font = 'bold 10px Courier New';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, x, y);
  }

  drawMenu() {
    this.ctx.fillStyle = COLORS.DARK_BG;
    this.ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
    this.drawGrid();
    this.drawText('CENTIPEDE', CANVAS.WIDTH / 2, 80, COLORS.NEON_CYAN, 48, 'center');
    this.drawText('80\'s ARCADE EDITION', CANVAS.WIDTH / 2, 140, COLORS.NEON_PINK, 24, 'center');
    this.drawText('Arrow Keys - Move', CANVAS.WIDTH / 2, 240, COLORS.NEON_GREEN, 14, 'center');
    this.drawText('Space - Shoot', CANVAS.WIDTH / 2, 270, COLORS.NEON_GREEN, 14, 'center');
    this.drawText('Catch powerups for special abilities!', CANVAS.WIDTH / 2, 330, COLORS.NEON_YELLOW, 12, 'center');
    this.drawText('Press SPACE to Start', CANVAS.WIDTH / 2, CANVAS.HEIGHT - 100, COLORS.NEON_CYAN, 16, 'center');
  }
}
