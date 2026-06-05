// Lissajous renderer
//
// Draws the parametric curve x(t)=sin(2πf₁t), y(t)=sin(2πf₂t+φ) over exactly
// one "nominal" period (based on the nearest simple integer ratio). This means:
//   - Just/Pythagorean pure intervals: the curve closes perfectly → stable shape
//   - Equal temperament: the endpoints don't quite meet; the gap slowly rotates
//     as the phase relationship drifts → visible precession without filling the canvas

export class LissajousRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animId = null;
    this.startTime = null;
    this.f1 = 440;
    this.f2 = 660;
    this.phase = 0;
    this.color = '#4fc3f7';
    this._running = false;
  }

  setFrequencies(f1, f2) {
    this.f1 = f1;
    this.f2 = f2;
  }

  setColor(color) {
    this.color = color;
  }

  setPhase(phase) {
    this.phase = phase;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this.startTime = performance.now();
    this._frame();
  }

  stop() {
    this._running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  resize() {}

  _frame() {
    if (!this._running) return;
    this.animId = requestAnimationFrame(() => this._frame());
    const now = (performance.now() - this.startTime) / 1000;
    this._draw(now);
  }

  _draw(now) {
    const { canvas, ctx } = this;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) * 0.44;

    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, W, H);

    // Faint axes
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
    ctx.moveTo(0, cy); ctx.lineTo(W, cy);
    ctx.stroke();

    const f1 = this.f1, f2 = this.f2;

    // Find the nearest simple ratio p:q (q ≤ 32) to determine one Lissajous period.
    // Period = q / f1 (= p / f2 for a pure ratio). For ET this is an approximation —
    // the curve won't quite close, and the gap rotates frame-to-frame.
    const [, q] = nearestRatio(f2 / f1, 32);
    const period = q / f1;

    const N = 600; // points along the curve — plenty for smooth rendering
    const CHUNKS = 16; // draw in chunks so we can fade alpha across the trail
    const [cr, cg, cb] = hexToRgb(this.color);

    // Draw from t = (now - period) → now, oldest = dim, newest = bright
    for (let chunk = 0; chunk < CHUNKS; chunk++) {
      const i0 = Math.floor((chunk / CHUNKS) * N);
      const i1 = Math.floor(((chunk + 1) / CHUNKS) * N);

      // Cubic fade: oldest chunk nearly invisible, newest chunk full bright
      const age = (chunk + 1) / CHUNKS; // 0 → 1
      const alpha = Math.pow(age, 2.5) * 0.92;

      ctx.beginPath();
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = i0; i <= i1; i++) {
        const t = now - period + (i / N) * period;
        const px = cx + Math.sin(2 * Math.PI * f1 * t) * r;
        const py = cy - Math.sin(2 * Math.PI * f2 * t + this.phase) * r;
        if (i === i0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Bright dot at current position
    const dotX = cx + Math.sin(2 * Math.PI * f1 * now) * r;
    const dotY = cy - Math.sin(2 * Math.PI * f2 * now + this.phase) * r;

    const glow = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 12);
    glow.addColorStop(0, `rgba(${cr},${cg},${cb},0.35)`);
    glow.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.beginPath();
    ctx.arc(dotX, dotY, 12, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},1)`;
    ctx.fill();

    // Label
    const ratio = getRatioLabel(f1, f2);
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'left';
    ctx.fillText(ratio, 12, H - 12);
  }
}

// Nearest integer ratio p:q with q ≤ maxQ using Farey/brute-force search
function nearestRatio(ratio, maxQ) {
  let bestP = 1, bestQ = 1, bestErr = Infinity;
  for (let q = 1; q <= maxQ; q++) {
    const p = Math.round(ratio * q);
    if (p < 1) continue;
    const err = Math.abs(p / q - ratio);
    if (err < bestErr) {
      bestErr = err;
      bestP = p;
      bestQ = q;
    }
  }
  return [bestP, bestQ];
}

function getRatioLabel(f1, f2) {
  const [p, q] = nearestRatio(f2 / f1, 32);
  const cents = 1200 * Math.log2(f2 / f1);
  return `f₁/f₂ ≈ ${q}:${p}  (${cents.toFixed(1)}¢)`;
}

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [255, 255, 255];
}
