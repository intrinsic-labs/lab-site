import Link from "next/link";

/** Solid, square-cornered button-style link. Mono caps label, filled background. */
export function ButtonLink({
  href,
  tone = "green",
  external = false,
  children,
}: {
  href: string;
  tone?: "green";
  external?: boolean;
  children: React.ReactNode;
}) {
  const tones = {
    green: "bg-verdant text-paper hover:bg-ink",
  };
  const className = `label inline-block ${tones[tone]} px-3.5 py-2`;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children} ↗︎
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
