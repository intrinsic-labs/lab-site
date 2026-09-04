import { Frame } from "@/components/ui/Frame";

/**
 * The shared vocabulary box for the agent-operations posts. One definition of "tick",
 * "chassis", "store", "gate", "landing", "run report" and "autonomy line" so six-plus
 * posts stop each carrying their own gloss (or none). Rendered when a post's front
 * matter sets `primer: "agent-ops"`. Keep this in sync with how the posts actually use
 * the terms — it's a shared box, so drift here is drift everyone inherits.
 */
export function SystemPrimer() {
  return (
    <Frame className="mt-10 max-w-2xl p-5 bg-paper-2">
      <p className="label mb-3">The system, in brief</p>
      <p className="text-[0.95rem] leading-snug">
        Our company&apos;s operating record is a folder of Markdown files under git.{" "}
        <strong>Tick</strong> — one scheduled run of the loop, nine times a day.{" "}
        <strong>Chassis</strong> — the deterministic code around each model session.{" "}
        <strong>Store</strong> — the task files, one per task. <strong>Gate</strong> — the
        automatic code review a change must pass before it lands. <strong>Landing</strong> —
        merging a branch to main. <strong>Run report</strong> — the log a session writes
        about itself. <strong>Autonomy line</strong> — a per-project declaration of what
        agents may do without a human.
      </p>
    </Frame>
  );
}
