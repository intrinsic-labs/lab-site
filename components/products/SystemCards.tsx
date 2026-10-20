import Link from "next/link";

/**
 * The three parts of the operating system, side by side: the runtime, the review desk and
 * the agents. Used as `<SystemCards />` in content/products/intrinsic-os.mdx. It breaks out
 * of the reading column so the three cards sit in one row at md+ and stack on a phone.
 */
const CARDS = [
  {
    href: "#runtime",
    name: "IntrinsicOS",
    role: "The runtime",
    text: "Starts and stops the agents, decides what each is allowed to do, and records every action they take.",
  },
  {
    href: "/products/visr",
    name: "VISR",
    role: "The review desk",
    text: "The one place the founder approves, edits, sends back and accepts the work. Runs on his phone.",
  },
  {
    href: "#agents",
    name: "The agents",
    role: "Claude · ChatGPT · Grok Bot",
    text: "Claude and ChatGPT do the engineering and review each other. Grok Bot runs administration and finance.",
  },
] as const;

export function SystemCards() {
  return (
    <div className="not-prose relative left-1/2 my-12 w-screen max-w-6xl -translate-x-1/2 px-6">
      <div className="grid gap-4 md:grid-cols-3">
        {CARDS.map((c) => (
          <Link key={c.name} href={c.href} className="group flex flex-col gap-3 rounded-lg border border-rule p-6 transition-colors hover:border-ink-3">
            <span className="label text-ink-2">{c.role}</span>
            <span className="text-xl text-ink group-hover:text-accent">{c.name}</span>
            <span className="text-sm leading-relaxed text-ink-2">{c.text}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
