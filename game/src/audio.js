// Gobble Dash: Turkey Escape — all sound is synthesised with WebAudio
// oscillators. No audio files, no network. Created lazily on the first
// user gesture so browsers allow it.
export class SoundEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.context.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // One short oscillator blip with a pitch slide and an exponential fade.
  tone(freqStart, freqEnd, duration, type = 'sine', volume = 0.25, delay = 0) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, freqStart), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // A burst of filtered noise for thuds and flaps, built from a buffer.
  noise(duration, volume = 0.3, delay = 0, lowpass = 1200) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime + delay;
    const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
  }

  jump() {
    this.tone(280, 620, 0.16, 'triangle', 0.22);
  }

  doubleJump() {
    this.tone(420, 900, 0.14, 'triangle', 0.2);
    this.noise(0.08, 0.08, 0, 3000);
  }

  // The turkey's signature gobble: three quick descending clucks.
  gobble() {
    this.tone(520, 300, 0.09, 'square', 0.12);
    this.tone(480, 260, 0.09, 'square', 0.12, 0.1);
    this.tone(600, 240, 0.16, 'square', 0.14, 0.2);
  }

  pickup() {
    this.tone(880, 880, 0.07, 'sine', 0.18);
    this.tone(1318, 1318, 0.1, 'sine', 0.16, 0.06);
  }

  shield() {
    this.tone(523, 523, 0.12, 'sine', 0.18);
    this.tone(659, 659, 0.12, 'sine', 0.18, 0.1);
    this.tone(784, 784, 0.2, 'sine', 0.18, 0.2);
  }

  hit() {
    this.noise(0.22, 0.4, 0, 700);
    this.tone(160, 55, 0.28, 'sawtooth', 0.28);
  }

  shieldBreak() {
    this.tone(1200, 300, 0.25, 'triangle', 0.2);
    this.noise(0.15, 0.2, 0, 4000);
  }

  duck() {
    this.noise(0.06, 0.1, 0, 2000);
  }

  // Cheerful plucky bassline loop: root notes with a little hop.
  startMusic() {
    if (!this.context || this.musicTimer) return;
    const bass = [131, 131, 165, 196, 165, 131, 110, 147];
    const hop = [262, 330, 392, 330];
    this.musicTimer = window.setInterval(() => {
      if (this.muted) return;
      const bar = this.musicStep % 8;
      this.tone(bass[bar], bass[bar], 0.22, 'triangle', 0.1);
      if (bar % 2 === 0) this.tone(hop[(bar / 2) | 0], hop[(bar / 2) | 0], 0.12, 'square', 0.045);
      this.musicStep += 1;
    }, 210);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  winFanfare() {
    this.stopMusic();
    [523, 659, 784, 1047].forEach((freq, i) => this.tone(freq, freq, 0.28, 'triangle', 0.22, i * 0.13));
    this.tone(1319, 1319, 0.5, 'triangle', 0.2, 0.55);
  }

  loseSting() {
    this.stopMusic();
    [392, 330, 262, 196].forEach((freq, i) => this.tone(freq, freq * 0.94, 0.3, 'sawtooth', 0.14, i * 0.17));
  }
}
