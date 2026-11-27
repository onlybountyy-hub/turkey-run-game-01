// Gobble Dash: Turkey Escape — obstacles, corn and power-ups.
// Spawning, movement, drawing and collision all live here; the game loop
// only asks for spawnObstacles, update, draw and checkCollisions.
//
// Difficulty is dynamic: a pressure value blends score + distance + time
// (see difficultyPressure), and the spawn interval, double-pattern chance
// and obstacle mix all scale with it. After a power-up grab or a distance
// milestone the field grants a short breather (cooldown) with a slower
// spawn rate and no double patterns. A fairness floor keeps consecutive
// patterns at least MIN_PATTERN_GAP_PX apart, so no spawn is unavoidable.
import { GROUND_Y, ESCAPE_DISTANCE, CORN_POINTS, CORNUCOPIA_POINTS, DIFFICULTY, PALETTE } from './config.js';

export const OBSTACLE_TYPES = {
  fence: { w: 46, h: 52, y: GROUND_Y - 52 },
  oven: { w: 64, h: 84, y: GROUND_Y - 84 },
  knife: { w: 58, h: 46, y: GROUND_Y - 46 },
  dog: { w: 56, h: 34, y: GROUND_Y - 34 },
  hay: { w: 96, h: 40, y: GROUND_Y - 40 },
  pumpkin: { w: 52, h: 48, y: GROUND_Y - 48 },
};

export class ObstacleField {
  constructor(random) {
    this.random = random;
    this.obstacles = [];
    this.corns = [];
    this.powerups = [];
    this.spawnTimer = 1.1;
    this.timeSinceStart = 0;
    // Dynamic difficulty state.
    this.pressure = 0; // 0..1, blends score + distance + time
    this.breather = 0; // seconds of cooldown remaining (0 = full pressure)
    this.breatherCause = '';
    this.lastMilestone = 0; // last 250 m milestone already granted
    this.stats = { patterns: 0, cooldowns: 0, kinds: {} };
  }

  reset() {
    this.obstacles = [];
    this.corns = [];
    this.powerups = [];
    this.spawnTimer = 1.1;
    this.timeSinceStart = 0;
    this.pressure = 0;
    this.breather = 0;
    this.breatherCause = '';
    this.lastMilestone = 0;
    this.stats = { patterns: 0, cooldowns: 0, kinds: {} };
  }

  // Composite difficulty: 40% distance, 30% score, 30% time. Each axis
  // saturates at its reference value so no single axis can max the game
  // out on its own; the three together reach pressure 1 near the escape.
  difficultyPressure(score, distance, time) {
    const d = Math.min(1, distance / ESCAPE_DISTANCE);
    const s = Math.min(1, Math.max(0, score) / DIFFICULTY.SCORE_REF);
    const t = Math.min(1, Math.max(0, time) / DIFFICULTY.TIME_REF);
    return Math.min(1, 0.4 * d + 0.3 * s + 0.3 * t);
  }

  // HUD level 1..5, derived from pressure.
  difficultyLevel() {
    return 1 + Math.floor(this.pressure * 4.999);
  }

  // Seconds until the next spawn pattern at the given pressure and speed.
  nextInterval(pressure, speed) {
    let interval =
      DIFFICULTY.BASE_INTERVAL - (DIFFICULTY.BASE_INTERVAL - DIFFICULTY.MIN_INTERVAL) * pressure;
    if (this.breather > 0) interval *= DIFFICULTY.BREATHER_INTERVAL_MULT;
    interval *= 0.85 + this.random() * 0.4;
    // Fairness floor: never let two patterns start closer than one jump's
    // worth of ground apart, whatever the speed.
    return Math.max(interval, DIFFICULTY.MIN_PATTERN_GAP_PX / Math.max(1, speed));
  }

  doubleChance(pressure) {
    if (this.breather > 0) return 0; // no double patterns during a breather
    return DIFFICULTY.DOUBLE_BASE + (DIFFICULTY.DOUBLE_MAX - DIFFICULTY.DOUBLE_BASE) * pressure;
  }

  // Called by the game when the turkey grabs a power-up: a few seconds of
  // easier spawns as a reward for the pickup.
  notifyPowerup(kind) {
    this.breather = Math.max(this.breather, DIFFICULTY.POWERUP_COOLDOWN);
    this.breatherCause = `power-up ${kind}`;
    this.stats.cooldowns += 1;
  }

  pickObstacleKind(distance, pressure = 0, allowPumpkin = true) {
    const roll = this.random();
    if (distance < 150) return 'fence';
    // Weights shift with pressure: ovens and pumpkins crowd out fences,
    // and the two new kinds only join once the run has warmed up.
    const wFence = 0.3 - 0.1 * pressure;
    const wKnife = 0.25;
    const wDog = 0.2;
    const wOven = 0.15 + 0.1 * pressure;
    const wHay = distance >= DIFFICULTY.HAY_UNLOCK ? 0.1 : 0;
    const wPumpkin =
      distance >= DIFFICULTY.PUMPKIN_UNLOCK && allowPumpkin ? 0.1 + 0.05 * pressure : 0;
    const total = wFence + wKnife + wDog + wOven + wHay + wPumpkin;
    let r = roll * total;
    if ((r -= wFence) < 0) return 'fence';
    if ((r -= wKnife) < 0) return 'knife';
    if ((r -= wDog) < 0) return 'dog';
    if ((r -= wOven) < 0) return 'oven';
    if ((r -= wHay) < 0) return 'hay';
    return 'pumpkin';
  }

  spawnObstacle(kind, x, pressure) {
    const def = OBSTACLE_TYPES[kind];
    const ob = { kind, x, y: def.y, w: def.w, h: def.h, spin: 0, bob: this.random() * Math.PI * 2 };
    if (kind === 'pumpkin') {
      // Rolling pumpkins chase the turkey: extra leftward speed on top of
      // the scroll, faster as pressure rises.
      ob.vx = 60 + 120 * pressure;
      ob.roll = 0;
    }
    this.obstacles.push(ob);
    this.stats.kinds[kind] = (this.stats.kinds[kind] || 0) + 1;
  }

  spawnPattern(distance, speed, score, time) {
    const pressure = this.difficultyPressure(score, distance, time);
    this.pressure = pressure;
    this.spawnObstacle(this.pickObstacleKind(distance, pressure), 1000, pressure);
    this.stats.patterns += 1;

    // Sometimes a second obstacle trails the first with a jumpable gap.
    // Never a pumpkin in the trailer slot: its extra speed would let it
    // catch the leader and close the landing gap.
    if (distance > 350 && this.random() < this.doubleChance(pressure)) {
      const kind2 = this.pickObstacleKind(distance, pressure, false);
      this.spawnObstacle(kind2, 1000 + 190 + this.random() * 70, pressure);
    }

    // Corn arcs reward the jump over an obstacle; flat lines reward staying low.
    if (this.random() < 0.72) {
      const arc = this.random() < 0.5;
      const count = 4 + Math.floor(this.random() * 3);
      for (let i = 0; i < count; i++) {
        const cx = 1000 + 30 + i * 34;
        const cy = arc ? GROUND_Y - 150 + Math.abs(i - (count - 1) / 2) * 26 : GROUND_Y - 46;
        this.corns.push({ x: cx, y: cy, taken: false, phase: this.random() * Math.PI * 2 });
      }
    }

    // Rare power-ups: a feather shield, or a cornucopia worth big points.
    if (distance > 250 && this.random() < 0.1) {
      const kind = this.random() < 0.6 ? 'shield' : 'cornucopia';
      this.powerups.push({ kind, x: 1000 + 90, y: GROUND_Y - 130, taken: false, phase: 0 });
    }
  }

  update(dt, speed, distance, score = 0, time = 0) {
    this.timeSinceStart += dt;
    // Milestone breather: every 250 m the farmer hangs back a little and
    // the spawn rate eases off for a few seconds.
    const milestone = Math.floor(distance / DIFFICULTY.MILESTONE_EVERY);
    if (milestone > this.lastMilestone) {
      this.lastMilestone = milestone;
      this.breather = Math.max(this.breather, DIFFICULTY.MILESTONE_COOLDOWN);
      this.breatherCause = `milestone ${milestone * DIFFICULTY.MILESTONE_EVERY}m`;
      this.stats.cooldowns += 1;
    }
    if (this.breather > 0) this.breather -= dt;
    this.pressure = this.difficultyPressure(score, distance, time);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnPattern(distance, speed, score, time);
      this.spawnTimer = this.nextInterval(this.pressure, speed);
    }
    const move = speed * dt;
    for (const ob of this.obstacles) {
      let step = move;
      if (ob.kind === 'pumpkin') {
        step += (ob.vx || 0) * dt;
        ob.roll = (ob.roll || 0) + dt * 7;
      }
      ob.x -= step;
      ob.spin += dt * 7;
      ob.bob += dt * 3;
    }
    for (const corn of this.corns) {
      corn.x -= move;
      corn.phase += dt * 5;
    }
    for (const power of this.powerups) {
      power.x -= move;
      power.phase += dt * 4;
    }
    this.obstacles = this.obstacles.filter((ob) => ob.x > -120);
    this.corns = this.corns.filter((corn) => !corn.taken && corn.x > -40);
    this.powerups = this.powerups.filter((power) => !power.taken && power.x > -60);
  }

  // Returns { hits, corn, powerups } for this frame; the game applies them.
  checkCollisions(turkeyBox, invulnerable) {
    const result = { hits: 0, corn: 0, powerups: [] };
    for (const corn of this.corns) {
      if (!corn.taken && overlaps(turkeyBox, { x: corn.x - 12, y: corn.y - 12, w: 24, h: 24 })) {
        corn.taken = true;
        result.corn += 1;
      }
    }
    for (const power of this.powerups) {
      if (!power.taken && overlaps(turkeyBox, { x: power.x - 18, y: power.y - 18, w: 36, h: 36 })) {
        power.taken = true;
        result.powerups.push(power.kind);
      }
    }
    if (!invulnerable) {
      for (const ob of this.obstacles) {
        const box = obstacleBox(ob);
        if (overlaps(turkeyBox, box)) {
          result.hits += 1;
          result.hitObstacle = { kind: ob.kind, x: ob.x, turkeyBox: { ...turkeyBox } };
          ob.x = -9999; // consume the obstacle so one hit is one hit
          break;
        }
      }
    }
    return result;
  }

  draw(ctx, time) {
    for (const corn of this.corns) this.drawCorn(ctx, corn);
    for (const power of this.powerups) this.drawPowerup(ctx, power);
    for (const ob of this.obstacles) this.drawObstacle(ctx, ob, time);
  }

  drawCorn(ctx, corn) {
    const bob = Math.sin(corn.phase) * 3;
    ctx.save();
    ctx.translate(corn.x, corn.y + bob);
    ctx.fillStyle = PALETTE.corn;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8a91c';
    for (let row = -1; row <= 1; row++) {
      for (let col = -1; col <= 1; col++) {
        ctx.beginPath();
        ctx.arc(col * 4, row * 6, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#6da34a';
    ctx.beginPath();
    ctx.moveTo(-9, 8);
    ctx.lineTo(-13, 16);
    ctx.lineTo(-4, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawPowerup(ctx, power) {
    const bob = Math.sin(power.phase) * 5;
    ctx.save();
    ctx.translate(power.x, power.y + bob);
    if (power.kind === 'shield') {
      ctx.fillStyle = 'rgba(120, 180, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7db8ff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 16, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(-2, -4, 2.5, 8, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Cornucopia: a horn spilling autumn fruit.
      ctx.fillStyle = '#c98a3a';
      ctx.beginPath();
      ctx.moveTo(-16, 8);
      ctx.quadraticCurveTo(0, -14, 18, 2);
      ctx.quadraticCurveTo(4, 14, -16, 8);
      ctx.fill();
      ctx.fillStyle = '#8a5a28';
      ctx.fillRect(-16, 4, 5, 8);
      const fruits = ['#d43d2a', '#f2a541', '#7fb069'];
      fruits.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(-10 + i * 9, -4 - (i % 2) * 5, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();
  }

  drawObstacle(ctx, ob, time) {
    ctx.save();
    if (ob.kind === 'fence') {
      ctx.fillStyle = '#8a5a28';
      ctx.fillRect(ob.x, ob.y, 6, ob.h);
      ctx.fillRect(ob.x + ob.w - 6, ob.y, 6, ob.h);
      ctx.fillStyle = '#a9713a';
      ctx.fillRect(ob.x - 2, ob.y + 8, ob.w + 4, 9);
      ctx.fillRect(ob.x - 2, ob.y + 30, ob.w + 4, 9);
      ctx.fillStyle = '#6b4423';
      ctx.fillRect(ob.x - 2, ob.y + 8, ob.w + 4, 3);
    } else if (ob.kind === 'oven') {
      const glow = 0.5 + Math.sin(time * 6 + ob.bob) * 0.25;
      ctx.fillStyle = PALETTE.oven;
      ctx.beginPath();
      ctx.roundRect(ob.x, ob.y, ob.w, ob.h, 6);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 120, 30, ${glow})`;
      ctx.beginPath();
      ctx.roundRect(ob.x + 10, ob.y + 14, ob.w - 20, 30, 4);
      ctx.fill();
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.ellipse(ob.x + ob.w / 2, ob.y + 30, 10, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dfe6ee';
      ctx.fillRect(ob.x + 8, ob.y + 52, ob.w - 16, 5);
      ctx.fillStyle = '#5a5a66';
      ctx.fillRect(ob.x + 6, ob.y + ob.h - 10, ob.w - 12, 6);
      // A little chimney puffing smoke.
      ctx.fillStyle = 'rgba(220, 220, 220, 0.7)';
      const puff = (Math.sin(time * 2 + ob.bob) + 1) / 2;
      ctx.beginPath();
      ctx.arc(ob.x + 12, ob.y - 10 - puff * 12, 5 + puff * 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (ob.kind === 'knife') {
      ctx.translate(ob.x + ob.w / 2, ob.y + ob.h / 2);
      ctx.rotate(Math.sin(ob.spin) * 0.5);
      ctx.fillStyle = PALETTE.knifeBlade;
      ctx.beginPath();
      ctx.moveTo(-28, -6);
      ctx.lineTo(14, -12);
      ctx.lineTo(28, 0);
      ctx.lineTo(14, 12);
      ctx.lineTo(-28, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-20, -4);
      ctx.lineTo(10, -8);
      ctx.lineTo(10, -2);
      ctx.lineTo(-20, 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3b2f2f';
      ctx.fillRect(-38, -7, 12, 14);
      ctx.fillStyle = '#d43d2a';
      ctx.beginPath();
      ctx.arc(-32, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (ob.kind === 'dog') {
      const hop = Math.abs(Math.sin(ob.bob)) * 8;
      ctx.translate(0, -hop);
      ctx.fillStyle = '#5d3413';
      ctx.beginPath();
      ctx.ellipse(ob.x + ob.w / 2, ob.y + 22, 26, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ob.x + 8, ob.y + 12, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a4a21';
      ctx.beginPath();
      ctx.moveTo(ob.x + 2, ob.y + 2);
      ctx.lineTo(ob.x - 2, ob.y - 8);
      ctx.lineTo(ob.x + 8, ob.y + 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ob.x + 5, ob.y + 9, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1d1d1d';
      ctx.beginPath();
      ctx.arc(ob.x + 6, ob.y + 9, 1.2, 0, Math.PI * 2);
      ctx.fill();
      // Snapping jaws.
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(ob.x - 4, ob.y + 14);
      ctx.lineTo(ob.x - 14, ob.y + 10 + Math.sin(ob.bob * 2) * 3);
      ctx.lineTo(ob.x - 4, ob.y + 18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#5d3413';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ob.x + 14, ob.y + 30);
      ctx.lineTo(ob.x + 8, ob.y + 34);
      ctx.moveTo(ob.x + 40, ob.y + 30);
      ctx.lineTo(ob.x + 46, ob.y + 34);
      ctx.stroke();
    } else if (ob.kind === 'hay') {
      // Wide low hay bale: a long jump, not a hop — the run's first
      // genuinely wide obstacle.
      ctx.fillStyle = '#d9a441';
      ctx.beginPath();
      ctx.roundRect(ob.x, ob.y, ob.w, ob.h, 10);
      ctx.fill();
      ctx.fillStyle = '#b57f22';
      ctx.beginPath();
      ctx.roundRect(ob.x, ob.y + ob.h - 12, ob.w, 12, 6);
      ctx.fill();
      ctx.strokeStyle = '#e9c46a';
      ctx.lineWidth = 2;
      for (const sy of [ob.y + 10, ob.y + 20, ob.y + 30]) {
        ctx.beginPath();
        ctx.moveTo(ob.x + 6, sy);
        ctx.lineTo(ob.x + ob.w - 6, sy);
        ctx.stroke();
      }
      ctx.strokeStyle = '#8a5a28';
      ctx.lineWidth = 3;
      for (const tx of [ob.x + 24, ob.x + ob.w - 24]) {
        ctx.beginPath();
        ctx.moveTo(tx, ob.y + 2);
        ctx.lineTo(tx, ob.y + ob.h - 2);
        ctx.stroke();
      }
    } else if (ob.kind === 'pumpkin') {
      // Rolling pumpkin: ribbed autumn pumpkin, spinning as it rolls in
      // faster than the scroll.
      ctx.translate(ob.x + ob.w / 2, ob.y + ob.h / 2);
      ctx.rotate(ob.roll || 0);
      ctx.fillStyle = '#e07b39';
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c85f1e';
      for (const off of [-13, 13]) {
        ctx.beginPath();
        ctx.ellipse(off, 0, 7, 22, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#e07b39';
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2a541';
      ctx.beginPath();
      ctx.ellipse(0, -6, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5d7a2a';
      ctx.fillRect(-3, -30, 6, 10);
    }
    ctx.restore();
  }
}

function obstacleBox(ob) {
  // Forgiving boxes: the knife's tip and the dog's tail don't count.
  if (ob.kind === 'knife') return { x: ob.x + 8, y: ob.y + 8, w: ob.w - 16, h: ob.h - 12 };
  if (ob.kind === 'dog') return { x: ob.x + 4, y: ob.y + 6, w: ob.w - 10, h: ob.h - 8 };
  if (ob.kind === 'oven') return { x: ob.x + 4, y: ob.y + 4, w: ob.w - 8, h: ob.h - 4 };
  if (ob.kind === 'hay') return { x: ob.x + 3, y: ob.y + 4, w: ob.w - 6, h: ob.h - 6 };
  if (ob.kind === 'pumpkin') return { x: ob.x + 7, y: ob.y + 8, w: ob.w - 14, h: ob.h - 10 };
  return { x: ob.x + 2, y: ob.y + 2, w: ob.w - 4, h: ob.h - 2 };
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export { CORN_POINTS, CORNUCOPIA_POINTS };
