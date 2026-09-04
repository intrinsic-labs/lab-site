import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { NavDropdown } from "./NavDropdown";
import { MobileMenu } from "./MobileMenu";
import { AREAS, AREA_INFO } from "@/lib/content/areas";

const NAV = [
  ["Products", "/products"],
  ["Work", "/work"],
  ["About", "/about"],
] as const;

/**
 * Research is the one nav item with a menu behind it (anthropic.com's shape): Overview,
 * then the declared areas. The list is derived from lib/content/areas.ts rather than
 * written here, so a new area appears in the nav the moment it is declared. That module
 * is plain data — no fs — so importing it keeps the header a server component and the
 * only client code in the header is the disclosure itself.
 */
const RESEARCH_ITEMS = [
  { label: "Overview", href: "/research" },
  ...AREAS.map((a) => ({ label: AREA_INFO[a].name, href: `/research/areas/${a}` })),
];

export function Header() {
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
