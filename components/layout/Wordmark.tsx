/** The wordmark: the name in Neue Montreal, the qualifier in Calling Code caps.
 *  Also the favicon's shape (see app/icon.svg). */
export function Wordmark({ large = false }: { large?: boolean }) {
  return (
    <span className={`flex items-baseline gap-3 ${large ? "text-3xl" : "text-xl"}`}>
      <span className="font-sans font-medium tracking-tight leading-none whitespace-nowrap">Intrinsic Labs</span>
      <span className="label hidden sm:inline">research studio</span>
    </span>
  );
}
