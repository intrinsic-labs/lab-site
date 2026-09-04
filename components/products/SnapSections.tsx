"use client";

import { useEffect } from "react";

/**
 * Turns the DOCUMENT scroller into a snap container for as long as `/products` is mounted.
 *
 * It has to be the document element, because that is what scrolls the page — a wrapper `div`
 * with `scroll-snap-type` on it does nothing when the wrapper is not itself a scroller. And
 * it has to be an effect rather than a rule in `globals.css` or a hoisted `<style>`, because
 * both of those would leak the behaviour onto every other route: the cleanup here is what
 * guarantees a client-side navigation away from this page leaves the scroller as it found it.
 *
 * `proximity`, never `mandatory` (Asher's spec) — mandatory hijacks the scroll and traps a
 * reader mid-section. And desktop only: on a phone every section is already a screenful and
 * snapping fights native momentum scrolling.
 */
const DESKTOP = "(min-width: 1024px)";

export function SnapSections() {
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const apply = () => {
      document.documentElement.style.scrollSnapType = mq.matches ? "y proximity" : "";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.documentElement.style.scrollSnapType = "";
    };
  }, []);

  return null;
}
