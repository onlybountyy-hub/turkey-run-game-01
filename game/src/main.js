// Gobble Dash: Turkey Escape — the game itself: state machine, loop,
// scoring, lives, the farmer chase and the screenshot hooks.
// States: title → playing → caught | escaped, with restart from the end.
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_Y,
  ESCAPE_DISTANCE,
  START_LIVES,
  START_SPEED,
  MAX_SPEED,
  SPEED_PER_METRE,
  FARMER_START_GAP,
  FARMER_CREEP,
  FARMER_HIT_CLOSE,
  FARMER_MAX_GAP,
  FARMER_CATCH_GAP,
  CORN_PUSHBACK,
  INVULN_SECONDS,
  mulberry32,
} from './config.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { Turkey } from './turkey.js';
import { FarmerChase } from './farmer.js';
import { ObstacleField, CORN_POINTS as CORN_VALUE, CORNUCOPIA_POINTS as CORNUCOPIA_VALUE } from './obstacles.js';
import { World } from './world.js';
import { drawTitle, drawHud, drawEnd, BUTTONS, pointInButton } from './screens.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 0) || Math.floor(Math.random() * 1e9);
const random = mulberry32(seed);

const sound = new SoundEngine();
const world = new World(random);
const turkey = new Turkey();
const farmer = new FarmerChase(FARMER_START_GAP);
const field = new ObstacleField(random);

const game = {
  state: 'title',
  score: 0,
  bonus: 0, // points from corn and power-ups; score = distance points + bonus
  distance: 0,
  corn: 0,
  lives: START_LIVES,
  shield: false,
  speed: START_SPEED,
  farmerGap: FARMER_START_GAP,
  time: 0,
  pressure: 0, // dynamic difficulty 0..1, from the obstacle field
  breather: 0, // seconds of post-power-up / milestone cooldown remaining
  level: 1, // HUD difficulty level 1..5, derived from pressure
  paused: false,
  best: readBest(),
  flashTimer: 0,
  hitLog: [],
  jumpLog: [],
};

function readBest() {
  try {
    return Number(window.localStorage.getItem('gobble-dash-best') || 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest() {
  game.best = Math.max(game.best, game.score);
  try {
    window.localStorage.setItem('gobble-dash-best', String(game.best));
  } catch {
    // Storage unavailable (private mode, hosted sandbox): the score still shows.
  }
}

const input = new Input(canvas, () => sound.ensure());
canvas.addEventListener('pointerdown', handleCanvasClick);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    if (game.state === 'title') startRun();
    else if (game.state === 'caught' || game.state === 'escaped') startRun();
  }
  if (event.key === 'r' || event.key === 'R') {
    if (game.state === 'caught' || game.state === 'escaped') startRun();
  }
  if (event.key === 'p' || event.key === 'P') {
    if (game.state === 'playing') game.paused = !game.paused;
  }
  if (event.key === 'm' || event.key === 'M') {
    sound.ensure();
    sound.toggleMute();
  }
});

function handleCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  const point = {
    x: ((event.clientX - rect.left) / rect.width) * GAME_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * GAME_HEIGHT,
  };
  if (game.state === 'title' && pointInButton(point, BUTTONS.start)) {
    startRun();
    return;
  }
  if ((game.state === 'caught' || game.state === 'escaped') && pointInButton(point, BUTTONS.restart)) {
    startRun();
    return;
  }
  if (game.state === 'playing' && game.paused) {
    game.paused = false;
  }
}

function startRun() {
  sound.ensure();
  sound.startMusic();
  game.state = 'playing';
  game.score = 0;
  game.bonus = 0;
  game.distance = 0;
  game.corn = 0;
  game.lives = START_LIVES;
  game.shield = false;
  game.speed = START_SPEED;
  game.farmerGap = FARMER_START_GAP;
  game.time = 0;
  game.pressure = 0;
  game.breather = 0;
  game.level = 1;
  game.paused = false;
  game.flashTimer = 0;
  game.hitLog = [];
  game.jumpLog = [];
  turkey.x = 180;
  turkey.y = GROUND_Y;
  turkey.vy = 0;
  turkey.jumpsUsed = 0;
  turkey.invulnerable = 0;
  farmer.gap = FARMER_START_GAP;
  field.reset();
}

function endRun(escaped) {
  game.state = escaped ? 'escaped' : 'caught';
  if (escaped) {
    game.bonus += 500; // freedom bonus
    game.score = Math.floor(game.distance * 2) + game.bonus;
    sound.winFanfare();
  } else {
    sound.loseSting();
  }
  saveBest();
}

function update(dt) {
  game.time += dt;
  if (game.state !== 'playing' || game.paused) return;

  game.speed = Math.min(MAX_SPEED, START_SPEED + game.distance * SPEED_PER_METRE);
  game.distance += (game.speed * dt) / 18; // px → metres
  game.score = Math.floor(game.distance * 2) + game.bonus;
  game.farmerGap = farmer.update(dt, FARMER_CREEP, turkey.x);

  // Screenshot mode keeps the turkey alive after the fast-forward too.
  if (params.get('shot') === 'play') {
    const near = field.obstacles.find((ob) => ob.x > turkey.x && ob.x - turkey.x < game.speed * 0.68 - 100);
    if (near && turkey.grounded) turkey.tryJump(sound);
  }
  if (input.consumeJump()) turkey.tryJump(sound);
  turkey.update(dt, game.speed, input.isDucking());
  world.update(dt, game.speed);
  // Difficulty scales on score + distance + time, not time alone.
  field.update(dt, game.speed, game.distance, game.score, game.time);
  game.pressure = field.pressure;
  game.breather = field.breather;
  game.level = field.difficultyLevel();

  const collisions = field.checkCollisions(turkey.hitbox(), turkey.invulnerable > 0);
  if (collisions.corn > 0) {
    game.corn += collisions.corn;
    game.bonus += collisions.corn * CORN_VALUE;
    farmer.pushBack(collisions.corn * CORN_PUSHBACK, FARMER_MAX_GAP);
    sound.pickup();
  }
  for (const power of collisions.powerups) {
    // A grab earns a short breather: fewer, easier spawns for a while.
    field.notifyPowerup(power);
    if (power === 'shield') {
      game.shield = true;
      sound.shield();
    } else if (power === 'cornucopia') {
      game.bonus += CORNUCOPIA_VALUE;
      sound.shield();
    }
  }
  if (collisions.hits > 0) {
    game.hitLog.push({
      at: Math.floor(game.distance),
      livesBefore: game.lives,
      shield: game.shield,
      turkeyY: Math.round(turkey.y),
      turkeyVy: Math.round(turkey.vy),
      hit: collisions.hitObstacle,
      obstacles: field.obstacles.map((ob) => `${ob.kind}@${Math.round(ob.x)}`).join(','),
    });
    if (game.shield) {
      game.shield = false;
      turkey.invulnerable = INVULN_SECONDS;
      sound.shieldBreak();
    } else {
      game.lives -= 1;
      game.flashTimer = 0.35;
      turkey.invulnerable = INVULN_SECONDS;
      farmer.closeBy(FARMER_HIT_CLOSE);
      sound.hit();
      sound.gobble();
      if (game.lives <= 0) {
        endRun(false);
        return;
      }
    }
  }
  if (game.flashTimer > 0) game.flashTimer -= dt;

  if (game.farmerGap <= FARMER_CATCH_GAP) {
    endRun(false);
    return;
  }
  if (game.distance >= ESCAPE_DISTANCE) {
    endRun(true);
  }
}

function draw() {
  world.draw(ctx, game.distance, game.time);
  field.draw(ctx, game.time);
  if (game.state === 'title') {
    turkey.draw(ctx, game.time);
    farmer.draw(ctx, turkey.x, game.time);
    drawTitle(ctx, game.time, game.best);
    return;
  }
  if (game.state === 'playing') {
    farmer.draw(ctx, turkey.x, game.time);
    turkey.draw(ctx, game.time);
    drawHud(ctx, game);
  } else {
    // End screens keep the last scene behind the panel.
    farmer.draw(ctx, turkey.x, game.time);
    if (game.state === 'caught') farmer.drawGrab(ctx, turkey.x, turkey.y);
    turkey.draw(ctx, game.time);
    drawEnd(ctx, game, game.time);
  }
  if (game.flashTimer > 0) {
    ctx.fillStyle = `rgba(220, 40, 30, ${game.flashTimer * 1.2})`;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
}

// Screenshot hooks: ?shot=title|play|caught|escaped&seed=N renders a fixed
// scene from the real game so screenshots are reproducible and honest.
function applyShotHook() {
  const shot = params.get('shot');
  if (!shot) return;
  if (shot === 'play') {
    startRun();
    // Fast-forward the simulation so the frame is mid-run, busy and real.
    // A tiny auto-player jumps the turkey so the run survives the fast-forward.
    for (let i = 0; i < 300; i++) {
      // Jump late enough that the turkey lands past the obstacle: airtime
      // is ~0.68 s, so jump when the gap is one airtime of travel minus a
      // small margin — jumping early lands the turkey on the fence.
      const near = field.obstacles.find((ob) => ob.x > turkey.x && ob.x - turkey.x < game.speed * 0.68 - 100);
      if (near && turkey.grounded) {
        game.jumpLog.push({ d: Math.floor(game.distance), gap: Math.round(near.x - turkey.x), kind: near.kind });
        turkey.tryJump(sound);
      }
      update(1 / 60);
      if (game.state !== 'playing') break;
    }
    game.paused = false;
  } else if (shot === 'caught') {
    startRun();
    for (let i = 0; i < 420; i++) update(1 / 60);
    game.lives = 0;
    game.score = 1840;
    game.distance = 612;
    game.corn = 23;
    endRun(false);
  } else if (shot === 'escaped') {
    startRun();
    game.distance = ESCAPE_DISTANCE;
    game.corn = 61;
    game.bonus = 8840;
    endRun(true);
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

applyShotHook();
requestAnimationFrame(frame);

// Debug handle for automated play-testing (state, score, distance).
window.__gobbleDash = { game, startRun, endRun, field, turkey, farmer };
