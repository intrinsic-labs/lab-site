/* TYCHO KERNEL · sound — the OS's whole voice: chime, power, tick, click, flip, commit. One switch, persisted per device. */
"use strict";

/* ---------------------------------------------------------------- sound */
const Sound = {
  on: JSON.parse(localStorage.getItem("tycho.sound") ?? "true"),
  ctx: null,
  _ac() { return this.ctx ??= new (window.AudioContext || window.webkitAudioContext)(); },
  tone(freq, t0, dur, gain = 0.08, type = "triangle") {
    const ac = this._ac(), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, ac.currentTime + t0);
    g.gain.linearRampToValueAtTime(gain, ac.currentTime + t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t0 + dur);
    o.connect(g).connect(ac.destination);
    o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + dur + 0.05);
  },
  chime() {          /* the bloom chime — Pacific Bell energy, three-up + octave */
    if (!this.on) return;
    try {
      this.tone(392.0, 0.00, 0.45);        /* G4 */
      this.tone(523.25, 0.16, 0.45);       /* C5 */
      this.tone(659.25, 0.32, 0.55);       /* E5 */
      this.tone(1046.5, 0.50, 0.9, 0.05, "sine"); /* C6 shimmer */
    } catch { /* audio unavailable — boot silently */ }
  },
  power() {          /* low C/G swell: the tube wakes before the picture does */
    if (!this.on) return;
    try {
      this.tone(65.41, 0.00, 1.60, 0.025, "sine"); /* C2 */
      this.tone(98.00, 0.18, 1.25, 0.018, "sine"); /* G2 */
    } catch { /* audio unavailable — boot silently */ }
  },
  tick() { if (this.on) try { this.tone(784, 0, 0.055, 0.025, "square"); } catch {} },
  resolve() {
    if (!this.on) return;
    try {
      this.tone(523.25, 0.00, 0.32, 0.035, "sine"); /* C5 */
      this.tone(783.99, 0.10, 0.55, 0.03, "sine");  /* G5 */
    } catch { /* audio unavailable — boot silently */ }
  },
  /* a card flipping over on its rings: a dry, low tap — not the click */
  flip() { if (this.on) try { this.tone(220, 0, 0.04, 0.05, "square"); this.tone(330, 0.035, 0.06, 0.03, "triangle"); } catch {} },
  click() { if (this.on) try { this.tone(880, 0, 0.05, 0.03, "square"); } catch {} },
  commit() { if (this.on) try { this.tone(523.25, 0, 0.09, 0.05); this.tone(783.99, 0.08, 0.14, 0.05); } catch {} },
  toggle() {
    this.on = !this.on;
    localStorage.setItem("tycho.sound", JSON.stringify(this.on));
    return this.on;
  },
};
