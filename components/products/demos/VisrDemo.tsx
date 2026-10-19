/**
 * VISR, the IntrinsicOS review desk, live on its product page — the same treatment as the
 * Tycho demo: front end only, invented data.
 *
 * The frame is an `<iframe>` over `public/visr-demo/`, the real desk vendored byte-for-byte
 * (`scripts/vendor-visr-demo.mjs`) plus a shim that plays the server against a small invented
 * queue (`public/visr-demo/demo/`): three made-up projects, made-up agents, made-up documents.
 * Acts (approve, accept, done, a document edit) move that queue in memory until the page
 * reloads; nothing leaves the browser. The iframe is the isolation boundary for the desk's
 * CSS, globals and fonts.
 *
 * VISR is a phone app, so the box is a phone: 9:16, centred, never wider than a phone and
 * never taller than most of the viewport, so the whole desk is on screen at once on a laptop.
 * Inside it the desk's own phone layout runs. `loading="lazy"` defers it until near the
 * viewport; the desk's power-on gate makes the first tap the visitor's.
 */
export function VisrDemo() {
  return (
    <section aria-label="Interactive demo" className="py-14">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="relative mx-auto aspect-[9/16] w-[min(100%,420px,calc(85svh*9/16))] overflow-hidden rounded-2xl border border-rule bg-black">
          <iframe
            src="/visr-demo/index.html"
            title="VISR — interactive demo with invented data"
            loading="lazy"
            // Same-origin and unsandboxed, as with the Tycho demo: our own code on our own
            // origin, and the desk keeps its place and drafts in localStorage.
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
        <p className="label mt-5 text-center">Interactive demo · invented data</p>
      </div>
    </section>
  );
}
