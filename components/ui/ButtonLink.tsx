import Link from "next/link";

/**
 * Button-style link. Shape and colour taken from latent-spaces-web's CTA
 * (`bg-ls-accent/30 border border-ls-accentLight text-white rounded-full`, its Hero /
 * DiscordCTA / Navigation buttons): a full-radius capsule, translucent green fill, 1px
 * accent border, Calling Code label.
 *
 * The label is the LIGHT accent rather than the dark green fill colour — the previous
 * `bg-verdant text-paper` put near-black text on dark green and was unreadable. Every
 * tone here clears 7:1 against its own fill. The rules live in `.btn` / `.btn-*` in
 * app/globals.css.
 */
export function ButtonLink({
  href,
  tone = "green",
  external = false,
  children,
}: {
  href: string;
  tone?: "green" | "ink";
  external?: boolean;
  children: React.ReactNode;
}) {
  const className = `btn btn-${tone}`;

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
