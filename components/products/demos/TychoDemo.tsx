/**
 * The TychoOS shell, live, on the Tycho product page — in place of screenshots (Asher,
 * 2026-09-04: "it's already a web app… ditch the screenshots and instead inline an
 * interactive prototype", front-end only, mock data).
 *
 * The frame is an `<iframe>` over `public/tycho-demo/`, the real shell vendored byte-for-byte
 * (`scripts/vendor-tycho-demo.mjs`) plus a `fetch` shim that plays the server against a
 * synthetic corpus (`public/tycho-demo/demo/`). The iframe is the isolation boundary: the
 * shell's CSS, globals, fonts and three.js never touch the site, and the site's never touch it.
 * Nothing in the corpus is real — an invented field survey, invented correspondence.
 *
 * Sizing follows the shell's own frame, which is 4:3 letterboxed on the ground colour — so the
 * box is 4:3 here and a phone gets a taller box, where the shell's own ≤760px layout takes over
 * inside. `loading="lazy"` defers the ~1.3 MB (three.js is most of it) until the frame is near
 * the viewport; the shell's power-on gate then makes the first tap the visitor's, which is also
 * what lets its boot chime play (a synthetic tap can't unlock audio).
 */
export function TychoDemo() {
  return (
    <section aria-label="Interactive demo" className="py-14">
      <div className="mx-auto max-w-6xl px-0 sm:px-6">
        <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden border-y border-rule bg-black sm:aspect-[4/3] sm:rounded-xl sm:border">
          <iframe
            src="/tycho-demo/index.html"
            title="TychoOS — interactive demo with synthetic data"
            loading="lazy"
            // Same-origin, so the shell's localStorage (text size, device settings) works;
            // no `allow-same-origin` escape hatch is needed because there is no sandbox —
            // this is our own code on our own origin.
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
        <p className="label mt-5 px-6 text-center sm:px-0">Interactive demo · synthetic data</p>
      </div>
    </section>
  );
}
