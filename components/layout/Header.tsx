import Link from "next/link";
import { Wordmark } from "./Wordmark";

const NAV = [
  ["Research", "/research"],
  ["Instruments", "/instruments"],
  ["Work", "/work"],
  ["About", "/about"],
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 py-4 sm:h-16 sm:py-0 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-4 sm:gap-8 w-full sm:w-auto">
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
