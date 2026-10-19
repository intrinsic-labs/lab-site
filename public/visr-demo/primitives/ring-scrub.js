/* RING SCRUB — the motion of a deck dragged by its rings.

   The flip card's spiral ticks are a scrubber (Asher, 2026-10-05). This file
   is only the hand: it turns a finger on the strips into a POSITION along the
   deck, in cards, a float, and knows nothing about how a card is drawn.

   RELATIVE, not absolute. The first scrubber mapped the finger's height to a
   card across the whole deck, about 15px a card with twenty cards, which no
   finger can hold still on. Now the deck moves by the distance the finger
   travels: one STEP of travel (34px on the phone, scaled with the deck's
   zoom on a tablet) is one card. Down is forward, the way the top panel
   folds down when it is tapped.

   SPEED IS GAIN. A slow drag stays one card a step; past SLOW px/ms each
   pixel counts for more, up to MAX_GAIN, so a quick swipe goes further.

   INERTIA. A release with speed keeps going with exponential friction (TAU)
   and lands on a whole card: the coast's natural end is projected, rounded,
   and the decay aimed at it. A hard flick crosses a twenty-card deck; a
   slow release stops where it is. A touch stops the coast. Positions are unbounded; the deck wraps them.

     const s = Tycho.ringScrub({ strips, scale: () => zoom,
       onMove: pos => {}, onSettle: pos => {} });   // pos: whole card on settle
     s.stop() · s.moving · s.speed   // cards per ms, smoothed */
"use strict";

Tycho.ringScrub = function ringScrub(o) {
  /* STEP px a card · SLOW px/ms before the gain starts · GAIN per px/ms
     past it, up to MAX_GAIN · TAU ms the coast's friction · FLICK px/ms the
     least release that coasts · MAX_COAST cards/ms the fastest coast */
  const STEP = 34, SLOW = 0.35, GAIN = 0.6, MAX_GAIN = 3;
  const TAU = 250, FLICK = 0.25, MAX_COAST = 0.06, IDLE_MS = 70;
  let pos = 0, last = null, vel = 0, frame = 0, coast = null, down = false;

  const step = () => STEP * (o.scale?.() || 1);
  /* the gain reads the finger's speed in the deck's own pixels, so a zoomed
     tablet deck answers a swipe the way the phone does */
  const gain = v => Math.min(MAX_GAIN, 1 + GAIN * Math.max(0, Math.abs(v) / (o.scale?.() || 1) - SLOW));

  function stop() {
    cancelAnimationFrame(frame); frame = 0; coast = null;
  }
  function settle() {
    stop(); vel = 0;
    pos = Math.round(pos);
    o.onMove(pos);
    o.onSettle(pos);
  }

  /* the coast: pos(t) = from + (to - from)(1 - e^(-t/TAU)), `to` a whole card */
  function glide(now) {
    const t = now - coast.t0;
    const k = Math.exp(-t / TAU);
    pos = coast.to + (coast.from - coast.to) * k;
    vel = (coast.to - coast.from) * k / TAU;
    o.onMove(pos);
    if (Math.abs(coast.to - pos) < 0.02) return settle();
    frame = requestAnimationFrame(glide);
  }

  function press(e, strip) {
    if (e.button !== 0 || !o.enabled()) return;
    e.preventDefault();
    strip.setPointerCapture?.(e.pointerId);
    stop(); vel = 0;
    down = true;
    last = { y: e.clientY, t: e.timeStamp, px: 0 };
    o.onStart?.();
  }
  function drag(e) {
    if (!down) return;
    const dy = e.clientY - last.y, dt = Math.max(1, e.timeStamp - last.t);
    if (!dy) return;
    /* finger speed, px/ms, smoothed so one jittery sample is not a flick */
    last.px = last.px * 0.4 + (dy / dt) * 0.6;
    const d = dy / step() * gain(last.px);
    pos += d;
    vel = vel * 0.4 + (d / dt) * 0.6;
    last.y = e.clientY; last.t = e.timeStamp;
    o.onMove(pos);
  }
  function release(e) {
    if (!down) return;
    down = false;
    /* a finger that paused before lifting has no speed left to give */
    const idle = e.timeStamp - last.t > IDLE_MS;
    if (idle || Math.abs(last.px) < FLICK) return settle();
    /* the coast carries the finger's own speed, without the drag's gain: the
       gain already spent the swipe's distance once */
    const v = Math.max(-MAX_COAST, Math.min(MAX_COAST, last.px / step()));
    const to = Math.round(pos + v * TAU);
    if (to === Math.round(pos) && Math.abs(to - pos) < 0.5) return settle();
    coast = { from: pos, to, t0: performance.now() };
    frame = requestAnimationFrame(glide);
  }

  for (const s of o.strips) {
    s.addEventListener("pointerdown", e => press(e, s));
    s.addEventListener("pointermove", drag);
    s.addEventListener("pointerup", release);
    s.addEventListener("pointercancel", release);
  }
  return {
    stop() { stop(); down = false; vel = 0; },
    /* the deck moved by other means (a tap, a set): follow it */
    at(p) { pos = p; },
    get moving() { return down || !!coast; },
    get speed() { return Math.abs(vel); },
  };
};
