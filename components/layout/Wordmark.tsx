/** The wordmark: serif name, mono qualifier. Also the favicon's shape (see app/icon.svg). */
export function Wordmark({ large = false }: { large?: boolean }) {
  return (
    <span className={`flex items-baseline gap-3 ${large ? "text-3xl" : "text-xl"}`}>
      <span className="font-serif font-medium tracking-tight leading-none">Intrinsic Labs</span>
      <span className="label hidden sm:inline">research studio</span>
    </span>
  );
}
