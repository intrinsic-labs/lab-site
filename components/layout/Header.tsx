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
    <header className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-5 sm:gap-8">
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
