// Gobble Dash: Turkey Escape — keyboard and pointer input.
// Jump is an edge (a fresh press), duck is a held state, and the canvas
// forwards clicks/taps so mouse and touch play exactly like the keyboard.
export class Input {
  constructor(canvas, onFirstGesture) {
    this.jumpQueued = false;
    this.duckHeld = false;
    this.pressedKeys = new Set();
    this.onFirstGesture = onFirstGesture;
    this.canvas = canvas;

    window.addEventListener('keydown', (event) => this.handleKeyDown(event));
    window.addEventListener('keyup', (event) => this.handleKeyUp(event));
    canvas.addEventListener('pointerdown', (event) => this.handlePointer(event));
    // Never let arrow keys / space scroll the page while playing.
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
    });
  }

  handleKeyDown(event) {
    if (event.repeat) return;
    this.onFirstGesture();
    this.pressedKeys.add(event.key);
    if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W' || event.key === ' ') {
      this.jumpQueued = true;
    }
    if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
      this.duckHeld = true;
    }
  }

  handleKeyUp(event) {
    this.pressedKeys.delete(event.key);
    if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
      this.duckHeld = false;
    }
  }

  handlePointer(event) {
    event.preventDefault();
    this.onFirstGesture();
    // A tap anywhere on the canvas is a jump; buttons are resolved by the
    // game itself from the same coordinates before this reaches it.
    this.jumpQueued = true;
  }

  consumeJump() {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  }

  isDucking() {
    return this.duckHeld;
  }

  wasPressed(key) {
    return this.pressedKeys.has(key);
  }
}
