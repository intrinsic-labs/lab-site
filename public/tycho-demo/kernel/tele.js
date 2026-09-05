/* TYCHO KERNEL · telemetry — Tele: per-label process tracing (tyc-10 vocabulary). */
"use strict";

/* -------------------------------------------------------------- telemetry
   Process tracing per labeled item (tyc-10 vocabulary): render → first input →
   selection trajectory → commit. pointerType comes from the first real input. */
class Tele {
  constructor(itemId) {
    this.item = itemId;
    this.render = Date.now();
    this.first = null;
    this.trace = [];
    this.pointer = null;
  }
  input(e) {
    if (this.first === null) {
      this.first = Date.now() - this.render;
      this.pointer = e?.pointerType || (e?.type?.startsWith("key") ? "key" : null);
    }
  }
  pick(choice) { this.trace.push({ ms: Date.now() - this.render, choice }); }
  payload(notesLen) {
    return {
      render_ts: this.render,
      first_input_ms: this.first,
      hesitation_ms: Date.now() - this.render,
      selection_trace: this.trace,
      notes_len: notesLen ?? null,
      pointer: this.pointer,
      viewport: `${innerWidth}x${innerHeight}`,
    };
  }
}
