import Link from "next/link";
import { accentVar, STATUS_LABEL, type Product, type ProductImages } from "@/lib/content/products";
import { GenerativeCover } from "@/components/ui/GenerativeCover";
import { containedImageStyle } from "@/components/ui/containedImageStyle";

/**
 * One product, given a full-width stage of its own on `/products`.
 *
 * The reason this exists (Asher, 2026-09-04): the index used to be a card grid, and "they
 * need to look like their own standalone products, whereas this looks like a list of blog
 * posts." So each product gets a section the size of the screen instead of a cell — name
 * huge, the one-line hook, the image large, a quiet mono status line, and one link in. The
 * page is the stack of these; the air between them is what makes each read as its own thing.
 *
 * Desktop alternates image-left / image-right (`flip`, driven by position in the stack, not
 * by anything in the content); below `lg` it is always image over text, because side-by-side
 * at 390px is two cramped columns.
 *
 * `quiet` is the vault's treatment: the same section at a smaller scale. It is the internal
 * one, and it is last, so it should not shout at the same volume as the products that ship.
 *
 * Colour is `accent` in front matter — a token NAME, resolved to a CSS variable in exactly
 * one place (`accentVar`). Nothing here knows a hex value; it tints one radial wash behind
 * the image and nothing else, so a product with no `accent:` simply gets the site green.
 */
export function ProductFeature({
  product,
  images,
  flip = false,
  quiet = false,
  priority = false,
}: {
  product: Product;
  images: ProductImages;
  flip?: boolean;
  quiet?: boolean;
  /** The first section on the page: its image is above the fold and must not be lazy. */
  priority?: boolean;
}) {
  const glow = accentVar(product.accent);

  return (
    <section
      aria-labelledby={`product-${product.slug}`}
      // `start` rather than `center`: the sticky header would otherwise cover the name.
      // The page's snap is `proximity` (SnapSections), so this never traps a scroll.
      style={{ scrollSnapAlign: "start" }}
      // `overflow-hidden` is load-bearing, not decoration: the glow below is inset NEGATIVELY
      // and would otherwise stick out past the viewport and give the page 9px of horizontal
      // scroll on a phone. Same reason `ProductHero` clips.
      className={
        quiet
          ? "relative overflow-hidden py-24 sm:py-32"
          : "relative overflow-hidden py-24 sm:py-36 lg:min-h-[88vh] lg:py-40"
      }
    >
      <div
        // Equal tracks on purpose: the flip is done with `order` on the children, and `order`
        // moves a child between COLUMNS without moving the column — so unequal tracks would
        // put the wide side under the image in one section and under the text in the next.
        className={`mx-auto grid items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20 ${quiet ? "max-w-4xl" : "max-w-7xl"}`}
      >
        {/* Image. Order is set explicitly on both children so the flip is one place. */}
        <div className={`relative ${flip ? "lg:order-2" : "lg:order-1"}`}>
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 opacity-25 blur-3xl"
            style={{ background: `radial-gradient(50% 50% at 50% 50%, ${glow} 0%, transparent 72%)` }}
          />
          {images.hero ? (
            // `width`/`height` are the intrinsic pixels read off the file at build time
            // (lib/content/image-size.ts), NOT a rendered size — `w-auto h-auto max-*`
            // below still decide that. They are here so the browser knows the aspect ratio
            // before the bytes arrive; without them this box laid out at zero and then
            // shoved the whole two-column grid when the image landed (measured 0.068 CLS
            // on /products, the largest shift on the site).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images.hero.src}
              alt={product.name}
              width={images.hero.width}
              height={images.hero.height}
              // The first section is above the fold, so lazy-loading it delays the page's
              // largest paint and guarantees the shift it is meant to avoid.
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : undefined}
              decoding="async"
              // Definite width + the two caps that `w-auto max-w-full max-h-*` used to
              // express, so the box is the right size before the image loads rather than
              // after. The classes stay as the fallback for an image we could not measure.
              style={containedImageStyle(images.hero, quiet ? 34 : 58)}
              className={`relative mx-auto h-auto w-auto max-w-full rounded-xl object-contain ${
                quiet ? "max-h-[34vh]" : "max-h-[58vh]"
              }`}
            />
          ) : (
            <div className="relative mx-auto aspect-[16/9] w-full overflow-hidden rounded-xl">
              <GenerativeCover seed={product.slug} className="h-full w-full" />
            </div>
          )}
        </div>

        {/* Text. */}
        <div className={flip ? "lg:order-1" : "lg:order-2"}>
          <h2
            id={`product-${product.slug}`}
            className={`font-sans font-medium tracking-[-0.035em] leading-[0.95] break-words ${
              quiet ? "text-[clamp(1.9rem,5vw,3rem)]" : "text-[clamp(2.5rem,7vw,5rem)]"
            }`}
          >
            {product.name}
          </h2>

          <p
            className={`mt-5 max-w-[42ch] text-balance leading-snug text-ink-2 ${
              quiet ? "text-base sm:text-lg" : "text-lg sm:text-xl"
            }`}
          >
            {product.line}
          </p>

          <p className="label mt-6">{product.statusNote ?? STATUS_LABEL[product.status]}</p>

          <div className="mt-8">
            <Link
              href={`/products/${product.slug}`}
              className="btn btn-green"
            >
              See {product.name} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
