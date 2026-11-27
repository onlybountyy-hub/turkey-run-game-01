// Gobble Dash: Turkey Escape — every screen that is not the run itself:
// the title screen, the in-run HUD, and the CAUGHT / ESCAPED end screens.
// Buttons are rectangles in canvas space; hit-testing lives in main.js.
import { GAME_WIDTH, GAME_HEIGHT, ESCAPE_DISTANCE, PALETTE } from './config.js';

export const BUTTONS = {
  start: { x: GAME_WIDTH / 2 - 130, y: 396, w: 260, h: 56 },
  restart: { x: GAME_WIDTH / 2 - 130, y: 412, w: 260, h: 56 },
};

function panel(ctx, x, y, w, h, alpha = 0.88) {
  ctx.fillStyle = `rgba(43, 33, 24, ${alpha})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 243, 214, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function titleText(ctx, text, x, y, size, color, outline = true) {
  ctx.font = `900 ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(43, 33, 24, 0.9)';
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function bodyText(ctx, text, x, y, size, color = PALETTE.cream, align = 'center') {
  ctx.font = `700 ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function drawTitle(ctx, time, best) {
  ctx.fillStyle = 'rgba(29, 43, 83, 0.25)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  panel(ctx, GAME_WIDTH / 2 - 330, 56, 660, 320, 0.82);

  titleText(ctx, 'GOBBLE DASH', GAME_WIDTH / 2, 108, 62, '#ffd23f');
  titleText(ctx, '🦃  TURKEY ESCAPE  🦃', GAME_WIDTH / 2, 158, 24, '#ff9e5e', false);
  bodyText(ctx, 'Thanksgiving night. The farmer is coming with his carving knife.', GAME_WIDTH / 2, 200, 17);
  bodyText(ctx, 'Run 1500 m through the farmyard, the woods and the lane —', GAME_WIDTH / 2, 228, 17);
  bodyText(ctx, 'and do NOT end up on the dinner table.', GAME_WIDTH / 2, 252, 17);

  bodyText(ctx, '↑ / W / CLICK — jump      SPACE — flap (double jump)', GAME_WIDTH / 2, 292, 16, '#cfeefb');
  bodyText(ctx, '↓ / S — duck under low branches      P — pause      M — mute', GAME_WIDTH / 2, 318, 16, '#cfeefb');
  bodyText(ctx, '🌽 corn = points   🪶 feather = one free hit   🍂 cornucopia = +250', GAME_WIDTH / 2, 344, 16, '#ffd23f');
  bodyText(ctx, 'It gets harder as your score, distance and time grow — power-ups buy you a breather.', GAME_WIDTH / 2, 368, 13, 'rgba(255,243,214,0.65)');

  const pulse = 1 + Math.sin(time * 4) * 0.04;
  ctx.save();
  ctx.translate(GAME_WIDTH / 2, 424);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#e07b39';
  ctx.beginPath();
  ctx.roundRect(-130, -28, 260, 56, 14);
  ctx.fill();
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  bodyText(ctx, '▶  START THE ESCAPE', GAME_WIDTH / 2, 424, 22, '#fff');

  if (best > 0) {
    bodyText(ctx, `Best score so far: ${best.toLocaleString('en-US')}`, GAME_WIDTH / 2, 478, 16, '#ffd23f');
  }
  bodyText(ctx, 'An original game — art, music and sounds drawn & played by code.', GAME_WIDTH / 2, 508, 13, 'rgba(255,243,214,0.65)');
}

export function drawHud(ctx, game) {
  // Top bar.
  ctx.fillStyle = 'rgba(43, 33, 24, 0.55)';
  ctx.fillRect(0, 0, GAME_WIDTH, 64);

  bodyText(ctx, `SCORE ${game.score.toLocaleString('en-US')}`, 20, 22, 22, '#ffd23f', 'left');
  bodyText(ctx, `🌽 ${game.corn}`, 20, 48, 15, PALETTE.cream, 'left');

  // Distance progress: farmyard → woods → lane → freedom.
  const progress = Math.min(1, game.distance / ESCAPE_DISTANCE);
  const barX = 300;
  const barW = 360;
  ctx.fillStyle = 'rgba(255, 243, 214, 0.25)';
  ctx.beginPath();
  ctx.roundRect(barX, 18, barW, 14, 7);
  ctx.fill();
  ctx.fillStyle = '#7fb069';
  ctx.beginPath();
  ctx.roundRect(barX, 18, barW * progress, 14, 7);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(barX + barW * progress, 25, 8, 0, Math.PI * 2);
  ctx.fill();
  bodyText(ctx, `${Math.floor(game.distance)} m / ${ESCAPE_DISTANCE} m to freedom`, barX + barW / 2, 48, 14);

  // Difficulty level, rising with score + distance + time; a breather
  // after a power-up or milestone shows here so the easing is visible.
  bodyText(ctx, `LEVEL ${game.level || 1}/5`, 684, 22, 16, '#ff9e5e', 'left');
  if (game.breather > 0) {
    bodyText(ctx, '🍂 breather…', 684, 48, 14, '#7fb069', 'left');
  }

  // Lives as hearts.
  for (let i = 0; i < 3; i++) {
    const hx = GAME_WIDTH - 120 + i * 34;
    drawHeart(ctx, hx, 26, i < game.lives ? '#e63946' : 'rgba(255,255,255,0.25)');
  }
  if (game.shield) {
    bodyText(ctx, '🪶 SHIELD', GAME_WIDTH - 30, 52, 14, '#7db8ff', 'right');
  }

  // Farmer proximity warning.
  const danger = 1 - game.farmerGap / 210;
  if (danger > 0.45) {
    const flash = danger > 0.75 ? 0.5 + Math.sin(game.time * 10) * 0.5 : 1;
    ctx.globalAlpha = flash;
    bodyText(ctx, danger > 0.75 ? '⚠ THE FARMER IS RIGHT BEHIND YOU! ⚠' : 'The farmer is closing in…', GAME_WIDTH / 2, 88, 18, '#ff6b5e');
    ctx.globalAlpha = 1;
  }

  if (game.paused) {
    panel(ctx, GAME_WIDTH / 2 - 170, GAME_HEIGHT / 2 - 60, 340, 120, 0.9);
    titleText(ctx, 'PAUSED', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 18, 34, '#ffd23f');
    bodyText(ctx, 'Press P or click to keep running', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 24, 15);
  }
}

function drawHeart(ctx, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(-12, -4, -6, -12, 0, -5);
  ctx.bezierCurveTo(6, -12, 12, -4, 0, 8);
  ctx.fill();
  ctx.restore();
}

export function drawEnd(ctx, game, time) {
  const escaped = game.state === 'escaped';
  ctx.fillStyle = escaped ? 'rgba(31, 90, 46, 0.45)' : 'rgba(60, 10, 10, 0.5)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  panel(ctx, GAME_WIDTH / 2 - 320, 84, 640, 300, 0.9);

  titleText(ctx, escaped ? 'ESCAPED!' : 'CAUGHT!', GAME_WIDTH / 2, 140, 58, escaped ? '#8dff9e' : '#ff6b5e');
  bodyText(
    ctx,
    escaped
      ? 'You outran the farmer, the oven and the carving knife —'
      : 'The farmer caught up… and the oven was already warm.',
    GAME_WIDTH / 2,
    196,
    17,
  );
  bodyText(
    ctx,
    escaped ? 'free turkey, free Thanksgiving. Gobble gobble!' : 'Better luck next Thanksgiving, little turkey.',
    GAME_WIDTH / 2,
    222,
    17,
  );

  bodyText(ctx, `FINAL SCORE  ${game.score.toLocaleString('en-US')}`, GAME_WIDTH / 2, 272, 24, '#ffd23f');
  bodyText(ctx, `Distance ${Math.floor(game.distance)} m   •   Corn ${game.corn}   •   Best ${game.best.toLocaleString('en-US')}`, GAME_WIDTH / 2, 308, 16);
  if (game.score >= game.best && game.score > 0) {
    bodyText(ctx, '★ NEW BEST SCORE! ★', GAME_WIDTH / 2, 340, 17, '#ffd23f');
  }

  const pulse = 1 + Math.sin(time * 4) * 0.04;
  ctx.save();
  ctx.translate(GAME_WIDTH / 2, 440);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#e07b39';
  ctx.beginPath();
  ctx.roundRect(-130, -28, 260, 56, 14);
  ctx.fill();
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  bodyText(ctx, '↻  RUN AGAIN  (R)', GAME_WIDTH / 2, 440, 22, '#fff');
  bodyText(ctx, 'Click the button or press R — Space also restarts', GAME_WIDTH / 2, 486, 13, 'rgba(255,243,214,0.65)');
}

export function pointInButton(point, button) {
  return (
    point.x >= button.x &&
    point.x <= button.x + button.w &&
    point.y >= button.y &&
    point.y <= button.y + button.h
  );
}
