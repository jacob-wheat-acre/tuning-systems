import { TUNING_SYSTEMS, INTERVALS, getCentsDeviation } from './tuning.js';
import { AudioEngine } from './audio.js';
import { LissajousRenderer } from './lissajous.js';

const audio = new AudioEngine();
let lissajous = null;

let state = {
  tuning: 'just',
  interval: 7,   // perfect fifth (semitones above root)
  rootSemitone: 0, // 0 = A4
  playing: false,
  waveform: 'sine',
};

// ── DOM refs ────────────────────────────────────────────────────────────────

const canvas = document.getElementById('lissajous-canvas');
const playBtn = document.getElementById('play-btn');
const tuningBtns = document.querySelectorAll('.tuning-btn');
const intervalSelect = document.getElementById('interval-select');
const waveformSelect = document.getElementById('waveform-select');
const freq1Display = document.getElementById('freq1');
const freq2Display = document.getElementById('freq2');
const centsDisplay = document.getElementById('cents-dev');
const ratioDisplay = document.getElementById('ratio-display');
const intervalNameDisplay = document.getElementById('interval-name');
const phaseSlider = document.getElementById('phase-slider');

// ── Init ─────────────────────────────────────────────────────────────────────

function init() {
  // Populate interval selector
  INTERVALS.forEach(iv => {
    const opt = document.createElement('option');
    opt.value = iv.semitones;
    opt.textContent = `${iv.name} (${iv.semitones} st) — ${iv.ratio}`;
    if (iv.semitones === state.interval) opt.selected = true;
    intervalSelect.appendChild(opt);
  });

  // Canvas sizing
  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    if (lissajous) lissajous.resize();
  });

  // Lissajous renderer
  lissajous = new LissajousRenderer(canvas);
  lissajous.setColor(TUNING_SYSTEMS[state.tuning].color);

  updateFrequencies();
  updateInfoPanel();
}

function resizeCanvas() {
  const container = canvas.parentElement;
  const size = Math.min(container.clientWidth, container.clientHeight, 540);
  canvas.width = size;
  canvas.height = size;
}

// ── State helpers ─────────────────────────────────────────────────────────────

function getFrequencies() {
  const system = TUNING_SYSTEMS[state.tuning];
  const f1 = system.freq(state.rootSemitone);
  const f2 = system.freq(state.rootSemitone + state.interval);
  return [f1, f2];
}

function updateFrequencies() {
  const [f1, f2] = getFrequencies();

  if (lissajous) {
    lissajous.setFrequencies(f1, f2);
    lissajous.setColor(TUNING_SYSTEMS[state.tuning].color);
  }

  if (state.playing) {
    audio.setFrequencies(f1, f2);
  }

  // Update displays
  freq1Display.textContent = f1.toFixed(2) + ' Hz';
  freq2Display.textContent = f2.toFixed(2) + ' Hz';

  const deviation = state.interval === 0 ? 0 : getCentsDeviation(state.rootSemitone + state.interval, state.tuning) - getCentsDeviation(state.rootSemitone, state.tuning);
  const sign = deviation >= 0 ? '+' : '';
  centsDisplay.textContent = `${sign}${deviation.toFixed(2)} ¢ from ET`;
  centsDisplay.style.color = Math.abs(deviation) < 2 ? '#a5d6a7'
    : Math.abs(deviation) < 10 ? '#fff176'
    : '#ef9a9a';
}

function updateInfoPanel() {
  const iv = INTERVALS.find(i => i.semitones === state.interval) || { name: '—', ratio: '—' };
  intervalNameDisplay.textContent = iv.name;
  ratioDisplay.textContent = `Just ratio: ${iv.ratio}`;
}

// ── Event listeners ───────────────────────────────────────────────────────────

playBtn.addEventListener('click', async () => {
  if (state.playing) {
    audio.stop();
    lissajous.stop();
    state.playing = false;
    playBtn.textContent = 'Play';
    playBtn.classList.remove('active');
  } else {
    const [f1, f2] = getFrequencies();
    playBtn.disabled = true;
    await audio.play(f1, f2, state.waveform);
    playBtn.disabled = false;
    lissajous.start();
    state.playing = true;
    playBtn.textContent = 'Stop';
    playBtn.classList.add('active');
  }
});

tuningBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tuningBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.tuning = btn.dataset.tuning;
    updateFrequencies();
    updateInfoPanel();
  });
});

intervalSelect.addEventListener('change', () => {
  state.interval = parseInt(intervalSelect.value);
  updateFrequencies();
  updateInfoPanel();
});

waveformSelect.addEventListener('change', () => {
  state.waveform = waveformSelect.value;
  if (state.playing) {
    // Restart with new waveform
    audio.stop();
    const [f1, f2] = getFrequencies();
    audio.play(f1, f2, state.waveform);
  }
});

phaseSlider.addEventListener('input', () => {
  const phase = (parseFloat(phaseSlider.value) / 100) * Math.PI * 2;
  if (lissajous) lissajous.setPhase(phase);
  document.getElementById('phase-label').textContent =
    `${Math.round(parseFloat(phaseSlider.value) / 100 * 360)}°`;
});

// ── Boot ─────────────────────────────────────────────────────────────────────
init();
