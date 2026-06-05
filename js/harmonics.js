import { AudioEngine } from './audio.js';

const audio = new AudioEngine();

// ── Data ─────────────────────────────────────────────────────────────────────

const PARTIALS = [
  { n: 1, freq: 110,  note: 'A2'   },
  { n: 2, freq: 220,  note: 'A3'   },
  { n: 3, freq: 330,  note: 'E4'   },
  { n: 4, freq: 440,  note: 'A4'   },
  { n: 5, freq: 550,  note: 'C#5'  },
  { n: 6, freq: 660,  note: 'E5'   },
  { n: 7, freq: 770,  note: 'G5 ♭' },
  { n: 8, freq: 880,  note: 'A5'   },
];

// Adjacent-partial intervals shown in section 2
const KEY_INTERVALS = [
  { from: 1, to: 2, ratio: '2:1', name: 'Octave',       cents: 1200.00 },
  { from: 2, to: 3, ratio: '3:2', name: 'Perfect 5th',  cents:  701.96 },
  { from: 3, to: 4, ratio: '4:3', name: 'Perfect 4th',  cents:  498.04 },
  { from: 4, to: 5, ratio: '5:4', name: 'Major 3rd',    cents:  386.31 },
  { from: 5, to: 6, ratio: '6:5', name: 'Minor 3rd',    cents:  315.64 },
];

// Fifths stacked from C, octave-reduced to [1,2)
const FIFTHS_CHAIN = [
  { note: 'C',  raw: 1       },
  { note: 'G',  raw: 3/2     },
  { note: 'D',  raw: 9/8     },
  { note: 'A',  raw: 27/16   },
  { note: 'E',  raw: 81/64   },
  { note: 'B',  raw: 243/128 },
  { note: 'F#', raw: 729/512 },
  { note: 'C#', raw: 2187/2048 },
  { note: 'Ab', raw: 128/81  },
  { note: 'Eb', raw: 32/27   },
  { note: 'Bb', raw: 16/9    },
  { note: 'F',  raw: 4/3     },
].map(s => {
  let r = s.raw;
  while (r >= 2) r /= 2;
  while (r < 1)  r *= 2;
  return { note: s.note, ratio: r };
});

// ── Vibrating strings canvas ──────────────────────────────────────────────────

const hCanvas    = document.getElementById('harmonic-canvas');
const hCtx       = hCanvas.getContext('2d');

const ROW_H      = 38;   // px per partial row
const PAD_V      = 14;   // top + bottom padding
const PAD_LEFT   = 34;   // partial-number column
const PAD_RIGHT  = 82;   // note / freq label column

let hDpr         = 1;
let hAnimId      = null;
let hT0          = null;
// per-string click envelope [0..1], decays after click
const hEnv       = new Array(PARTIALS.length).fill(0);

function resizeHarmonic() {
  hDpr = window.devicePixelRatio || 1;
  const W  = hCanvas.parentElement.clientWidth;
  const H  = PARTIALS.length * ROW_H + PAD_V * 2;
  hCanvas.width        = W * hDpr;
  hCanvas.height       = H * hDpr;
  hCanvas.style.height = H + 'px';
  hCtx.setTransform(hDpr, 0, 0, hDpr, 0, 0);
}

function animateHarmonic(ts) {
  if (hT0 === null) hT0 = ts;
  const t  = (ts - hT0) * 0.001;          // seconds
  const W  = hCanvas.width / hDpr;
  const H  = hCanvas.height / hDpr;
  const x0 = PAD_LEFT;
  const x1 = W - PAD_RIGHT;

  hCtx.clearRect(0, 0, W, H);

  // "n" column header
  hCtx.fillStyle    = 'rgba(224,224,240,0.2)';
  hCtx.font         = '9px system-ui';
  hCtx.textAlign    = 'center';
  hCtx.textBaseline = 'alphabetic';
  hCtx.fillText('n', x0 / 2, PAD_V - 2);

  PARTIALS.forEach((p, i) => {
    const cy  = PAD_V + i * ROW_H + ROW_H / 2;
    const env = hEnv[i];               // 0 = idle, 1 = just clicked
    const lit = env > 0.02;

    // Standing-wave amplitude: 1/√n falloff + envelope boost on click
    const baseAmp = 9 / Math.sqrt(p.n);
    const amp     = baseAmp * (0.28 + 0.72 * env);

    // Phase: real-time, n × base rate (higher partials spin faster)
    const phase = t * 2.0 * Math.PI * p.n;

    // ── string path ──────────────────────────────────────────
    const steps = Math.round(x1 - x0);

    if (lit) {
      hCtx.save();
      hCtx.shadowColor = '#a5d6a7';
      hCtx.shadowBlur  = 8 + 10 * env;
    }

    hCtx.strokeStyle = lit
      ? `rgba(165,214,167,${0.55 + 0.45 * env})`
      : 'rgba(224,224,240,0.22)';
    hCtx.lineWidth = lit ? 2 : 1.5;
    hCtx.beginPath();

    for (let px = 0; px <= steps; px++) {
      const frac = px / steps;
      const y    = cy + amp * Math.sin(p.n * Math.PI * frac) * Math.sin(phase);
      if (px === 0) hCtx.moveTo(x0 + frac * (x1 - x0), y);
      else          hCtx.lineTo(x0 + frac * (x1 - x0), y);
    }
    hCtx.stroke();
    if (lit) hCtx.restore();

    // ── nodes (fixed points) ──────────────────────────────────
    // Standing wave has n+1 nodes at positions k/n for k=0..n
    for (let k = 0; k <= p.n; k++) {
      const nx     = x0 + (k / p.n) * (x1 - x0);
      const isEnd  = k === 0 || k === p.n;
      const dotR   = isEnd ? 3 : 2;
      hCtx.beginPath();
      hCtx.arc(nx, cy, dotR, 0, Math.PI * 2);
      hCtx.fillStyle = lit
        ? `rgba(165,214,167,${isEnd ? 0.9 : 0.55 + 0.3 * env})`
        : `rgba(224,224,240,${isEnd ? 0.4 : 0.18})`;
      hCtx.fill();
    }

    // ── labels ────────────────────────────────────────────────
    hCtx.textBaseline = 'middle';

    // partial number (left column)
    hCtx.fillStyle = lit ? '#a5d6a7' : 'rgba(224,224,240,0.45)';
    hCtx.font      = 'bold 10px system-ui';
    hCtx.textAlign = 'center';
    hCtx.fillText(String(p.n), x0 / 2, cy);

    // note name (right column, upper)
    hCtx.textAlign = 'left';
    hCtx.fillStyle = lit ? '#a5d6a7' : 'rgba(224,224,240,0.5)';
    hCtx.font      = '10px system-ui';
    hCtx.fillText(p.note, x1 + 8, cy - 5);

    // frequency (right column, lower)
    hCtx.fillStyle = 'rgba(224,224,240,0.28)';
    hCtx.font      = '9px monospace';
    hCtx.fillText(p.freq + ' Hz', x1 + 8, cy + 6);

    // ── interval ratio between adjacent strings ───────────────
    if (i < PARTIALS.length - 1) {
      const midY = cy + ROW_H / 2;
      const iv   = KEY_INTERVALS[i];            // only defined for first 5 gaps
      if (iv) {
        hCtx.fillStyle = 'rgba(224,224,240,0.18)';
        hCtx.font      = '8px monospace';
        hCtx.textAlign = 'right';
        hCtx.fillText(iv.ratio, x0 - 4, midY);
      }
    }

    // ── decay envelope ────────────────────────────────────────
    if (hEnv[i] > 0) hEnv[i] = Math.max(0, hEnv[i] * 0.987);
  });

  hCtx.textBaseline = 'alphabetic';
  hAnimId = requestAnimationFrame(animateHarmonic);
}

function startHarmonic() {
  if (hAnimId) return;
  hT0 = null;
  hAnimId = requestAnimationFrame(animateHarmonic);
}

async function handleHarmonicTap(clientY) {
  const rect = hCanvas.getBoundingClientRect();
  const y    = clientY - rect.top;
  const i    = Math.floor((y - PAD_V) / ROW_H);
  if (i < 0 || i >= PARTIALS.length) return;
  hEnv[i] = 1.0;
  const f = PARTIALS[i].freq;
  await audio.playShort(f, f, 1200, 'sine');
}

hCanvas.addEventListener('click', async e => {
  await handleHarmonicTap(e.clientY);
});

hCanvas.addEventListener('touchstart', async e => {
  e.preventDefault();
  await handleHarmonicTap(e.touches[0].clientY);
}, { passive: false });

hCanvas.style.cursor = 'pointer';

// ── Interval list (section 2) ─────────────────────────────────────────────────

const ivList   = document.getElementById('interval-list');
let   ivActive = null;

KEY_INTERVALS.forEach(iv => {
  const f1  = 110 * iv.from;
  const f2  = 110 * iv.to;
  const row = document.createElement('div');
  row.className = 'interval-row';
  row.innerHTML = `
    <span class="iv-ratio">${iv.ratio}</span>
    <span class="iv-name">${iv.name}</span>
    <span class="iv-detail">${f1} Hz : ${f2} Hz &nbsp;·&nbsp; ${iv.cents.toFixed(2)} ¢</span>
    <button class="play-sm">▶ Play</button>
  `;

  const btn = row.querySelector('button');
  btn.addEventListener('click', async () => {
    if (ivActive && ivActive !== btn) {
      ivActive.textContent = '▶ Play';
      ivActive.classList.remove('active');
      audio.stop();
    }
    if (btn.classList.contains('active')) {
      audio.stop();
      btn.textContent = '▶ Play';
      btn.classList.remove('active');
      ivActive = null;
    } else {
      await audio.play(f1, f2, 'sine');
      btn.textContent = '■ Stop';
      btn.classList.add('active');
      ivActive = btn;
    }
  });

  ivList.appendChild(row);
});

// ── Scale builder — circle of fifths (section 3) ──────────────────────────────

const sCanvas = document.getElementById('scale-canvas');
const sCtx    = sCanvas.getContext('2d');
let   sDpr    = 1;
let   sStep   = 0;

const PENTA_STEPS  = 5;
const DIAT_STEPS   = 7;

function resizeScale() {
  sDpr = window.devicePixelRatio || 1;
  const W = sCanvas.parentElement.clientWidth - 40;
  sCanvas.width        = W * sDpr;
  sCanvas.height       = 150 * sDpr;
  sCanvas.style.height = '150px';
  sCtx.setTransform(sDpr, 0, 0, sDpr, 0, 0);
  drawScale();
}

function drawScale() {
  const W  = sCanvas.width / sDpr;
  const H  = 150;
  const cx = W / 2;
  const cy = H / 2 + 4;
  const R  = Math.min(cx - 30, cy - 18);

  sCtx.clearRect(0, 0, W, H);

  // outer ring
  sCtx.strokeStyle = 'rgba(255,255,255,0.06)';
  sCtx.lineWidth   = 1;
  sCtx.beginPath();
  sCtx.arc(cx, cy, R, 0, Math.PI * 2);
  sCtx.stroke();

  FIFTHS_CHAIN.forEach((s, i) => {
    const angle   = -Math.PI / 2 + i * (Math.PI * 2 / 12);
    const x       = cx + R * Math.cos(angle);
    const y       = cy + R * Math.sin(angle);
    const reached = i <= sStep;
    const latest  = i === sStep && sStep > 0;
    const penta   = reached && i > 0 && i <= PENTA_STEPS;
    const diat    = reached && i > PENTA_STEPS && i <= DIAT_STEPS;

    // spoke
    sCtx.strokeStyle = latest  ? 'rgba(165,214,167,0.55)'
                     : reached ? 'rgba(255,255,255,0.1)'
                     :           'rgba(255,255,255,0.04)';
    sCtx.lineWidth = 1;
    sCtx.beginPath();
    sCtx.moveTo(cx, cy);
    sCtx.lineTo(x, y);
    sCtx.stroke();

    // dot
    const r = 12;
    sCtx.beginPath();
    sCtx.arc(x, y, r, 0, Math.PI * 2);
    sCtx.fillStyle = latest  ? '#a5d6a7'
                   : penta   ? 'rgba(79,195,247,0.22)'
                   : diat    ? 'rgba(165,214,167,0.18)'
                   : reached ? 'rgba(255,255,255,0.08)'
                   :           'rgba(255,255,255,0.04)';
    sCtx.fill();

    if (reached) {
      sCtx.strokeStyle = latest  ? '#a5d6a7'
                       : penta   ? 'rgba(79,195,247,0.55)'
                       : diat    ? 'rgba(165,214,167,0.45)'
                       :           'rgba(255,255,255,0.14)';
      sCtx.lineWidth = 1.5;
      sCtx.stroke();
    }

    // note label
    sCtx.fillStyle    = latest  ? '#a5d6a7'
                      : reached ? 'rgba(224,224,240,0.8)'
                      :           'rgba(224,224,240,0.16)';
    sCtx.font         = 'bold 10px system-ui';
    sCtx.textAlign    = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText(s.note, x, y);
    sCtx.textBaseline = 'alphabetic';
  });

  // comma arc — visible after all 12 steps
  if (sStep >= 11) {
    const a0  = -Math.PI / 2;                      // start (C)
    const a12 = -Math.PI / 2 + Math.PI * 2;        // one full turn
    const aGap = a12 - 0.22;                        // tiny gap before C
    sCtx.strokeStyle = '#ef9a9a';
    sCtx.lineWidth   = 2;
    sCtx.setLineDash([3, 3]);
    sCtx.beginPath();
    sCtx.arc(cx, cy, R + 20, aGap, a0 + Math.PI * 2 - 0.01);
    sCtx.stroke();
    sCtx.setLineDash([]);

    // label
    const lx = cx + (R + 20) * Math.cos(a0 + 0.11);
    const ly = cy + (R + 28) * Math.sin(a0 + 0.11);
    sCtx.fillStyle  = '#ef9a9a';
    sCtx.font       = 'bold 9px system-ui';
    sCtx.textAlign  = 'center';
    sCtx.fillText('comma', lx, ly + 10);
  }

  // legend
  const legY = H - 9;
  [
    { color: 'rgba(79,195,247,0.7)',   label: 'Pentatonic (5 fifths)' },
    { color: 'rgba(165,214,167,0.8)',  label: 'Diatonic (7 fifths)'   },
  ].forEach(({ color, label }, idx) => {
    const lx = idx * 160;
    sCtx.fillStyle = color;
    sCtx.fillRect(lx, legY - 7, 8, 8);
    sCtx.fillStyle  = 'rgba(224,224,240,0.3)';
    sCtx.font       = '9px system-ui';
    sCtx.textAlign  = 'left';
    sCtx.fillText(label, lx + 12, legY);
  });
}

function updateScaleInfo() {
  const el = document.getElementById('scale-info');
  if (sStep === 0) {
    el.textContent = 'Step 0 of 12 — start at C';
    return;
  }
  const s    = FIFTHS_CHAIN[sStep];
  const f    = Math.round(261.63 * s.ratio);
  const note = sStep === PENTA_STEPS ? ' — pentatonic complete'
             : sStep === DIAT_STEPS  ? ' — diatonic (major) scale complete'
             : sStep === 11          ? ' — Pythagorean comma visible'
             : '';
  el.textContent = `Step ${sStep} of 12 — added ${s.note} (${f} Hz)${note}`;
}

document.getElementById('scale-next').addEventListener('click', async () => {
  if (sStep >= 11) return;
  sStep++;
  drawScale();
  updateScaleInfo();
  document.getElementById('scale-next').disabled = sStep >= 11;
  const f = Math.round(261.63 * FIFTHS_CHAIN[sStep].ratio);
  await audio.playShort(f, f, 450, 'sine');
});

document.getElementById('scale-reset').addEventListener('click', () => {
  sStep = 0;
  drawScale();
  updateScaleInfo();
  document.getElementById('scale-next').disabled = false;
});

// ── ET comparison (section 6) ─────────────────────────────────────────────────

const PAIRS = {
  pure5: [220, 330],
  et5:   [220, 220 * 2 ** (7 / 12)],
  pure3: [220, 275],
  et3:   [220, 220 * 2 ** (4 / 12)],
};

let cmpActive = null;

document.querySelectorAll('[data-pair]').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (cmpActive && cmpActive !== btn) cmpActive.classList.remove('active');
    if (btn.classList.contains('active')) {
      audio.stop();
      btn.classList.remove('active');
      cmpActive = null;
    } else {
      const [f1, f2] = PAIRS[btn.dataset.pair];
      await audio.play(f1, f2, 'sine');
      btn.classList.add('active');
      cmpActive = btn;
    }
  });
});

document.getElementById('stop-all').addEventListener('click', () => {
  audio.stop();
  if (cmpActive) { cmpActive.classList.remove('active'); cmpActive = null; }
  if (ivActive)  { ivActive.textContent = '▶ Play'; ivActive.classList.remove('active'); ivActive = null; }
});

// ── ResizeObserver + init ─────────────────────────────────────────────────────

const ro = new ResizeObserver(() => {
  resizeHarmonic();
  resizeScale();
});
ro.observe(hCanvas.parentElement);
ro.observe(sCanvas.parentElement);

resizeHarmonic();
resizeScale();
updateScaleInfo();
startHarmonic();
