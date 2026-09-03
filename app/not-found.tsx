import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-32">
      <p className="label mb-4">404</p>
      <h1 className="font-serif text-4xl font-medium tracking-tight">Nothing at this address.</h1>
      <p className="text-ink-2 mt-4 max-w-md">If you followed a link to a draft, it isn&apos;t published yet — drafts render only in preview.</p>
      <Link href="/" className="label mt-8 inline-block hover:text-ink">← Home</Link>
    </div>
  );
}
