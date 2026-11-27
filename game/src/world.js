// Gobble Dash: Turkey Escape — the scrolling world: sky, hills, barn,
// trees, fences and farmhouse props, recoloured per stage. Pure canvas,
// no images.
import { GAME_WIDTH, GAME_HEIGHT, GROUND_Y, PALETTE, stageFor } from './config.js';

export class World {
  constructor(random) {
    this.random = random;
    this.scroll = 0;
    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        x: random() * GAME_WIDTH,
        y: 40 + random() * 110,
        scale: 0.7 + random() * 0.9,
        speed: 8 + random() * 14,
      });
    }
    this.hayBales = [];
    this.pumpkins = [];
    for (let i = 0; i < 14; i++) {
      this.hayBales.push(300 + i * 340 + random() * 120);
      this.pumpkins.push(520 + i * 420 + random() * 160);
    }
  }

  update(dt, speed) {
    this.scroll += speed * dt;
    for (const cloud of this.clouds) {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -120) {
        cloud.x = GAME_WIDTH + 80;
        cloud.y = 40 + this.random() * 110;
      }
    }
  }

  draw(ctx, distance, time) {
    const stage = stageFor(distance);
    const sky = PALETTE[stage.sky];
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, sky[0]);
    gradient.addColorStop(1, sky[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Sun by day, moon by night.
    if (stage.name === 'Farmyard') {
      ctx.fillStyle = '#ffd93d';
      ctx.beginPath();
      ctx.arc(830, 80, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 217, 61, 0.3)';
      ctx.beginPath();
      ctx.arc(830, 80, 48, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#f4f1de';
      ctx.beginPath();
      ctx.arc(830, 80, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sky[0];
      ctx.beginPath();
      ctx.arc(820, 72, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 14; i++) {
        const sx = (i * 137) % GAME_WIDTH;
        const sy = 30 + ((i * 53) % 130);
        ctx.globalAlpha = 0.5 + ((i * 7) % 5) / 10;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    // Clouds.
    ctx.fillStyle = stage.name === 'Farmhouse Lane' ? 'rgba(220, 210, 240, 0.5)' : 'rgba(255, 255, 255, 0.85)';
    for (const cloud of this.clouds) {
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, 42 * cloud.scale, 16 * cloud.scale, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x + 26 * cloud.scale, cloud.y + 4, 30 * cloud.scale, 13 * cloud.scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rolling hills, two parallax layers.
    this.drawHills(ctx, stage, 0.25, 330, PALETTE[stage.hill]);
    this.drawHills(ctx, stage, 0.5, 380, shade(PALETTE[stage.hill], -18));

    // Stage props: the red barn early, pines mid-run, the farmhouse late.
    if (stage.name === 'Farmyard') this.drawBarn(ctx);
    if (stage.name === 'Autumn Woods') this.drawPines(ctx);
    if (stage.name === 'Farmhouse Lane') this.drawFarmhouse(ctx, time);

    // Ground: dirt path with grassy edges and scrolling texture.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, GROUND_Y + 14, GAME_WIDTH, GAME_HEIGHT - GROUND_Y - 14);
    ctx.fillStyle = PALETTE.groundDark;
    const dashOffset = this.scroll % 90;
    for (let x = -dashOffset; x < GAME_WIDTH; x += 90) {
      ctx.fillRect(x, GROUND_Y + 34, 44, 5);
      ctx.fillRect(x + 20, GROUND_Y + 78, 30, 4);
    }
    // Grass tufts and props scrolling with the world.
    ctx.strokeStyle = '#4e7a35';
    ctx.lineWidth = 2;
    for (let x = -(this.scroll % 140); x < GAME_WIDTH; x += 140) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 6);
      ctx.lineTo(x - 4, GROUND_Y - 4);
      ctx.moveTo(x + 6, GROUND_Y + 6);
      ctx.lineTo(x + 10, GROUND_Y - 5);
      ctx.stroke();
    }
    for (const baleX of this.hayBales) {
      const x = wrapX(baleX - this.scroll * 0.9, GAME_WIDTH + 200) - 100;
      ctx.fillStyle = '#d9a441';
      ctx.beginPath();
      ctx.arc(x, GROUND_Y - 12, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a9713a';
      ctx.beginPath();
      ctx.arc(x, GROUND_Y - 12, 13, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const pumpX of this.pumpkins) {
      const x = wrapX(pumpX - this.scroll * 0.9, GAME_WIDTH + 200) - 100;
      ctx.fillStyle = '#e07b39';
      ctx.beginPath();
      ctx.ellipse(x, GROUND_Y - 8, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6da34a';
      ctx.fillRect(x - 2, GROUND_Y - 20, 4, 8);
    }
  }

  drawHills(ctx, stage, parallax, baseY, color) {
    const offset = (this.scroll * parallax) % 480;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-480, GAME_HEIGHT);
    for (let x = -480 - offset; x < GAME_WIDTH + 480; x += 240) {
      ctx.quadraticCurveTo(x + 120, baseY - 46, x + 240, baseY);
    }
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  drawBarn(ctx) {
    const x = wrapX(700 - this.scroll * 0.35, GAME_WIDTH + 500) - 250;
    ctx.fillStyle = '#b3402f';
    ctx.fillRect(x, 250, 150, 130);
    ctx.beginPath();
    ctx.moveTo(x - 12, 250);
    ctx.lineTo(x + 75, 196);
    ctx.lineTo(x + 162, 250);
    ctx.closePath();
    ctx.fillStyle = '#8a2f22';
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    ctx.fillRect(x + 55, 300, 40, 80);
    ctx.strokeStyle = '#8a2f22';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 55, 300);
    ctx.lineTo(x + 95, 380);
    ctx.moveTo(x + 95, 300);
    ctx.lineTo(x + 55, 380);
    ctx.stroke();
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(x + 18, 268, 22, 22);
    ctx.fillRect(x + 110, 268, 22, 22);
  }

  drawPines(ctx) {
    for (let i = 0; i < 5; i++) {
      const x = wrapX(i * 260 + 80 - this.scroll * 0.45, GAME_WIDTH + 300) - 150;
      const h = 120 + (i % 3) * 26;
      ctx.fillStyle = '#5d3413';
      ctx.fillRect(x - 5, 380 - 20, 10, 22);
      ctx.fillStyle = i % 2 ? '#3f6b2f' : '#e07b39';
      for (let tier = 0; tier < 3; tier++) {
        const w = 70 - tier * 18;
        const y = 380 - 20 - tier * (h / 3.4);
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y);
        ctx.lineTo(x, y - h / 3);
        ctx.lineTo(x + w / 2, y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  drawFarmhouse(ctx, time) {
    const x = wrapX(760 - this.scroll * 0.35, GAME_WIDTH + 520) - 260;
    ctx.fillStyle = '#f4ead8';
    ctx.fillRect(x, 270, 170, 112);
    ctx.fillStyle = '#7b4b2a';
    ctx.beginPath();
    ctx.moveTo(x - 14, 270);
    ctx.lineTo(x + 85, 216);
    ctx.lineTo(x + 184, 270);
    ctx.closePath();
    ctx.fill();
    const lit = 0.6 + Math.sin(time * 2) * 0.25;
    ctx.fillStyle = `rgba(255, 200, 80, ${lit})`;
    ctx.fillRect(x + 24, 296, 30, 34);
    ctx.fillRect(x + 116, 296, 30, 34);
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(x + 72, 312, 28, 70);
    ctx.fillStyle = '#e07b39';
    ctx.beginPath();
    ctx.ellipse(x + 190, 372, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function wrapX(value, span) {
  return ((value % span) + span) % span;
}

function shade(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}
