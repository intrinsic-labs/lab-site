import type { Product, ProductImages } from "@/lib/content/products";
import { GenerativeCover } from "@/components/ui/GenerativeCover";
import { containedImageStyle } from "@/components/ui/containedImageStyle";
import { ButtonLink } from "@/components/ui/ButtonLink";

/**
 * The landing screen for one product: name, one sentence, one image, and a lot of air.
 *
 * The reference is a product page, not a document — the name is the largest thing on the
 * screen, the `line` from front matter is the only prose above the fold, and the hero
 * image sits centred on the plain ground (the accent bloom behind the title was removed
 * 2026-09-04 at Asher's request).
 *
 * There is NO status chip here (Asher, 2026-09-04: "just say Visit"). The status is stated
 * once on the page, as a quiet mono line at the top of the reading column — see
 * `app/products/[slug]/page.tsx`. The only control under the image is Visit.
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

      <div className="relative mx-auto max-w-6xl px-6 pt-14 pb-14 text-center sm:pt-20 sm:pb-20">
        {/* Neue Montreal via `font-sans`, sized off the viewport so it never overflows. */}
        <h1 className="font-sans font-medium tracking-[-0.035em] leading-[0.92] text-[clamp(2.75rem,12vw,8.5rem)] break-words">
          {product.name}
        </h1>

        <p className="mx-auto mt-6 max-w-[38ch] text-balance text-xl leading-snug text-ink-2 sm:text-2xl">
          {product.line}
        </p>

        {/* The hero image is a STAND-IN for a gallery, not a companion to one (Asher,
            2026-09-04: "drop the header image and just feature the screenshots"). A product
            with slides shows none here; IntrinsicOS, which has no screenshots, keeps its
            plate. */}
        {images.gallery.length === 0 && (
          // Full-bleed on a phone (the section clips, so the negative margin cannot widen
          // the page), inset again from `sm` up.
          <div className="relative -mx-6 mt-10 sm:mx-0 sm:mt-14">
            {images.hero ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images.hero.src}
                alt={product.name}
                // Intrinsic pixels, so the box holds its aspect ratio before the bytes land;
                // `w-auto`/`h-auto` + `max-h-[64vh]` still decide the rendered size. This is
                // the page's LCP image, hence eager + high priority rather than the default.
                width={images.hero.width}
                height={images.hero.height}
                fetchPriority="high"
                decoding="async"
                style={containedImageStyle(images.hero, 64)}
                className="relative mx-auto h-auto max-h-[64vh] w-auto max-w-full sm:rounded-xl"
              />
            ) : (
              <div className="relative mx-auto aspect-[16/9] w-full max-w-4xl overflow-hidden sm:rounded-xl">
                <GenerativeCover seed={product.slug} className="h-full w-full" />
              </div>
            )}
          </div>
        )}

        {product.url && (
          <div className="mt-10 flex items-center justify-center">
            <ButtonLink href={product.url} tone="green" external>
              Visit
            </ButtonLink>
          </div>
        )}
      </div>
    </section>
  );
}
