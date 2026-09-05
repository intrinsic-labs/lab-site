/* ANIM — the scene's tween engine, and nothing else.

   Deliberately tiny and deliberately NOT a general animation library: the
   drawer only ever moves numbers on plain objects (a group's `position.z`, a
   folder's `pop`, an overlay's `fade`), so a tween is a target + a key + an
   arrival time. Keeping it here means the rig and the overlay both animate
   through one clock, so a roll-out and the label plate's fade cannot drift
   apart by a frame.

   The contract the whole drawer rests on: `step()` returns whether anything
   is still moving, and that boolean is the ONLY thing that decides whether
   another rAF is scheduled. Idle costs zero frames. */
"use strict";

export const Ease = {
  /* the roll-out: fast off the mark, settling into the stop — a drawer on
     real slides, not a spring */
  out: t => 1 - Math.pow(1 - t, 3),
  /* the roll-shut half of a stratum change: it has to feel driven, not fallen */
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  in: t => t * t * t,
  linear: t => t,
};

export class Tweens {
  constructor() { this.list = []; }

  /* Replaces any live tween on the same target+key rather than stacking a
     second one on it — walking the stack quickly is the normal case, and two
     tweens fighting over one number is how a stack starts to jitter. */
  to(target, key, to, dur, easing = Ease.out, done = null) {
    const from = target[key];
    if (from === to && !done) { this.cancel(target, key); return; }
    this.cancel(target, key);
    this.list.push({ target, key, from, to, dur: Math.max(1, dur),
                     ease: easing, t0: 0, done });
  }

  /* jump there now, killing any tween — used when a drawer is rebuilt under
     an animation that no longer describes anything on screen */
  set(target, key, value) {
    this.cancel(target, key);
    target[key] = value;
  }

  cancel(target, key) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      if (tw.target === target && tw.key === key) this.list.splice(i, 1);
    }
  }

  clear() { this.list.length = 0; }

  get active() { return this.list.length > 0; }

  /* `now` is the rAF timestamp. t0 is stamped on first sight rather than at
     construction, so a tween created while the tab was backgrounded doesn't
     arrive already finished. */
  step(now) {
    if (!this.list.length) return false;
    const finished = [];
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      if (!tw.t0) tw.t0 = now;
      const p = Math.min(1, (now - tw.t0) / tw.dur);
      tw.target[tw.key] = tw.from + (tw.to - tw.from) * tw.ease(p);
      if (p >= 1) { this.list.splice(i, 1); if (tw.done) finished.push(tw.done); }
    }
    /* callbacks run AFTER the list is settled, so a `done` that starts the
       next leg of a sequence (roll shut → roll open) isn't spliced out from
       underneath itself */
    for (const fn of finished) fn();
    return true;
  }
}
