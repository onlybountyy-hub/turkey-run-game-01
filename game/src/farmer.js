// Gobble Dash: Turkey Escape — the farmer and his dog, the chase itself.
// The farmer is drawn at the turkey's x minus the gap; when the gap closes
// to zero the run ends caught. He never teleports: the gap only moves by the
// rules in config.js, so every catch is earned by the player's mistakes.
import { GROUND_Y, PALETTE } from './config.js';

export class FarmerChase {
  constructor(startGap) {
    this.gap = startGap;
    this.runPhase = 0;
    this.dogPhase = 0;
    this.grabTimer = 0;
  }

  // px position of the farmer's chest, used by the world renderer.
  x(turkeyX) {
    return turkeyX - this.gap;
  }

  update(dt, creep, turkeyX) {
    this.runPhase += dt * 11;
    this.dogPhase += dt * 14;
    this.gap = Math.max(0, this.gap - creep * dt);
    if (this.grabTimer > 0) this.grabTimer -= dt;
    return this.gap;
  }

  closeBy(amount) {
    this.gap = Math.max(0, this.gap - amount);
  }

  pushBack(amount, maxGap) {
    this.gap = Math.min(maxGap, this.gap + amount);
  }

  draw(ctx, turkeyX, time) {
    const fx = this.x(turkeyX);
    if (fx < -140) return; // fully off-screen to the left
    const bob = Math.abs(Math.sin(this.runPhase)) * 3;

    ctx.save();
    ctx.translate(fx, GROUND_Y - bob);

    // The farm dog runs just ahead of the farmer, tongue out.
    const dogX = 58;
    const dogBob = Math.abs(Math.sin(this.dogPhase)) * 4;
    ctx.save();
    ctx.translate(dogX, -dogBob);
    ctx.fillStyle = '#7a4a21';
    ctx.beginPath();
    ctx.ellipse(0, -14, 20, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(19, -22, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d3413';
    ctx.beginPath();
    ctx.moveTo(14, -30);
    ctx.lineTo(12, -38);
    ctx.lineTo(18, -31);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8b4b8';
    ctx.fillRect(26, -20, 8, 4);
    const dogStep = Math.sin(this.dogPhase) * 8;
    ctx.strokeStyle = '#7a4a21';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-12, -6);
    ctx.lineTo(-12 + dogStep, 0);
    ctx.moveTo(12, -6);
    ctx.lineTo(12 - dogStep, 0);
    ctx.stroke();
    ctx.restore();

    // Farmer: straw hat, red beard, green shirt, blue overalls, pitchfork.
    const step = Math.sin(this.runPhase) * 9;
    ctx.strokeStyle = '#2b2118';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -34);
    ctx.lineTo(-8 + step, 0);
    ctx.moveTo(8, -34);
    ctx.lineTo(8 - step, 0);
    ctx.stroke();

    ctx.fillStyle = PALETTE.farmerOveralls;
    ctx.fillRect(-14, -52, 28, 22);
    ctx.fillStyle = PALETTE.farmerShirt;
    ctx.fillRect(-15, -66, 30, 16);
    ctx.fillStyle = PALETTE.farmerOveralls;
    ctx.fillRect(-14, -52, 6, 20);
    ctx.fillRect(8, -52, 6, 20);

    // Arms: one pumping, one gripping the pitchfork.
    ctx.strokeStyle = PALETTE.farmerShirt;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-12, -62);
    ctx.lineTo(-22, -46 + Math.sin(this.runPhase) * 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, -62);
    ctx.lineTo(24, -50);
    ctx.stroke();

    // Head, beard, nose, angry eyes.
    ctx.fillStyle = '#e8b88a';
    ctx.beginPath();
    ctx.arc(0, -76, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c94f43';
    ctx.beginPath();
    ctx.ellipse(0, -66, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b88a';
    ctx.beginPath();
    ctx.arc(4, -76, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1d1d1d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -82);
    ctx.lineTo(-2, -80);
    ctx.moveTo(2, -80);
    ctx.lineTo(8, -82);
    ctx.stroke();
    // Straw hat.
    ctx.fillStyle = '#e9c46a';
    ctx.beginPath();
    ctx.ellipse(0, -86, 19, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-10, -98, 20, 12);
    ctx.fillStyle = '#b5773a';
    ctx.fillRect(-10, -90, 20, 4);

    // Pitchfork held high.
    ctx.save();
    ctx.translate(28, -40);
    ctx.rotate(0.35);
    ctx.strokeStyle = '#8a5a28';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(0, -30);
    ctx.stroke();
    ctx.strokeStyle = '#dfe6ee';
    ctx.lineWidth = 3;
    for (const prong of [-7, 0, 7]) {
      ctx.beginPath();
      ctx.moveTo(prong, -30);
      ctx.lineTo(prong, -44);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  // "CAUGHT!" vignette: the farmer's hand closes over the turkey.
  drawGrab(ctx, turkeyX, turkeyY) {
    ctx.save();
    ctx.translate(turkeyX - 30, turkeyY - 70);
    ctx.fillStyle = '#e8b88a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 16, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
