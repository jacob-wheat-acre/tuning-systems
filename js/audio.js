// Web Audio engine: two oscillators for interval playback

export class AudioEngine {
  constructor() {
    this.ctx        = null;
    this.osc1       = null;
    this.osc2       = null;
    this.masterGain = null;
    this.playing    = false;
    this._freq1     = 0;
    this._freq2     = 0;
  }

  async _ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    // Browsers may suspend the context even after a user gesture on some versions.
    // Awaiting resume() ensures nodes are usable before we start them.
    if (this.ctx.state !== 'running') {
      await this.ctx.resume();
    }
  }

  async play(freq1, freq2, waveform = 'sine') {
    await this._ensureContext();
    this._killNodes(); // hard-stop any previous nodes before creating new ones

    this.masterGain = this.ctx.createGain();
    // Start silent, ramp up — single clean automation event, no conflict
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.45, this.ctx.currentTime + 0.03);
    this.masterGain.connect(this.ctx.destination);

    this.osc1 = this._makeOsc(freq1, waveform);
    this.osc2 = this._makeOsc(freq2, waveform);

    this.osc1.connect(this.masterGain);
    this.osc2.connect(this.masterGain);

    this.osc1.start();
    this.osc2.start();

    this.playing = true;
    this._freq1  = freq1;
    this._freq2  = freq2;
  }

  _makeOsc(freq, type) {
    const osc      = this.ctx.createOscillator();
    osc.type       = type;
    osc.frequency.value = freq;
    return osc;
  }

  // Hard-kill: immediately stop and disconnect nodes, capturing current refs first
  _killNodes() {
    const { osc1, osc2, masterGain } = this;
    if (osc1)       { try { osc1.stop(); }       catch(e) {} }
    if (osc2)       { try { osc2.stop(); }       catch(e) {} }
    if (masterGain) { masterGain.disconnect(); }
    this.osc1       = null;
    this.osc2       = null;
    this.masterGain = null;
  }

  stop() {
    if (!this.playing) return;

    // Capture current node refs before we null them
    const { osc1, osc2, masterGain, ctx } = this;
    const t = ctx.currentTime;

    masterGain.gain.linearRampToValueAtTime(0, t + 0.05);

    // Stop oscillators after fade completes
    setTimeout(() => {
      try { osc1.stop(); }       catch(e) {}
      try { osc2.stop(); }       catch(e) {}
      masterGain.disconnect();
    }, 70);

    this.osc1       = null;
    this.osc2       = null;
    this.masterGain = null;
    this.playing    = false;
  }

  setFrequencies(freq1, freq2) {
    if (!this.playing || !this.osc1) return;
    const t = this.ctx.currentTime;
    this.osc1.frequency.linearRampToValueAtTime(freq1, t + 0.05);
    this.osc2.frequency.linearRampToValueAtTime(freq2, t + 0.05);
    this._freq1 = freq1;
    this._freq2 = freq2;
  }

  getFrequencies() {
    return [this._freq1, this._freq2];
  }

  // Play a short note burst (for step-through UIs like the comma visualizer)
  async playShort(freq1, freq2, durationMs = 600, waveform = 'sine') {
    await this._ensureContext();
    const ctx = this.ctx;
    const t   = ctx.currentTime;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
    gain.gain.setValueAtTime(0.35, t + durationMs / 1000 - 0.05);
    gain.gain.linearRampToValueAtTime(0, t + durationMs / 1000);
    gain.connect(ctx.destination);

    for (const freq of [freq1, freq2]) {
      const osc      = ctx.createOscillator();
      osc.type       = waveform;
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + durationMs / 1000 + 0.05);
    }
  }
}
