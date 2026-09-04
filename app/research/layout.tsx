/**
 * The research surfaces are the site's one LIGHT area — /research, the area pages
 * and every post — on latent-spaces-web's cream ground with the same four faces.
 * Asher, 2026-09-04: "Instead of doing a switch, let's just make it a light theme
 * — the cream color, same fonts and everything, just invert the colors."
 *
 * The whole mechanism is this one attribute. app/globals.css carries a
 * `html:has([data-theme="light"])` block that remaps the semantic tokens, so the
 * override lands on `html` and therefore also on the Header and Footer, which
 * live in the ROOT layout and are unreachable from a wrapper class. Because it is
 * a plain CSS selector it matches during the first style pass — there is no
 * `useEffect` setting a dataset attribute, and so no flash of black on either a
 * hard load or a client-side navigation. The wrapper paints `bg-paper` itself as
 * well, so the column is cream even before `html`'s own background is composited.
 *
 * No component below needs to know: every one of them already reads the tokens.
 */
export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="light" className="bg-paper text-ink">
      {children}
    </div>
  );
}
