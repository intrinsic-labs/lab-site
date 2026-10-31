import type { Metadata } from "next";
import Link from "next/link";
import { VISR_DEMO_SRC, VISR_DEMO_TITLE } from "@/components/products/demos/VisrDemo";

export const metadata: Metadata = {
  title: "VISR demo",
  description: "VISR, the IntrinsicOS review desk, full screen with sample data.",
  robots: { index: false, follow: false },
};

/**
 * The VISR demo full screen: the same vendored desk the product pages embed
 * (`components/products/demos/VisrDemo.tsx`), over the whole viewport so a tablet or desktop
 * shows the desk with the Superintendent chat docked beside it. The root layout's header and
 * footer are covered by a fixed layer rather than split into a route group, so this route
 * stays one file. Not in the sitemap, and noindex.
 */
export default function VisrDemoPage() {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-paper">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-rule px-3 py-2 sm:px-4">
        <p className="label min-w-0">VISR demo · sample data · the Superintendent chat is a script, not a model</p>
        <Link href="/products/intrinsic-os" className="label shrink-0 text-accent underline-offset-4 hover:underline">
          ← IntrinsicOS
        </Link>
      </div>
      <iframe src={VISR_DEMO_SRC} title={VISR_DEMO_TITLE} className="min-h-0 w-full flex-1 border-0" />
    </div>
  );
}
