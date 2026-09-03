import type { ReactNode } from "react";

/** A plate: hairline border with draftsman's registration marks at the corners. */
export function Frame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative border border-rule ${className}`}>
      <Mark className="-top-[5px] -left-[5px]" />
      <Mark className="-top-[5px] -right-[5px]" />
      <Mark className="-bottom-[5px] -left-[5px]" />
      <Mark className="-bottom-[5px] -right-[5px]" />
      {children}
    </div>
  );
}

function Mark({ className }: { className: string }) {
  return (
    <svg aria-hidden className={`absolute ${className} text-ink-3`} width="9" height="9" viewBox="0 0 9 9">
      <path d="M4.5 0v9M0 4.5h9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
