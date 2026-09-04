import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { NavDropdown } from "./NavDropdown";
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
      <div className="mx-auto max-w-6xl px-6 py-4 sm:h-16 sm:py-0 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-4 sm:gap-8 w-full sm:w-auto">
          <NavDropdown label="Research" href="/research" items={RESEARCH_ITEMS} />
          {NAV.map(([label, href]) => (
            <Link key={href} href={href} className="label hover:text-ink transition-colors">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
