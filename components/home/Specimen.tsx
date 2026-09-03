import { promises as fs } from "node:fs";
import path from "node:path";
import { Frame } from "@/components/ui/Frame";

/**
 * A real vault artifact, typeset as a plate. Static and hand-approved (D2, 2026-09-03):
 * the file lives in content/specimen and is a copy, never a live read of the vault.
 */
export async function Specimen() {
  const raw = await fs.readFile(path.join(process.cwd(), "content/specimen/lab-12.md"), "utf8");
  return (
    <Frame className="bg-paper-2">
      <div className="flex items-center justify-between border-b border-rule px-5 py-2.5">
        <span className="label normal-case tracking-normal">Projects/meta/lab/tasks/lab-12.md</span>
        <span className="label text-ink-3 whitespace-nowrap">specimen · 2026-09-03</span>
      </div>
      <pre className="specimen px-5 py-4">{highlight(raw)}</pre>
      <p className="border-t border-rule px-5 py-3 text-sm text-ink-2 leading-snug">
        The task that produced this page, as it exists in the vault. Every piece of work here starts as a
        file like this one; an agent picks it up, does the work on a branch, and a human decides whether it ships.
      </p>
    </Frame>
  );
}

/** Minimal front-matter colouring. Pure string → spans; no parser. */
function highlight(src: string) {
  const lines = src.split("\n");
  let inFm = false;
  return lines.map((line, i) => {
    if (line.trim() === "---") { inFm = !inFm; return <span key={i} className="fm">{line}{"\n"}</span>; }
    if (inFm) {
      const m = line.match(/^(\s*[\w-]+:)(.*)$/);
      if (m) return <span key={i}><span className="k">{m[1]}</span><span className="v">{m[2]}</span>{"\n"}</span>;
    }
    if (line.startsWith(">")) return <span key={i} className="q">{line}{"\n"}</span>;
    return <span key={i}>{line}{"\n"}</span>;
  });
}
