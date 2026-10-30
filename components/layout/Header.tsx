import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { NavDropdown } from "./NavDropdown";
import { MobileMenu } from "./MobileMenu";
import { AREA_INFO } from "@/lib/content/areas";
import { listedAreas } from "@/lib/content/posts";

const NAV = [
  ["IntrinsicOS", "/products/intrinsic-os"],
  ["Products", "/products"],
  ["Work", "/work"],
  ["About", "/about"],
] as const;

/**
 * Research is the one nav item with a menu behind it (anthropic.com's shape): Overview,
 * then the areas that have something listed in them (`listedAreas()`). The list is
 * derived rather than written here, so an area appears in the nav once it has a post and
 * drops out when it has none — its URL stays live either way. The header is a server
 * component; the only client code in it is the disclosure itself.
 */
export async function Header() {
  const RESEARCH_ITEMS = [
    { label: "Overview", href: "/research" },
    ...(await listedAreas()).map((a) => ({ label: AREA_INFO[a].name, href: `/research/areas/${a}` })),
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-x-6 px-6">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <NavDropdown label="Research" href="/research" items={RESEARCH_ITEMS} />
          {NAV.map(([label, href]) => (
            <Link key={href} href={href} className="label hover:text-ink transition-colors">
              {label}
            </Link>
          ))}
        </nav>
        <MobileMenu
          researchLabel="Research"
          researchHref="/research"
          researchItems={RESEARCH_ITEMS}
          links={NAV.map(([label, href]) => ({ label, href }))}
        />
      </div>
    </header>
  );
}
