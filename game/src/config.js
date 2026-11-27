// Gobble Dash: Turkey Escape — shared tuning constants and palette.
// One job: every magic number the game balances on lives here.
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const GROUND_Y = 452;

export const ESCAPE_DISTANCE = 1500; // metres to run before the turkey is free
export const START_LIVES = 3;
export const START_SPEED = 265; // px per second
export const MAX_SPEED = 545;
export const SPEED_PER_METRE = 0.14;
export const GRAVITY = 2600;
export const JUMP_VELOCITY = -880;
export const DOUBLE_JUMP_VELOCITY = -760;
export const FARMER_START_GAP = 150; // px between the farmer and the turkey
export const FARMER_CREEP = 1.6; // px per second the farmer gains on his own
export const FARMER_HIT_CLOSE = 42; // px the farmer gains when the turkey is hit
export const CORN_PUSHBACK = 2.5; // px the farmer loses per corn kernel eaten
export const FARMER_MAX_GAP = 210;
export const FARMER_CATCH_GAP = 14;
export const CORN_POINTS = 25;
export const CORNUCOPIA_POINTS = 250;
export const INVULN_SECONDS = 1.4;

// Dynamic difficulty: pressure blends score + distance + time so the run
// gets harder on three axes at once, never on time alone. A breather
// (cooldown) after a power-up or a distance milestone eases the spawn
// rate back down for a few seconds so the ramp never feels unfair.
export const DIFFICULTY = {
  BASE_INTERVAL: 1.55, // s between spawn patterns at pressure 0
  MIN_INTERVAL: 0.8, // s between spawn patterns at pressure 1
  MIN_PATTERN_GAP_PX: 400, // px between pattern starts — fairness floor
  DOUBLE_BASE: 0.25, // double-pattern chance at pressure 0
  DOUBLE_MAX: 0.5, // double-pattern chance at pressure 1
  POWERUP_COOLDOWN: 4.0, // s of breather after grabbing a power-up
  MILESTONE_EVERY: 250, // metres between milestone breathers
  MILESTONE_COOLDOWN: 3.0, // s of breather at each milestone
  BREATHER_INTERVAL_MULT: 1.45, // spawn-interval multiplier during a breather
  HAY_UNLOCK: 250, // metres before hay bales join the mix
  PUMPKIN_UNLOCK: 450, // metres before rolling pumpkins join the mix
  SCORE_REF: 3000, // score that counts as "max" for pressure
  TIME_REF: 60, // seconds that count as "max" for pressure
};

export const PALETTE = {
  skyDay: ['#7ec8f7', '#cfeefb'],
  skyDusk: ['#ff9e5e', '#7b4b8f'],
  skyNight: ['#1d2b53', '#4a3a6b'],
  hillDay: '#7fb069',
  hillDusk: '#5d7a4a',
  hillNight: '#2e4a34',
  ground: '#b5773a',
  groundDark: '#8a5a28',
  grass: '#6da34a',
  turkeyBody: '#8a5a2b',
  turkeyDark: '#6b4423',
  turkeyHead: '#c94f43',
  feather: '#a9713a',
  corn: '#ffd23f',
  farmerShirt: '#4a7c59',
  farmerOveralls: '#3b5bdb',
  oven: '#2b2b33',
  knifeBlade: '#dfe6ee',
  cream: '#fff3d6',
  ink: '#2b2118',
};

// The three legs of the escape: farmyard, autumn woods, the farmhouse kitchen
// approach. Each stage recolours the sky and swaps the scenery props.
export const STAGES = [
  { name: 'Farmyard', until: 500, sky: 'skyDay', hill: 'hillDay' },
  { name: 'Autumn Woods', until: 1000, sky: 'skyDusk', hill: 'hillDusk' },
  { name: 'Farmhouse Lane', until: ESCAPE_DISTANCE, sky: 'skyNight', hill: 'hillNight' },
];

export function stageFor(distance) {
  for (const stage of STAGES) {
    if (distance < stage.until) return stage;
  }
  return STAGES[STAGES.length - 1];
}

// Deterministic RNG (mulberry32) so screenshot runs can be seeded.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
