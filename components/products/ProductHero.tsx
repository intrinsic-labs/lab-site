import type { Product, ProductImages } from "@/lib/content/products";
import { STATUS_LABEL } from "@/lib/content/products";
import { GenerativeCover } from "@/components/ui/GenerativeCover";
import { Chip } from "@/components/ui/Chip";
import { ButtonLink } from "@/components/ui/ButtonLink";

/**
 * The landing screen for one product: name, one sentence, one image, and a lot of air.
 *
 * The reference is a product page, not a document — the name is the largest thing on the
 * screen, the `line` from front matter is the only prose above the fold, and the hero
 * image sits centred over a soft accent glow that fades into the ground. Everything else
 * (status, Visit) is deliberately quiet and sits under the image, not over it.
 *
 * The image slot degrades: `public/products/<slug>/hero.*` when it exists, the seeded
 * `GenerativeCover` at the same size when it doesn't, so a product whose screenshots
 * haven't been captured yet still has a landing screen rather than a hole. The image is
 * `object-contain` under a viewport-relative cap, which is what lets one component seat a
 * 16:9 plate and a portrait phone screenshot without either overflowing a small screen.
 */
export function ProductHero({ product, images }: { product: Product; images: ProductImages }) {
  return (
    <section className="relative overflow-hidden">
      {/* Soft glow behind the plate — one radial wash of the accent token, blurred. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[70%] opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(55% 60% at 50% 42%, var(--color-accent) 0%, transparent 72%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 pt-14 pb-14 text-center sm:pt-20 sm:pb-20">
        {/* Neue Montreal via `font-sans`, sized off the viewport so it never overflows. */}
        <h1 className="font-sans font-medium tracking-[-0.035em] leading-[0.92] text-[clamp(2.75rem,12vw,8.5rem)] break-words">
          {product.name}
        </h1>

        <p className="mx-auto mt-6 max-w-[38ch] text-balance text-xl leading-snug text-ink-2 sm:text-2xl">
          {product.line}
        </p>

        {/* Full-bleed on a phone (the section clips, so the negative margin cannot widen
            the page), inset again from `sm` up. */}
        <div className="relative -mx-6 mt-10 sm:mx-0 sm:mt-14">
          {/* Vignette: the image sinks into the ground rather than sitting on a card. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-10 -inset-y-6 opacity-60 blur-2xl"
            style={{
              background: "radial-gradient(50% 50% at 50% 50%, var(--color-paper-3) 0%, transparent 75%)",
            }}
          />
          {images.hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images.hero}
              alt={product.name}
              className="relative mx-auto h-auto max-h-[64vh] w-auto max-w-full sm:rounded-xl"
            />
          ) : (
            <div className="relative mx-auto aspect-[16/9] w-full max-w-4xl overflow-hidden sm:rounded-xl">
              <GenerativeCover seed={product.slug} className="h-full w-full" />
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Chip tone={product.status === "released" ? "accent" : "muted"}>{STATUS_LABEL[product.status]}</Chip>
          {product.url && (
            <ButtonLink href={product.url} tone="green" external>
              Visit
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}
