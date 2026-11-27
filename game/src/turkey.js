// Gobble Dash: Turkey Escape — the turkey: physics, poses and drawing.
// Everything the player sees of the hero is drawn procedurally here.
import { GRAVITY, GROUND_Y, JUMP_VELOCITY, DOUBLE_JUMP_VELOCITY, PALETTE } from './config.js';

export class Turkey {
  constructor() {
    this.x = 180;
    this.y = GROUND_Y;
    this.vy = 0;
    this.width = 62;
    this.height = 58;
    this.jumpsUsed = 0;
    this.ducking = false;
    this.runPhase = 0;
    this.blinkTimer = 0;
    this.invulnerable = 0;
  }

  get grounded() {
    return this.y >= GROUND_Y;
  }

  // The hitbox is smaller than the drawing so near-misses feel fair.
  hitbox() {
    const duckShrink = this.ducking && this.grounded ? 20 : 0;
    return {
      x: this.x - 22,
      y: this.y - this.height + 8 + duckShrink,
      w: 46,
      h: this.height - 12 - duckShrink,
    };
  }

  tryJump(sound) {
    if (this.grounded) {
      this.vy = JUMP_VELOCITY;
      this.jumpsUsed = 1;
      this.ducking = false;
      sound.jump();
      return true;
    }
    if (this.jumpsUsed < 2) {
      this.vy = DOUBLE_JUMP_VELOCITY;
      this.jumpsUsed = 2;
      sound.doubleJump();
      return true;
    }
    return false;
  }

  update(dt, speed, ducking) {
    this.runPhase += dt * (6 + speed / 60);
    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.blinkTimer > 0) this.blinkTimer -= dt;

    this.ducking = ducking && this.grounded;
    if (!this.grounded || this.vy !== 0) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.jumpsUsed = 0;
      }
    }
  }

  draw(ctx, time) {
    const bob = this.grounded ? Math.sin(this.runPhase) * 2 : 0;
    const duckSquash = this.ducking ? 0.72 : 1;
    const blink = this.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.scale(1, duckSquash);
    if (blink) ctx.globalAlpha = 0.35;

    // Tail feather fan, fanned wider when airborne.
    const fanSpread = this.grounded ? 0.5 : 0.72;
    ctx.fillStyle = PALETTE.feather;
    for (let i = -2; i <= 2; i++) {
      ctx.save();
      ctx.translate(-14, -34);
      ctx.rotate(i * fanSpread);
      ctx.beginPath();
      ctx.ellipse(0, -20, 7, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5d3a1a';
      ctx.beginPath();
      ctx.ellipse(0, -36, 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.feather;
      ctx.restore();
    }

    // Body.
    ctx.fillStyle = PALETTE.turkeyBody;
    ctx.beginPath();
    ctx.ellipse(0, -26, 26, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.turkeyDark;
    ctx.beginPath();
    ctx.ellipse(-4, -18, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing, flapping while running or flying.
    const flap = this.grounded ? Math.sin(this.runPhase * 2) * 0.25 : -0.9;
    ctx.save();
    ctx.translate(-2, -28);
    ctx.rotate(flap);
    ctx.fillStyle = '#a9713a';
    ctx.beginPath();
    ctx.ellipse(-4, 0, 16, 9, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Head and neck.
    ctx.fillStyle = PALETTE.turkeyHead;
    ctx.beginPath();
    ctx.ellipse(20, -52, 9, 15, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(26, -64, 11, 0, Math.PI * 2);
    ctx.fill();
    // Beak.
    ctx.fillStyle = '#f2a541';
    ctx.beginPath();
    ctx.moveTo(35, -66);
    ctx.lineTo(47, -62);
    ctx.lineTo(35, -58);
    ctx.closePath();
    ctx.fill();
    // Wattle.
    ctx.fillStyle = '#d43d2a';
    ctx.beginPath();
    ctx.ellipse(33, -54, 3.5, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Eye.
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(28, -67, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d1d1d';
    ctx.beginPath();
    ctx.arc(29, -67, 1.7, 0, Math.PI * 2);
    ctx.fill();

    // Legs, alternating while running, tucked while airborne.
    ctx.strokeStyle = '#f2a541';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    if (this.grounded) {
      const step = Math.sin(this.runPhase) * 10;
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(-6 + step, 0);
      ctx.moveTo(6, -8);
      ctx.lineTo(6 - step, 0);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(-10, 2);
      ctx.moveTo(6, -8);
      ctx.lineTo(10, 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
