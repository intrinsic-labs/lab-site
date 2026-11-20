import path from "node:path";
import type { ReactNode } from "react";
import { imageSize } from "@/lib/content/image-size";

/**
 * Screenshots of the fictional VISR demo, captured from `/visr` and kept in a SUBFOLDER of
 * public/products/intrinsic-os/. Not in that folder itself: `productImages("intrinsic-os")`
 * reads its top level and would turn any image there into a gallery on the parent page.
 */
const DIR = "/products/intrinsic-os/how-it-works";

/**
 * One phone screenshot with its caption, used as `<VisrShot file="…" alt="…">caption</VisrShot>`
 * inside `<VisrShots>` in the report's markdown, so the alt text and caption stay in content/. The box is
 * reserved before the image loads: intrinsic `width`/`height` read from the file at build
 * time, plus `w-full h-auto` inside a fixed max width. `first` makes it eager and high
 * priority, for the first image on the page. Server component.
 */
export async function VisrShot({
  file,
  alt,
  first = false,
  children,
}: {
  file: string;
  alt: string;
  first?: boolean;
  children: ReactNode;
}) {
  const size = await imageSize(path.join(process.cwd(), "public", DIR, file));
  return (
    <figure className="mx-auto w-full max-w-[17rem]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${DIR}/${file}`}
        alt={alt}
        width={size?.width}
        height={size?.height}
        loading={first ? "eager" : "lazy"}
        fetchPriority={first ? "high" : "auto"}
        decoding="async"
        className="h-auto w-full rounded-2xl border border-rule"
      />
      <figcaption className="mt-3 text-center font-code text-[0.72rem] leading-relaxed text-ink-2">{children}</figcaption>
    </figure>
  );
}
