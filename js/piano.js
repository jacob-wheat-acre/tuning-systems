// Historical keyboard tuning — piano visualization

// ── Tuning systems ────────────────────────────────────────────────────────────
// cents[i] = pitch of chromatic degree i above C, within one octave
// wolf     = [semitone_low, semitone_high] or null
// wolfCents = actual size of the wolf fifth in cents

const PYTHAGOREAN_FIFTH = 1200 * Math.log2(3 / 2); // 701.955¢

function pythagoreanCents() {
  // Chain of pure 3:2 fifths from C. Wolf falls on G#(8)→Eb(3).
  const up   = [0, 7, 2, 9, 4, 11, 6, 1, 8];  // degrees reached going up
  const down = [5, 10, 3];                       // degrees reached going down
  const c = new Array(12).fill(0);
  up.forEach((deg, k) => {
    c[deg] = ((k * PYTHAGOREAN_FIFTH) % 1200 + 1200) % 1200;
  });
  down.forEach((deg, k) => {
    c[deg] = (((-(k + 1)) * PYTHAGOREAN_FIFTH) % 1200 + 1200) % 1200;
  });
  return c;
}

const MEANTONE_FIFTH = 696.578; // 3:2 minus ¼ syntonic comma → pure major thirds

function meantoneCents() {
  const up   = [0, 7, 2, 9, 4, 11, 6, 1, 8];
  const down = [5, 10, 3];
  const c = new Array(12).fill(0);
  up.forEach((deg, k) => {
    c[deg] = ((k * MEANTONE_FIFTH) % 1200 + 1200) % 1200;
  });
  down.forEach((deg, k) => {
    c[deg] = ((-(k + 1) * MEANTONE_FIFTH) % 1200 + 1200) % 1200;
  });
  return c;
}

const TEMPERED_FIFTH = PYTHAGOREAN_FIFTH - 23.46 / 4; // 696.09¢ — used in Werckmeister

function werckmeisterCents() {
  // Werckmeister III: C-G, G-D, D-A, B-F# tempered; rest pure
  let v = 0;
  const c = new Array(12).fill(0);
  const seq = [
    [7,  TEMPERED_FIFTH],
    [2,  TEMPERED_FIFTH],
    [9,  TEMPERED_FIFTH],
    [4,  PYTHAGOREAN_FIFTH],
    [11, PYTHAGOREAN_FIFTH],
    [6,  TEMPERED_FIFTH],
    [1,  PYTHAGOREAN_FIFTH],
    [8,  PYTHAGOREAN_FIFTH],
    [3,  PYTHAGOREAN_FIFTH],
    [10, PYTHAGOREAN_FIFTH],
    [5,  PYTHAGOREAN_FIFTH],
  ];
  seq.forEach(([deg, fifth]) => {
    v += fifth;
    c[deg] = ((v) % 1200 + 1200) % 1200;
  });
  return c;
}

const PYTH_C  = pythagoreanCents();
const MEAN_C  = meantoneCents();
const WERK_C  = werckmeisterCents();
const ET_C    = Array.from({length: 12}, (_, i) => i * 100);

// Wolf interval size: from G#(8) going up to Eb(3)
function wolfSize(cents) {
  return (cents[3] + 1200 - cents[8] + 1200) % 1200;
}

const TUNINGS = {
  pythagorean: {
    name: 'Pythagorean',
    color: '#ef9a9a',
    cents: PYTH_C,
    wolf: [8, 3],
    wolfSize: wolfSize(PYTH_C),
    sequence: 'Start on C. Tune upward by pure 3:2 fifths: C → G → D → A → E → B → F♯ → C♯ → G♯. Tune downward: C → F → B♭ → E♭. Where G♯ and E♭ share a key, the gap is absorbed as the wolf.',
    context: 'Major thirds are 81:64 ≈ 408¢ — 22¢ sharper than pure 5:4. The tuning sounds very clean on fifths and fourths but harsh on thirds. Rarely used on keyboard instruments after the Renaissance.',
  },
  meantone: {
    name: 'Meantone (¼ comma)',
    color: '#a5d6a7',
    cents: MEAN_C,
    wolf: [8, 3],
    wolfSize: wolfSize(MEAN_C),
    sequence: 'Same sequence as Pythagorean, but each fifth is narrowed by ¼ syntonic comma (≈5.4¢). This makes four stacked fifths equal exactly a pure major third plus two octaves. A skilled tuner listens for a specific beat rate per second in each fifth.',
    context: 'The dominant keyboard tuning from ~1500–1750. Major thirds in the "good" keys (C, G, D, F, B♭, E♭) are pure and transparent. The wolf fifth G♯→E♭ is 36¢ sharp — unmistakably harsh. Composers avoided keys that used it.',
  },
  werckmeister: {
    name: 'Werckmeister III',
    color: '#fff176',
    cents: WERK_C,
    wolf: null,
    wolfSize: null,
    sequence: 'Start on C. Four fifths (C→G, G→D, D→A, B→F♯) are each narrowed by ¼ Pythagorean comma (≈5.9¢). The remaining eight fifths are left pure (3:2). This distributes the comma unevenly — near-C keys get better thirds.',
    context: 'A "well temperament" — all 12 keys are usable, but they sound different from each other. Keys near C have nearly-pure major thirds; distant keys (F♯, C♯, G♯) have harsher thirds. Bach\'s Well-Tempered Clavier likely exploited exactly these contrasts.',
  },
  equal: {
    name: 'Equal Temperament',
    color: '#4fc3f7',
    cents: ET_C,
    wolf: null,
    wolfSize: null,
    sequence: 'Every fifth is narrowed by exactly 2¢ (700¢ instead of 702¢). Tuners set this by listening for a specific slow beat pattern between fifths. Modern tuners use electronic references.',
    context: 'All 12 keys sound identical. Major thirds are 400¢ — 14¢ sharper than pure. No wolf, no key character. Standard since the mid-19th century. Schubert and Chopin knew both ET and well temperaments.',
  },
};

// ── Note names ────────────────────────────────────────────────────────────────
const NOTE_NAMES  = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const IS_BLACK    = [false, true, false, true, false, false, true, false, true, false, true, false];

// White key index within an octave (null for black keys)
const WHITE_IDX   = [0, null, 1, null, 2, 3, null, 4, null, 5, null, 6];

// Black key left-edge x-offset (in white-key-widths from octave start)
const BLACK_OFFSET = [null, 0.595, null, 1.685, null, null, 3.59, null, 4.615, null, 5.665, null];

// Safe major keys (root semitone → whether wolf appears in the diatonic scale)
const MAJOR_KEYS = [
  {name:'C', root:0}, {name:'G', root:7}, {name:'D', root:2},
  {name:'A', root:9}, {name:'E', root:4}, {name:'B', root:11},
  {name:'F♯', root:6}, {name:'D♭', root:1}, {name:'A♭', root:8},
  {name:'E♭', root:3}, {name:'B♭', root:10}, {name:'F', root:5},
];

function isKeySafe(root, tuningKey) {
  const wolf = TUNINGS[tuningKey].wolf;
  if (!wolf) return 'neutral'; // ET or Werckmeister — no wolf
  const scale = [0, 2, 4, 5, 7, 9, 11].map(d => (d + root) % 12);
  return (scale.includes(wolf[0]) && scale.includes(wolf[1])) ? 'bad' : 'good';
}

// ── State ─────────────────────────────────────────────────────────────────────
let currentTuning = 'meantone';
let keys          = [];       // [{semitone, degree, octave, isBlack, x, y, w, h}]
let selected      = [];       // up to 2 selected semitones for interval display
let hovered       = null;
const touchNotes  = new Map(); // touch.identifier → { semitone }

// ── Canvas ────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('piano-canvas');
const ctx    = canvas.getContext('2d');

const NUM_OCTAVES = 2;
const NUM_WHITE   = NUM_OCTAVES * 7 + 1; // 15 white keys: C3→C5

function buildKeys() {
  const W  = canvas.width;
  const H  = canvas.height;
  const ww = W / NUM_WHITE;
  const wh = H;
  const bw = ww * 0.58;
  const bh = wh * 0.615;

  keys = [];
  for (let oct = 0; oct < NUM_OCTAVES; oct++) {
    for (let deg = 0; deg < 12; deg++) {
      const black = IS_BLACK[deg];
      let x, y, w, h;
      if (black) {
        x = (oct * 7 + BLACK_OFFSET[deg]) * ww;
        y = 0;
        w = bw;
        h = bh;
      } else {
        x = (oct * 7 + WHITE_IDX[deg]) * ww;
        y = 0;
        w = ww;
        h = wh;
      }
      keys.push({ semitone: oct * 12 + deg, degree: deg, octave: oct + 3, isBlack: black, x, y, w, h });
    }
  }
  // Final C (semitone 24 = C5)
  const ww14 = (NUM_WHITE - 1) * ww;
  keys.push({ semitone: 24, degree: 0, octave: 5, isBlack: false, x: ww14, y: 0, w: ww, h: wh });
}

function resizeCanvas() {
  const W = Math.min(canvas.parentElement.clientWidth - 32, 1040);
  canvas.width  = W;
  canvas.height = 180;
  buildKeys();
  draw();
}

window.addEventListener('resize', resizeCanvas);

// ── Drawing ───────────────────────────────────────────────────────────────────

// Color for a key based on its deviation from ET
function keyColor(degree, isBlack, isWolf, isSel, isHov, isTouchHeld) {
  if (isTouchHeld) {
    return isBlack ? '#00695c' : '#4db6ac'; // teal = actively held by finger
  }
  if (isSel) {
    return isBlack ? '#1565c0' : '#42a5f5';
  }
  if (isWolf) {
    return isBlack ? '#b71c1c' : '#ef5350';
  }
  if (isHov) {
    return isBlack ? '#333' : '#e0e0e0';
  }

  const tuning = TUNINGS[currentTuning];
  const dev    = Math.abs(tuning.cents[degree] - ET_C[degree]);

  if (isBlack) {
    // Dark keys: use saturation to show deviation
    const t = Math.min(dev / 28, 1);
    const h = Math.round(120 * (1 - t));
    const s = dev < 1 ? 0 : 55;
    const l = 22 + t * 10;
    return `hsl(${h},${s}%,${l}%)`;
  } else {
    const t = Math.min(dev / 28, 1);
    const h = Math.round(120 * (1 - t));
    const s = dev < 1 ? 0 : 50;
    const l = 80 - t * 18;
    return `hsl(${h},${s}%,${l}%)`;
  }
}

// Small deviation badge inside white key
function drawDevBadge(key) {
  const tuning = TUNINGS[currentTuning];
  const dev    = tuning.cents[key.degree] - ET_C[key.degree];
  if (Math.abs(dev) < 0.5) return;

  const sign  = dev > 0 ? '+' : '';
  const label = `${sign}${dev.toFixed(1)}¢`;
  const fs    = Math.max(key.w * 0.18, 9);

  ctx.save();
  ctx.font         = `${fs}px monospace`;
  ctx.fillStyle    = 'rgba(0,0,0,0.45)';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, key.x + key.w / 2, key.y + key.h - 6);
  ctx.restore();
}

function draw() {
  if (!canvas.width) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const tuning       = TUNINGS[currentTuning];
  const wolf         = tuning.wolf;
  const touchHeld    = new Set([...touchNotes.values()].map(n => n.semitone));

  // ── White keys ──
  for (const key of keys) {
    if (key.isBlack) continue;
    const isWolf      = wolf && wolf.includes(key.degree);
    const isSel       = selected.includes(key.semitone);
    const isHov       = hovered === key.semitone;
    const isTouchHeld = touchHeld.has(key.semitone);

    ctx.fillStyle   = keyColor(key.degree, false, isWolf, isSel, isHov, isTouchHeld);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth   = 1;
    roundRect(ctx, key.x + 0.5, key.y + 0.5, key.w - 1, key.h - 1, [0, 0, 5, 5]);
    ctx.fill();
    ctx.stroke();

    // Note name at bottom
    const fs = Math.max(key.w * 0.22, 10);
    ctx.save();
    ctx.font         = `${fs}px system-ui`;
    ctx.fillStyle    = isWolf ? '#b71c1c' : 'rgba(0,0,0,0.4)';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(NOTE_NAMES[key.degree], key.x + key.w / 2, key.y + key.h - 22);
    ctx.restore();

    drawDevBadge(key);
  }

  // ── Black keys ──
  for (const key of keys) {
    if (!key.isBlack) continue;
    const isWolf      = wolf && wolf.includes(key.degree);
    const isSel       = selected.includes(key.semitone);
    const isHov       = hovered === key.semitone;
    const isTouchHeld = touchHeld.has(key.semitone);

    ctx.fillStyle   = keyColor(key.degree, true, isWolf, isSel, isHov, isTouchHeld);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth   = 1;
    roundRect(ctx, key.x + 0.5, key.y + 0.5, key.w - 1, key.h - 1, [0, 0, 4, 4]);
    ctx.fill();
    ctx.stroke();

    // Note name
    const fs = Math.max(key.w * 0.22, 8);
    ctx.save();
    ctx.font         = `${fs}px system-ui`;
    ctx.fillStyle    = 'rgba(255,255,255,0.55)';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(NOTE_NAMES[key.degree], key.x + key.w / 2, key.y + key.h - 5);
    ctx.restore();
  }

  // ── Wolf bracket above piano ──
  if (wolf) {
    const wolfKeys = keys.filter(k => wolf.includes(k.degree) && k.octave === 4);
    if (wolfKeys.length === 2) {
      const [kL, kR] = wolfKeys.sort((a, b) => a.x - b.x);
      const x1 = kL.x + kL.w * 0.5;
      const x2 = kR.x + kR.w * 0.5;
      const y  = -18;

      ctx.save();
      ctx.strokeStyle = '#ef5350';
      ctx.lineWidth   = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, y + 8);
      ctx.lineTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.lineTo(x2, y + 8);
      ctx.stroke();
      ctx.setLineDash([]);

      const mid = (x1 + x2) / 2;
      ctx.font         = 'bold 11px system-ui';
      ctx.fillStyle    = '#ef5350';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`wolf fifth  ${tuning.wolfSize.toFixed(0)}¢`, mid, y - 2);
      ctx.restore();
    }
  }
}

function roundRect(ctx, x, y, w, h, radii) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radii);
}

// ── Hit detection ─────────────────────────────────────────────────────────────

function keyAt(px, py) {
  // Check black keys first (they render on top)
  for (const k of keys) {
    if (!k.isBlack) continue;
    if (px >= k.x && px <= k.x + k.w && py >= k.y && py <= k.y + k.h) return k;
  }
  for (const k of keys) {
    if (k.isBlack) continue;
    if (px >= k.x && px <= k.x + k.w && py >= k.y && py <= k.y + k.h) return k;
  }
  return null;
}

function canvasPos(clientX, clientY) {
  const r  = canvas.getBoundingClientRect();
  const sx = canvas.width / r.width;
  const sy = canvas.height / r.height;
  return [(clientX - r.left) * sx, (clientY - r.top) * sy];
}

// ── Audio ─────────────────────────────────────────────────────────────────────

function setAudioStatus(msg) {
  const el = document.getElementById('audio-status');
  if (el) el.textContent = msg;
}

// C3 = 130.813 Hz (A4=440 → C3 = 440 × 2^(-21/12))
const C3_HZ = 130.813;

function semitoneFreq(semitone, tuningKey) {
  const degree = semitone % 12;
  const octave = Math.floor(semitone / 12);
  const cents  = TUNINGS[tuningKey].cents[degree];
  return C3_HZ * Math.pow(2, octave + cents / 1200);
}

// Build a WAV blob: sine wave with linear fade-out envelope.
// Notes are played via HTML <audio> rather than Web Audio API.
// AudioContext.destination uses iOS's 'ambient' audio session (silenced by
// software mute) and the MediaStreamDestination workaround triggers AGC-driven
// looping artifacts. HTML <audio> uses the 'playback' session with no issues.
function makeWavBlob(freq, duration) {
  const sr  = 22050;
  const n   = Math.floor(sr * duration);
  const buf = new ArrayBuffer(44 + n * 2);
  const v   = new DataView(buf);
  let   o   = 0;
  const str = s => { for (let i = 0; i < s.length; i++) v.setUint8(o++, s.charCodeAt(i)); };
  str('RIFF'); v.setUint32(o, 36 + n * 2, true); o += 4;
  str('WAVE'); str('fmt ');
  v.setUint32(o, 16, true);     o += 4;
  v.setUint16(o, 1, true);      o += 2;
  v.setUint16(o, 1, true);      o += 2;
  v.setUint32(o, sr, true);     o += 4;
  v.setUint32(o, sr * 2, true); o += 4;
  v.setUint16(o, 2, true);      o += 2;
  v.setUint16(o, 16, true);     o += 2;
  str('data'); v.setUint32(o, n * 2, true); o += 4;
  for (let i = 0; i < n; i++) {
    const t   = i / sr;
    const env = Math.max(0, 1 - t / duration);
    v.setInt16(o, Math.round(Math.sin(2 * Math.PI * freq * t) * env * 16383), true);
    o += 2;
  }
  return new Blob([buf], { type: 'audio/wav' });
}

// Blob URL cache: freq.toFixed(2) → object URL
// Pre-populated for every key whenever the tuning changes so there is no
// WAV generation cost at keypress time.
const _noteUrls = new Map();

function _noteUrl(freq) {
  const k = freq.toFixed(2);
  if (!_noteUrls.has(k)) _noteUrls.set(k, URL.createObjectURL(makeWavBlob(freq, 1.4)));
  return _noteUrls.get(k);
}

function warmupNotes() {
  for (const key of keys) _noteUrl(semitoneFreq(key.semitone, currentTuning));
}

function scheduleNote(freq) {
  const el = new Audio(_noteUrl(freq));
  el.play().catch(() => {});
  setAudioStatus(`${freq.toFixed(1)} Hz`);
}

function playKey(semitone, tuningKey) {
  scheduleNote(semitoneFreq(semitone, tuningKey));
}

function playInterval(s1, s2, tuningKey) {
  scheduleNote(semitoneFreq(s1, tuningKey));
  scheduleNote(semitoneFreq(s2, tuningKey));
}

document.getElementById('test-audio-btn').addEventListener('click', () => scheduleNote(440));

// ── UI updates ────────────────────────────────────────────────────────────────

function noteLabel(semitone) {
  const degree = semitone % 12;
  const octave = Math.floor(semitone / 12) + 3;
  return NOTE_NAMES[degree] + octave;
}

function updateNoteCard() {
  const card = document.getElementById('note-card');
  const tuning = TUNINGS[currentTuning];

  if (selected.length === 0) {
    card.innerHTML = '<h3>Selected notes</h3><p style="color:var(--text-dim);font-size:0.82rem;">Tap a key to hear it.<br>Tap a second key to see the interval.</p>';
    return;
  }

  const sorted = [...selected].sort((a, b) => a - b);
  let html = '<h3>Selected notes</h3>';

  sorted.forEach(s => {
    const deg  = s % 12;
    const freq = semitoneFreq(s, currentTuning).toFixed(2);
    const dev  = tuning.cents[deg] - ET_C[deg];
    const sign = dev >= 0 ? '+' : '';
    const col  = tuning.color;
    html += `<div class="note-pair">
      <span class="note-badge" style="color:${col}">${noteLabel(s)}</span>
      <span class="note-hz">${freq} Hz &nbsp; <span style="color:${col}">${sign}${dev.toFixed(2)}¢ from ET</span></span>
    </div>`;
  });

  if (sorted.length === 2) {
    const [s1, s2] = sorted;
    const f1    = semitoneFreq(s1, currentTuning);
    const f2    = semitoneFreq(s2, currentTuning);
    const actualCents = 1200 * Math.log2(f2 / f1);
    const etCents     = (s2 - s1) * 100;
    const pureCents   = nearestPureCents(s2 - s1);
    const fromPure    = actualCents - pureCents;
    const fromET      = actualCents - etCents;
    const sign1       = fromET >= 0 ? '+' : '';
    const sign2       = fromPure >= 0 ? '+' : '';

    html += `<div class="interval-line" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
      <span class="interval-cents" style="color:${Math.abs(fromPure) > 15 ? '#ef5350' : Math.abs(fromPure) > 5 ? '#ffb74d' : '#a5d6a7'}">
        ${actualCents.toFixed(2)}¢
      </span>
      &nbsp; ${sign1}${fromET.toFixed(2)}¢ from ET &nbsp;|&nbsp; ${sign2}${fromPure.toFixed(2)}¢ from pure
    </div>`;
  }

  card.innerHTML = html;
}

function updateWolfCard() {
  const tuning  = TUNINGS[currentTuning];
  const content = document.getElementById('wolf-content');
  if (!tuning.wolf) {
    content.innerHTML = `<p style="color:var(--accent-just, #a5d6a7);font-size:0.82rem;">No wolf fifth in ${tuning.name}.<br>All fifths are usable.</p>`;
    return;
  }
  const wolfDev = tuning.wolfSize - 702;
  const sign    = wolfDev >= 0 ? '+' : '';
  content.innerHTML = `
    <div class="wolf-label">G♯ → E♭</div>
    <div class="wolf-sub">
      <strong>${tuning.wolfSize.toFixed(1)}¢</strong> &nbsp;
      <span style="color:#ef5350">${sign}${wolfDev.toFixed(1)}¢ from pure</span>
      <br>
      ${Math.abs(wolfDev) > 30
        ? 'Very dissonant — beats rapidly and audibly.'
        : Math.abs(wolfDev) > 15
          ? 'Noticeably off — clearly audible beating.'
          : 'Slightly off — subtle.'}
      <br><br>
      <span style="opacity:0.7">Click G♯ then E♭ on the keyboard to hear it.</span>
    </div>`;
}

function updateSafeGrid() {
  const grid = document.getElementById('safe-grid');
  grid.innerHTML = MAJOR_KEYS.map(k => {
    const safety = isKeySafe(k.root, currentTuning);
    return `<div class="safe-key ${safety}">${k.name}</div>`;
  }).join('');
}

function updateTuningDesc() {
  const t = TUNINGS[currentTuning];
  document.getElementById('tuning-sequence').textContent = t.sequence;
  document.getElementById('tuning-context').textContent  = t.context;
}

// ── Interval helpers ──────────────────────────────────────────────────────────

const PURE_CENTS_MAP = {
  1:  111.73, // minor second (16:15)
  2:  203.91, // major second (9:8)
  3:  315.64, // minor third (6:5)
  4:  386.31, // major third (5:4)
  5:  498.04, // perfect fourth (4:3)
  6:  582.51, // tritone (45:32)
  7:  701.96, // perfect fifth (3:2)
  8:  813.69, // minor sixth (8:5)
  9:  884.36, // major sixth (5:3)
  10: 1017.60,// minor seventh (9:5)
  11: 1088.27,// major seventh (15:8)
  12: 1200.00,// octave (2:1)
};

function nearestPureCents(semitones) {
  return PURE_CENTS_MAP[Math.abs(semitones)] ?? Math.abs(semitones) * 100;
}

// ── Events ────────────────────────────────────────────────────────────────────

function handleKeyTap(clientX, clientY) {
  const [px, py] = canvasPos(clientX, clientY);
  const key = keyAt(px, py);
  if (!key) return;

  if (selected.includes(key.semitone)) {
    selected = selected.filter(s => s !== key.semitone);
    playKey(key.semitone, currentTuning);
  } else if (selected.length < 2) {
    selected.push(key.semitone);
    if (selected.length === 2) {
      playInterval(selected[0], selected[1], currentTuning);
    } else {
      playKey(key.semitone, currentTuning);
    }
  } else {
    selected = [selected[1], key.semitone];
    playInterval(selected[0], selected[1], currentTuning);
  }

  draw();
  updateNoteCard();
}

canvas.addEventListener('click', e => {
  handleKeyTap(e.clientX, e.clientY);
});

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    const [px, py] = canvasPos(touch.clientX, touch.clientY);
    const key = keyAt(px, py);
    if (!key) continue;
    scheduleNote(semitoneFreq(key.semitone, currentTuning));
    touchNotes.set(touch.identifier, { semitone: key.semitone });
  }
  draw();
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    const existing = touchNotes.get(touch.identifier);
    if (!existing) continue;
    const [px, py] = canvasPos(touch.clientX, touch.clientY);
    const key = keyAt(px, py);
    if (!key || key.semitone === existing.semitone) continue;
    scheduleNote(semitoneFreq(key.semitone, currentTuning));
    touchNotes.set(touch.identifier, { semitone: key.semitone });
    draw();
  }
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  for (const touch of e.changedTouches) touchNotes.delete(touch.identifier);
  draw();
}, { passive: false });

canvas.addEventListener('touchcancel', () => { touchNotes.clear(); draw(); });

canvas.addEventListener('mousemove', e => {
  const [px, py] = canvasPos(e.clientX, e.clientY);
  const key = keyAt(px, py);
  const prev = hovered;
  hovered = key ? key.semitone : null;
  if (hovered !== prev) draw();
});

canvas.addEventListener('mouseleave', () => {
  hovered = null;
  draw();
});

document.querySelectorAll('.tuning-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tuning-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTuning = btn.dataset.tuning;
    selected = [];
    touchNotes.clear();
    draw();
    updateNoteCard();
    updateWolfCard();
    updateSafeGrid();
    updateTuningDesc();
    warmupNotes();
  });
});


// ── Boot ──────────────────────────────────────────────────────────────────────

resizeCanvas();
warmupNotes();
updateNoteCard();
updateWolfCard();
updateSafeGrid();
updateTuningDesc();
