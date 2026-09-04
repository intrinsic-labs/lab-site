/** The wordmark: the name in Neue Montreal. The "research studio" qualifier that used
 *  to sit beside it is gone (Asher, 2026-09-04). The favicon is a separate mark (app/icon.png, the robot). */
export function Wordmark({ large = false }: { large?: boolean }) {
  return (
    <span className={`font-sans font-medium tracking-tight leading-none whitespace-nowrap ${large ? "text-3xl" : "text-xl"}`}>
      Intrinsic Labs
    </span>
  );
}
