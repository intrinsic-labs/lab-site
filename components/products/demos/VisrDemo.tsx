import Link from "next/link";

/** The vendored desk; `scripts/vendor-visr-demo.mjs` builds it, `public/visr-demo/demo/` adapts it. */
export const VISR_DEMO_SRC = "/visr-demo/index.html";
export const VISR_DEMO_TITLE = "VISR, interactive demo with invented data";

/**
 * VISR, the IntrinsicOS review desk, live on a product page (`demo: visr` on VISR and on
 * IntrinsicOS), front end only.
 *
 * The frame is a same-origin `<iframe>` over `public/visr-demo/`: the real desk, vendored with
 * its comments stripped, plus hand-written files that answer every `/api/*` call from an
 * invented queue in memory, keep the desk's storage in memory (it never reads or writes this
 * origin's localStorage), seed the token so nothing asks for one, and skip the daily power-on
 * ritual. The Superintendent chat is a scripted module, not a model. A reload starts over.
 *
 * Sizing: VISR is phone-first, so a phone gets a tall full-width frame where the desk's phone
 * layout runs. From `md` up the frame is landscape and as wide as the column allows (≥ 761px
 * inside, which is where the desk docks the Superintendent chat beside the deck; the desk also
 * needs the device's short side ≥ 600px, which a tablet or desktop has). `loading="lazy"` defers
 * it until it is near the viewport.
 */
export function VisrDemo({ inline = false }: { inline?: boolean }) {
  // `inline`: used as `<VisrDemo inline />` inside a reading column (IntrinsicOS's VISR
  // section), where it breaks out to the page width the way SystemCards does.
  return (
    <section
      aria-label="Interactive demo"
      className={inline ? "not-prose relative left-1/2 my-10 w-screen max-w-6xl -translate-x-1/2" : "py-14"}
    >
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="relative mx-auto h-[min(82svh,760px)] w-full overflow-hidden rounded-2xl border border-rule bg-paper md:h-[min(78svh,700px)] md:rounded-xl">
          <iframe
            src={VISR_DEMO_SRC}
            title={VISR_DEMO_TITLE}
            loading="lazy"
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
        <div className="mt-5 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="label">Demo · invented data · the Superintendent chat is a script, not a model · nothing leaves your browser</p>
          <Link href="/visr" className="label shrink-0 text-accent underline-offset-4 hover:underline">
            Open full screen →
          </Link>
        </div>
      </div>
    </section>
  );
}
