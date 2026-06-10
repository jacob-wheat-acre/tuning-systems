// Stacking-interval comma visualizer
// Shows how any pure just interval, stacked until the cycle closes, leaves a gap.

// ── Interval presets ────────────────────────────────────────────────────────────

const PRESETS = [
  { name: 'Major 2nd',   semitones: 2,  p: 9, q: 8,
    commaName: 'Pythagorean comma',
    commaDesc: 'Six whole tones overshoot by the same amount as twelve fifths — because (9/8)⁶ = (3/2)¹² / 2⁷.' },
  { name: 'Minor 3rd',   semitones: 3,  p: 6, q: 5,
    commaName: 'chromatic diesis',
    commaDesc: 'Four minor thirds overshoot by about 63¢ — roughly three Pythagorean commas stacked.' },
  { name: 'Major 3rd',   semitones: 4,  p: 5, q: 4,
    commaName: 'diesis',
    commaDesc: 'Three major thirds fall 41¢ short of an octave: (5/4)³ = 125/64, not 128/64 = 2. This gap — the diesis — is why augmented-triad tuning was avoided on early keyboards.' },
  { name: 'Perfect 4th', semitones: 5,  p: 4, q: 3,
    commaName: 'Pythagorean comma (inverted)',
    commaDesc: 'Twelve fourths undershoot by the same comma as twelve fifths, since a fourth + fifth = an octave.' },
  { name: 'Perfect 5th', semitones: 7,  p: 3, q: 2,
    commaName: 'Pythagorean comma',
    commaDesc: 'Twelve pure fifths overshoot seven octaves by 23.46¢ (ratio 531441:524288). On a 12-note keyboard this comma must go somewhere — Pythagorean tuning dumps the whole thing into one "wolf" fifth.' },
  { name: 'Major 6th',   semitones: 9,  p: 5, q: 3,
    commaName: 'chromatic diesis (inverted)',
    commaDesc: 'Four major sixths fall 63¢ flat — the same magnitude as the minor-third diesis, since a minor third + major sixth = an octave.' },
  { name: 'Minor 7th',   semitones: 10, p: 9, q: 5,
    commaName: 'large comma (~106¢)',
    commaDesc: 'Six minor sevenths overshoot five octaves by nearly a full semitone. The minor seventh is far from its just ratio in ET, so the comma accumulates rapidly.' },
];

// Chromatic note names, C at index 0
const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const C4    = 261.63; // Hz

// ── State ───────────────────────────────────────────────────────────────────

let preset       = PRESETS[4]; // default: perfect fifth
let currentStep  = 0;
let isPlaying    = false;
let playTimer    = null;

// Derived — recomputed whenever preset changes
let nSteps, driftPerStep, commaCents, justCents;

function recompute() {
  justCents    = 1200 * Math.log2(preset.p / preset.q);
  driftPerStep = justCents - preset.semitones * 100;
  nSteps       = 12 / gcd(12, preset.semitones);
  commaCents   = nSteps * driftPerStep;
}

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

// ── Audio ─────────────────────────────────────────────────────────────────────

const _AudioCtx = window.AudioContext || window.webkitAudioContext;
let _audioCtx = null;
let _audioOut  = null; // MediaStreamDestinationNode → <audio> for iOS session fix

function _setupAudioRoute() {
  if (_audioOut) return;
  try {
    const dest = _audioCtx.createMediaStreamDestination();
    const el   = new Audio();
    el.srcObject = dest.stream;
    el.play().catch(() => {});
    _audioOut = dest;
  } catch (_) {
    _audioOut = _audioCtx.destination;
  }
}

function getCtx() {
  if (!_audioCtx) { _audioCtx = new _AudioCtx(); _setupAudioRoute(); }
  if (_audioCtx.state === 'suspended') _audioCtx.resume().catch(() => {});
  return _audioCtx;
}

async function getRunningCtx() {
  const ctx = getCtx();
  if (ctx.state !== 'running') await ctx.resume();
  return ctx;
}

// Frequency of note at step k: stack k just intervals from C4, octave-reduce
function freqAtStep(k) {
  let f = C4 * Math.pow(preset.p / preset.q, k);
  while (f > 523) f /= 2;
  while (f < 131) f *= 2;
  return f;
}

// Schedule a single tone: fade in, hold, fade out
function tone(actx, freq, startTime, duration, amplitude = 0.35) {
  const osc  = actx.createOscillator();
  const gain = actx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(amplitude, startTime);
  gain.gain.setValueAtTime(amplitude, startTime + duration - 0.04);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.connect(gain);
  gain.connect(_audioOut);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

async function playStep(k) {
  if (k < 1) return;

  // At the final step: play the comparison instead of a regular interval
  if (k === nSteps) {
    await playCommaComparison();
    return;
  }

  const actx = await getRunningCtx();
  const now  = actx.currentTime + 0.005; // small offset avoids Safari t≈now edge case
  const dur  = 0.65;

  const master = actx.createGain();
  master.gain.setValueAtTime(0.38, now);
  master.gain.setValueAtTime(0.38, now + dur - 0.07);
  master.gain.linearRampToValueAtTime(0, now + dur);
  master.connect(_audioOut);

  for (const freq of [freqAtStep(k - 1), freqAtStep(k % 12 === 0 ? 0 : k)]) {
    const osc = actx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }
}

// The money shot: play "expected C" vs "actual comma-shifted C", then both together.
// The simultaneous playback makes the beating audible and visceral.
async function playCommaComparison() {
  const actx = await getRunningCtx();
  const now  = actx.currentTime;

  const fExpected = C4;
  const fActual   = C4 * Math.pow(2, commaCents / 1200);
  const beatHz    = Math.abs(fActual - fExpected).toFixed(2);

  const SEQ  = 0.75;
  const GAP  = 0.08;
  const BOTH = 2.5;

  const t0 = now + 0.05;
  const t1 = t0 + SEQ + GAP;
  const t2 = t1 + SEQ + GAP;

  tone(actx, fExpected, t0, SEQ, 0.35);
  tone(actx, fActual,   t1, SEQ, 0.35);
  tone(actx, fExpected, t2, BOTH, 0.28);
  tone(actx, fActual,   t2, BOTH, 0.28);

  setTimeout(() => {
    const el = document.getElementById('comma-beat-info');
    if (el) el.textContent = `Beating at ${beatHz} Hz — ${(1 / beatHz).toFixed(2)}s per cycle`;
  }, 200);
}

// ── Canvas ────────────────────────────────────────────────────────────────────

const canvas = document.getElementById('comma-canvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  const wrap = canvas.parentElement;
  const size = Math.min(wrap.clientWidth, wrap.clientHeight, 600);
  canvas.width = canvas.height = size;
}
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); draw(currentStep); });

function noteAngle(k) {
  return -Math.PI / 2 + k * (2 * Math.PI / 12);
}

function noteAtStep(k) {
  return ((k * preset.semitones) % 12 + 12) % 12;
}

function stepColor(k) {
  const t = Math.min(k / nSteps, 1);
  return `hsl(${Math.round(120 * (1 - t))}, 85%, 60%)`;
}

// ── Draw ───────────────────────────────────────────────────────────────────────

function draw(step) {
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const R  = Math.min(W, H) * 0.34;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d0d14';
  ctx.fillRect(0, 0, W, H);

  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const visitedAt = new Map();
  for (let k = 0; k <= Math.min(step, nSteps); k++) {
    const pos = noteAtStep(k);
    if (!visitedAt.has(pos)) visitedAt.set(pos, k);
  }

  for (let k = 1; k <= Math.min(step, nSteps); k++) {
    const fromPos = noteAtStep(k - 1);
    const toPos   = noteAtStep(k % 12);
    const x1 = cx + R * Math.cos(noteAngle(fromPos));
    const y1 = cy + R * Math.sin(noteAngle(fromPos));
    const x2 = cx + R * Math.cos(noteAngle(toPos));
    const y2 = cy + R * Math.sin(noteAngle(toPos));

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle  = stepColor(k);
    ctx.lineWidth    = k === step ? 2.8 : 1.5;
    ctx.globalAlpha  = k === step ? 1 : 0.35;
    ctx.stroke();
    ctx.globalAlpha  = 1;
  }

  if (step >= nSteps) {
    const gapR     = R + 20;
    const gapRad   = (commaCents / 1200) * 2 * Math.PI;
    const cAngle   = noteAngle(0);
    const arcStart = commaCents >= 0 ? cAngle : cAngle + gapRad;
    const arcEnd   = commaCents >= 0 ? cAngle + gapRad : cAngle;

    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, gapR, arcStart, arcEnd, false);
    ctx.strokeStyle = '#ef5350';
    ctx.lineWidth   = 4;
    ctx.stroke();
    ctx.restore();

    for (const a of [arcStart, arcEnd]) {
      ctx.beginPath();
      ctx.arc(cx + gapR * Math.cos(a), cy + gapR * Math.sin(a), 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ef5350';
      ctx.fill();
    }

    const midA  = (arcStart + arcEnd) / 2;
    const labR  = gapR + 38;
    const lx    = cx + labR * Math.cos(midA);
    const ly    = cy + labR * Math.sin(midA);
    const sign  = commaCents >= 0 ? '+' : '';
    ctx.save();
    ctx.font         = 'bold 12px system-ui';
    ctx.fillStyle    = '#ef5350';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${sign}${commaCents.toFixed(2)}¢`, lx, ly - 8);
    ctx.font = '10px system-ui';
    ctx.fillText('comma', lx, ly + 6);
    ctx.restore();
  }

  const LABEL_R = R + 34;
  for (let k = 0; k < 12; k++) {
    const angle    = noteAngle(k);
    const nx       = cx + R * Math.cos(angle);
    const ny       = cy + R * Math.sin(angle);
    const lx       = cx + LABEL_R * Math.cos(angle);
    const ly       = cy + LABEL_R * Math.sin(angle);

    const vstep    = visitedAt.get(k);
    const visited  = vstep !== undefined;
    const isStart  = k === 0;
    const dotColor = visited ? stepColor(vstep) : 'rgba(255,255,255,0.18)';

    ctx.beginPath();
    ctx.arc(nx, ny, isStart ? 7 : visited ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isStart ? '#fff' : dotColor;
    ctx.fill();

    if (isStart && step >= 1) {
      ctx.beginPath();
      ctx.arc(nx, ny, 11, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    ctx.save();
    ctx.font         = `${isStart || visited ? 'bold' : ''} 13px system-ui`;
    ctx.fillStyle    = isStart ? '#fff' : dotColor;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(NOTES[k], lx, ly);
    ctx.restore();
  }

  const drift      = Math.min(step, nSteps) * driftPerStep;
  const sign       = drift >= 0 ? '+' : '';
  const driftStr   = step === 0 ? '0.00¢' : `${sign}${drift.toFixed(2)}¢`;
  const driftColor = step === 0 ? 'rgba(255,255,255,0.55)' : stepColor(Math.min(step, nSteps));

  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font         = `bold ${Math.round(W * 0.055)}px system-ui`;
  ctx.fillStyle    = driftColor;
  ctx.fillText(driftStr, cx, cy - R * 0.14);

  ctx.font      = `${Math.round(W * 0.022)}px system-ui`;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('cumulative drift', cx, cy + R * 0.04);

  if (step > 0 && step <= nSteps) {
    const from = NOTES[noteAtStep(step - 1)];
    const to   = step < nSteps ? NOTES[noteAtStep(step)] : NOTES[0];
    ctx.font      = `${Math.round(W * 0.02)}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillText(`${from} → ${to}  (${step}/${nSteps})`, cx, cy + R * 0.18);
  }
  ctx.restore();
}

// ── UI updates ────────────────────────────────────────────────────────────────

function updateUI(step) {
  document.getElementById('step-counter').textContent =
    step === 0 ? `Step 0 of ${nSteps} — starting note`
    : step < nSteps ? `Step ${step} of ${nSteps}`
    : `All ${nSteps} steps complete`;

  const { p, q, name, commaName: cname, commaDesc } = preset;
  const etCents = preset.semitones * 100;

  let title, body;
  if (step === 0) {
    title = `Starting at C — stacking ${name}s (${p}:${q})`;
    body  = `Each step adds one pure <strong>${name}</strong> (${p}:${q} = ${justCents.toFixed(2)}¢). `
          + `ET uses ${etCents}¢, so each step drifts ${driftPerStep >= 0 ? '+' : ''}${driftPerStep.toFixed(2)}¢. `
          + `The cycle closes in <strong>${nSteps} steps</strong>.`;
  } else if (step < nSteps) {
    const from  = NOTES[noteAtStep(step - 1)];
    const to    = NOTES[noteAtStep(step)];
    const drift = step * driftPerStep;
    const s     = drift >= 0 ? '+' : '';
    title = `${from} → ${to}  (+${driftPerStep >= 0 ? '+' : ''}${driftPerStep.toFixed(2)}¢)`;
    body  = `Tuned ${to} as a pure ${name} (${p}:${q}) above ${from}. `
          + `Cumulative drift after ${step} step${step > 1 ? 's' : ''}: <strong>${s}${drift.toFixed(2)}¢</strong>.`;
  } else {
    const fExpected = C4;
    const fActual   = C4 * Math.pow(2, commaCents / 1200);
    const beatHz    = Math.abs(fActual - fExpected).toFixed(2);
    title = `The ${cname}`;
    body  = `After ${nSteps} pure ${name}s the cycle closes — but we land `
          + `<strong>${commaCents >= 0 ? '+' : ''}${commaCents.toFixed(2)}¢ ${commaCents >= 0 ? 'sharp' : 'flat'}</strong>. `
          + commaDesc
          + `<br><br>`
          + `<span id="comma-beat-info" style="color:#ef9a9a;font-size:0.85em;">▶ Playing: pure C, then comma-shifted C, then both — listen for the beating.</span>`
          + `<br><br>`
          + `<button onclick="playCommaComparison()" style="background:#3d1a1a;border:1px solid #ef5350;border-radius:6px;color:#ef9a9a;cursor:pointer;font-size:0.8rem;padding:6px 14px;">↺ Replay comparison</button>`;
  }
  document.getElementById('step-title').textContent = title;
  document.getElementById('step-body').innerHTML    = body;

  const drift    = Math.min(step, nSteps) * driftPerStep;
  const maxDrift = Math.abs(commaCents) * 1.05;
  const pct      = Math.min(Math.abs(drift) / maxDrift * 100, 100);
  const fill     = document.getElementById('meter-fill');
  fill.style.width      = `${pct.toFixed(1)}%`;
  fill.style.background = `hsl(${Math.round(120 * (1 - Math.abs(drift) / Math.abs(commaCents)))}, 85%, 55%)`;

  const driftEl  = document.getElementById('drift-value');
  const s        = drift >= 0 ? '+' : '';
  driftEl.textContent = step === 0 ? '0.00 ¢' : `${s}${drift.toFixed(2)} ¢`;
  driftEl.style.color = step === 0 ? '' : stepColor(Math.min(step, nSteps));

  const tickEl = document.getElementById('meter-ticks');
  const n = 4;
  tickEl.innerHTML = Array.from({ length: n + 1 }, (_, i) => {
    const val = (Math.abs(commaCents) * i / n);
    return `<span>${commaCents < 0 ? '-' : '+'}${val.toFixed(0)}¢</span>`;
  }).join('');

  updateTable(step);
}

function updateTable(step) {
  const tbody = document.getElementById('notes-table-body');
  tbody.innerHTML = '';

  for (let k = 0; k <= nSteps; k++) {
    const chromPos  = noteAtStep(k);
    const note      = k === nSteps ? NOTES[0] + (commaCents !== 0 ? '*' : '') : NOTES[chromPos];
    const drift     = k * driftPerStep;
    const s         = drift >= 0 ? '+' : '';
    const pitchCts  = ((justCents * k) % 1200 + 1200) % 1200;
    const reached   = k <= step;
    const isCurrent = k === step && k > 0;

    const row = document.createElement('div');
    row.className = `note-row${reached ? ' reached' : ''}${isCurrent ? ' current' : ''}`;
    row.style.color = reached ? stepColor(k) : '';
    row.innerHTML   = `<span>${note}</span><span>${pitchCts.toFixed(1)}¢</span><span>${k === 0 ? '0.00¢' : s + drift.toFixed(2) + '¢'}</span>`;
    tbody.appendChild(row);
  }
}

// ── Step logic ────────────────────────────────────────────────────────────────────

function setStep(s, playAudio = false) {
  const prev  = currentStep;
  currentStep = Math.max(0, Math.min(nSteps, s));
  draw(currentStep);
  updateUI(currentStep);
  if (playAudio && currentStep > prev) playStep(currentStep);
}

function stepForward() { if (currentStep < nSteps) setStep(currentStep + 1, true); }
function stepBack()    { if (currentStep > 0)      setStep(currentStep - 1, false); }

function resetToZero() {
  if (isPlaying) togglePlay();
  setStep(0);
}

// ── Interval selector ─────────────────────────────────────────────────────────────

document.getElementById('interval-select').addEventListener('change', e => {
  preset = PRESETS[parseInt(e.target.value)];
  recompute();
  currentStep = 0;
  draw(0);
  updateUI(0);
});

// ── Playback ──────────────────────────────────────────────────────────────────────

function togglePlay() {
  getCtx(); // create AudioContext + kick off resume() within user gesture
  isPlaying = !isPlaying;
  const btn = document.getElementById('btn-play');
  if (isPlaying) {
    btn.textContent = '⏸ Pause';
    btn.classList.add('active');
    const ms = parseInt(document.getElementById('speed-slider').value);
    playTimer = setInterval(() => {
      if (currentStep >= nSteps) { togglePlay(); return; }
      stepForward();
    }, ms);
  } else {
    btn.textContent = '▶ Play';
    btn.classList.remove('active');
    clearInterval(playTimer);
  }
}

document.getElementById('btn-next').addEventListener('click', () => {
  if (isPlaying) togglePlay();
  getCtx();
  stepForward();
});
document.getElementById('btn-prev').addEventListener('click', () => {
  if (isPlaying) togglePlay();
  getCtx();
  stepBack();
});
document.getElementById('btn-reset').addEventListener('click', resetToZero);
document.getElementById('btn-play').addEventListener('click', togglePlay);

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') { if (isPlaying) togglePlay(); getCtx(); stepForward(); }
  if (e.key === 'ArrowLeft')  { if (isPlaying) togglePlay(); getCtx(); stepBack(); }
  if (e.key === ' ')          { e.preventDefault(); togglePlay(); }
});

const speedSlider = document.getElementById('speed-slider');
speedSlider.addEventListener('input', () => {
  document.getElementById('speed-label').textContent = `${(parseInt(speedSlider.value) / 1000).toFixed(1)} s/step`;
  if (isPlaying) { togglePlay(); togglePlay(); }
});

// ── Boot ──────────────────────────────────────────────────────────────────────
window.playCommaComparison = playCommaComparison;

recompute();
setStep(0);
