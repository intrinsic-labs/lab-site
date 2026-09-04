"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export interface NavDropdownItem {
  label: string;
  href: string;
  /** Optional one-line gloss shown under the item. */
  note?: string;
}

/**
 * The header's Research item: a link that still navigates, plus a disclosure that
 * reveals the section's own map — Overview first, then each research area. Modelled
 * on anthropic.com's Research menu.
 *
 * Two input modes, deliberately separate rather than one `onClick` doing both jobs:
 *
 * - MOUSE — hovering anywhere on the item opens the panel, and leaving closes it
 *   after a short grace period so the diagonal travel from the label down to the
 *   first item doesn't dismiss it mid-move.
 * - TOUCH / KEYBOARD — the label is a real `<Link>` (so a tap or an Enter goes to
 *   /research, which is what a nav item is for) and the caret beside it is a real
 *   `<button aria-expanded>` that toggles the panel. On a touch device the pointer
 *   handlers no-op, so tapping the caret is the only way in and a tap can never be
 *   ambiguous between "navigate" and "disclose".
 *
 * Escape closes and returns focus to the caret; a pointer press outside closes; so
 * does focus leaving the group, which is what makes Tab-past behave. The panel is
 * absolutely positioned, so opening it never moves the header.
 */
export function NavDropdown({
  label,
  href,
  items,
}: {
  label: string;
  href: string;
  items: NavDropdownItem[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const close = useCallback(() => {
    clearCloseTimer();
    setOpen(false);
  }, []);

  // Outside press + Escape. Bound only while open, so a closed menu costs nothing.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  useEffect(() => clearCloseTimer, []);

  return (
    <div
      ref={rootRef}
      className="relative"
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        clearCloseTimer();
        setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        clearCloseTimer();
        closeTimer.current = setTimeout(() => setOpen(false), 140);
      }}
      onFocus={() => clearCloseTimer()}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close();
      }}
    >
      <div className="flex items-center gap-1">
        <Link href={href} className="label hover:text-ink transition-colors" onClick={close}>
          {label}
        </Link>
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${label} menu`}
          className="p-1 -m-0.5 text-ink-3 hover:text-ink transition-colors"
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              // Wait for the panel to exist before reaching into it.
              requestAnimationFrame(() => panelRef.current?.querySelector("a")?.focus());
            }
          }}
        >
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            aria-hidden="true"
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="absolute left-0 top-full z-50 mt-3 w-[16rem] rounded-xl border border-rule bg-paper-2 p-2 shadow-lg shadow-black/20"
        >
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={close}
                  className="block rounded-lg px-3 py-2 font-serif text-[0.95rem] leading-snug text-ink no-underline transition-colors hover:bg-surface"
                >
                  {item.label}
                  {item.note && <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-3">{item.note}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
