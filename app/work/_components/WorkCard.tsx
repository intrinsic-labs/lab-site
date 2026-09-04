import Link from "next/link";
import type { CaseStudy } from "@/lib/content/work";
import { GenerativeCover } from "@/components/ui/GenerativeCover";
import { WorkSceneCanvas } from "@/components/work/scenes/WorkSceneCanvas";

const COVER_CLASSNAME = "h-full w-full transition-transform duration-500 group-hover:scale-[1.03]";

/** One case-study card: ported 3D scene, cover image, or generated cover (in that priority),
 *  name, client, one line. Mirrors ProductCard's shape so /work reads as the same family of
 *  card as /products. */
export function WorkCard({ item }: { item: CaseStudy }) {
  const href = `/work/${item.slug}`;
  return (
    <li className="flex flex-col bg-paper">
      <Link href={href} className="group relative block aspect-[4/3] w-full overflow-hidden border-b border-rule">
        {item.scene ? (
          <WorkSceneCanvas scene={item.scene} seed={item.slug} className={COVER_CLASSNAME} />
        ) : item.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover} alt={item.name} className={`object-cover ${COVER_CLASSNAME}`} />
        ) : (
          <GenerativeCover seed={item.slug} className={COVER_CLASSNAME} />
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-xl">
          <Link href={href} className="hover:underline decoration-1 underline-offset-4">{item.name}</Link>
        </h3>
        {item.client && item.client !== item.name && <p className="label mt-1 text-ink-3">{item.client}</p>}
        <p className="mt-2 flex-1 text-[0.95rem] leading-snug text-ink-2">{item.line}</p>
      </div>
    </li>
  );
}
