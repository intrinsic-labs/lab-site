"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { site } from "@/lib/site";

export interface MobileMenuLink {
  label: string;
  href: string;
}

/** Height of the sticky header, in the one place both it and the overlay read it. */
const HEADER_H = "4rem";

/**
 * The below-`md` navigation: a hamburger in the header that opens a full-screen
 * panel under it. Ported from latent-spaces-web's `Navigation.tsx` — the icon (a
 * 24px stroked three-bar that swaps to an X), the panel expanding by HEIGHT from
 * zero to the rest of the viewport over 300ms, the oversized light nav type with
 * hairline dividers between rows, and a footer row pinned to the bottom. That site
 * drives it with framer-motion; there is no framer-motion here, so the same motion
 * is a CSS transition on `height`/`opacity` against a known target height.
 *
 * Everything paints semantic tokens (`bg-paper`, `text-ink`, `border-rule`), so the
 * overlay inverts on the light research routes for free — same mechanism as the rest
 * of the site (`html:has([data-theme="light"])` in globals.css).
 *
 * Accessibility, none of which latent-spaces does:
 * - the trigger is a `<button aria-expanded aria-controls>`; so is the Research row's
 *   chevron, which is separate from the Research link so a tap is never ambiguous
 *   between "navigate" and "disclose" (same split `NavDropdown` uses at `md+`)
 * - focus is trapped between the trigger and the panel while open, Escape closes and
 *   returns focus to the trigger
 * - the panel is `inert` when closed; `<main>` and `<footer>` are `inert` while it is
 *   open, so the page behind is neither tabbable nor read out
 * - the body scrolls locked, with the scrollbar's width added back as padding so
 *   opening it shifts nothing; both are restored on close AND on unmount
 * - a route change closes it (`usePathname`), which covers a link to the page you are
 *   already on as well as a real navigation
 * - `motion-reduce:` kills every transition, including the accordion's
 */
export function MobileMenu({
  researchLabel,
  researchHref,
  researchItems,
  links,
}: {
  researchLabel: string;
  researchHref: string;
  researchItems: MobileMenuLink[];
  links: readonly MobileMenuLink[];
}) {
  const [open, setOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(true);
  const panelId = useId();
  const researchPanelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const close = useCallback(() => setOpen(false), []);

  // Close on navigation — adjusted during render rather than in an effect, which is
  // React's own prescription for "reset state when a prop changes" and avoids the
  // cascading render an effect would cost. A link to the page you are already on
  // doesn't change `pathname`; the rows' own `onClick={close}` covers that.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  // Body scroll lock + scrollbar gutter. The cleanup restores the previous inline
  // values rather than clearing them, and runs on unmount as well as on close.
  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
    };
  }, [open]);

  // The page behind is inert while the overlay is up.
  useEffect(() => {
    if (!open) return;
    const behind = [document.querySelector("main"), document.querySelector("footer")].filter(
      (n): n is HTMLElement => n instanceof HTMLElement,
    );
    behind.forEach((n) => n.setAttribute("inert", ""));
    return () => behind.forEach((n) => n.removeAttribute("inert"));
  }, [open]);

  // Escape, and a focus trap spanning the trigger + the panel.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        buttonRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = [
        buttonRef.current,
        ...Array.from(
          panelRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        ),
      ].filter((n): n is HTMLElement => !!n && n.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !active || !focusable.includes(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // Move focus into the panel when it opens, so a keyboard user isn't left behind.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => panelRef.current?.querySelector("a")?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const rowClass =
    "block font-sans text-3xl font-normal py-4 pl-1 no-underline text-ink transition-colors duration-300 hover:text-accent";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="md:hidden relative z-50 -mr-2 p-2 text-ink focus:outline-none"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {/* latent-spaces' own icon: 24px, 2px round-capped strokes, the three bars
            swapped for an X rather than tweened between the two. */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      <div
        id={panelId}
        ref={panelRef}
        inert={!open}
        className={`md:hidden fixed inset-x-0 z-40 overflow-hidden border-rule bg-paper backdrop-blur-md transition-[height,opacity] duration-300 ease-out motion-reduce:transition-none ${
          open ? "opacity-100 border-t" : "opacity-0"
        }`}
        style={{
          top: HEADER_H,
          height: open ? `calc(100dvh - ${HEADER_H})` : 0,
        }}
      >
        <div className="h-full overflow-y-auto overscroll-contain">
          <div className="mx-auto flex min-h-full max-w-6xl flex-col px-6 pt-6 pb-10">
            <nav aria-label="Main">
              {/* Research: a real link, plus a chevron that discloses the areas. */}
              <div className="border-b border-rule">
                <div className="flex items-center justify-between gap-2">
                  <Link href={researchHref} className={rowClass} onClick={close}>
                    {researchLabel}
                  </Link>
                  <button
                    type="button"
                    aria-expanded={researchOpen}
                    aria-controls={researchPanelId}
                    aria-label={`${researchLabel} areas`}
                    className="p-3 text-ink-3 transition-colors hover:text-ink"
                    onClick={() => setResearchOpen((v) => !v)}
                  >
                    <svg
                      width="14"
                      height="9"
                      viewBox="0 0 10 6"
                      aria-hidden="true"
                      className={`transition-transform duration-300 motion-reduce:transition-none ${
                        researchOpen ? "rotate-180" : ""
                      }`}
                    >
                      <path
                        d="M1 1l4 4 4-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
                {/* grid-rows 0fr → 1fr: a height animation that needs no measurement. */}
                <div
                  id={researchPanelId}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                    researchOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <ul className="overflow-hidden">
                    {researchItems.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={close}
                          className="block py-2.5 pl-6 font-sans text-[1.1rem] font-normal leading-snug text-ink no-underline transition-colors hover:text-accent"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                    <li aria-hidden="true" className="h-2" />
                  </ul>
                </div>
              </div>

              {links.map((link, i) => (
                <div key={link.href} className={i === links.length - 1 ? "" : "border-b border-rule"}>
                  <Link href={link.href} className={rowClass} onClick={close}>
                    {link.label}
                  </Link>
                </div>
              ))}
            </nav>

            {/* The bottom row is latent-spaces' social strip, in this site's currency:
                the two contact points the footer already carries. */}
            <div className="mt-auto flex flex-col gap-3 pt-10">
              <a href={`mailto:${site.email}`} className="label hover:text-ink" onClick={close}>
                {site.email}
              </a>
              <a href={site.github} className="label hover:text-ink" rel="me" onClick={close}>
                GitHub ↗︎
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
