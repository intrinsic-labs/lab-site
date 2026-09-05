import Link from "next/link";
import { loadSpec } from "@/lib/openloom/spec";
import { SpecNav } from "@/components/products/openloom/SpecNav";

/** The banner image is Aspen Grove's own hero — one marbled plate, used in both places. */
const BANNER = "/products/aspen-grove/hero.jpg";

/**
 * The OpenLoom spec as documentation (Asher, 2026-09-04: "tabs along the side, like a
 * table of contents, more like documentation"). The banner header below is UNCHANGED from
 * the single-page version — "the header is awesome. Please don't touch the header" — and
 * lives in the layout now so the base URL and every `/<section>` sub-route share it.
 *
 * Beneath it, a two-column shell: `SpecNav` (sticky rail from `lg`, a Contents disclosure
 * below that) and the reading column the section pages render into. The spec itself stays
 * ONE markdown file; `lib/openloom/spec.ts` splits it on `##` at build time.
 *
 * The version pill is READ FROM THE SPEC'S OWN TEXT — a `**Version X**` line — and never
 * invented. A spec that doesn't state one simply gets no pill.
 */
export default async function OpenLoomLayout({ children }: { children: React.ReactNode }) {
  const { version, sections } = await loadSpec();
  return (
    <article>
      {/* Full-width banner: the marbled plate, darkened, with the title sitting on it. */}
      <header className="relative isolate overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BANNER} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-paper/55" />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-1/2"
          style={{ background: "linear-gradient(to top, var(--color-paper), transparent)" }}
        />

        <div className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
          <h1 className="font-sans font-medium tracking-[-0.035em] leading-[0.92] text-[clamp(2.75rem,11vw,7rem)] break-words">
            OpenLoom
          </h1>
          <p className="mt-5 font-code text-base text-ink-2 sm:text-lg">A protocol for loom interfaces</p>
          {version && (
            <p className="mt-7">
              <span className="version-pill">
                Current Version: {version}
              </span>
            </p>
          )}
          <p className="mt-8">
            <Link href="/products/aspen-grove" className="label hover:text-accent">
              ← Aspen Grove
            </Link>
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
        <SpecNav sections={sections} />
        <div className="min-w-0 lg:max-w-[68ch]">{children}</div>
      </div>
    </article>
  );
}
