import Image from "next/image";
import Link from "next/link";
import type { CaseStudy } from "@/lib/content/work";
import type { WorkTint } from "@/lib/content/schema";
import { GenerativeCover } from "@/components/ui/GenerativeCover";
import { WorkSceneCanvas } from "@/components/work/scenes/WorkSceneCanvas";

const COVER_CLASSNAME = "h-full w-full transition-transform duration-500 group-hover:scale-[1.03]";

/**
 * Title hover colour per tint, written as literal class strings (not a template-literal
 * `hover:text-[var(--color-${tint})]`) so Tailwind's static scanner can see each one and
 * keep the corresponding `--color-<tint>` theme variable in the build — a dynamically
 * constructed class name is invisible to it. This is also what keeps `--color-sky`
 * (the one token with no other use on the site) from being tree-shaken out of `:root`,
 * which the wireframe scenes need present for their own runtime `getComputedStyle` read.
 */
const TITLE_HOVER_CLASS: Record<WorkTint, string> = {
  accent: "hover:text-accent",
  marker: "hover:text-marker",
  ember: "hover:text-ember",
  sky: "hover:text-sky",
  ink: "hover:text-ink",
};

/** One case-study card: ported 3D scene, cover image, or generated cover (in that priority),
 *  name, client, one line. Mirrors ProductCard's shape so /work reads as the same family of
 *  card as /products. */
export function WorkCard({ item }: { item: CaseStudy }) {
  const href = `/work/${item.slug}`;
  return (
    <li className="flex flex-col bg-paper">
      <Link href={href} className="group relative block aspect-[4/3] w-full overflow-hidden border-b border-rule">
        {item.scene ? (
          <WorkSceneCanvas scene={item.scene} seed={item.slug} tint={item.tint} className={COVER_CLASSNAME} />
        ) : item.cover ? (
          <Image src={item.cover} alt={item.name} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        ) : (
          <GenerativeCover seed={item.slug} className={COVER_CLASSNAME} />
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-xl">
          <Link
            href={href}
            className={`hover:underline decoration-1 underline-offset-4 transition-colors${item.tint ? ` ${TITLE_HOVER_CLASS[item.tint]}` : ""}`}
          >
            {item.name}
          </Link>
        </h3>
        {item.client && item.client !== item.name && <p className="label mt-1 text-ink-3">{item.client}</p>}
        <p className="mt-2 flex-1 text-[0.95rem] leading-snug text-ink-2">{item.line}</p>
      </div>
    </li>
  );
}
