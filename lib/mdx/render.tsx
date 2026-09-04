import { MDXRemote } from "next-mdx-remote-client/rsc";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";
import { rehypeShikiOptions } from "./highlight";

/**
 * `mdx/types` isn't a direct dependency here (only a transitive one of next-mdx-remote-client),
 * so pnpm's isolated node_modules won't resolve it from this file. Derive the prop type from
 * `MDXRemote` itself instead of importing it — same type, no separate module resolution.
 */
type MdxComponents = NonNullable<Parameters<typeof MDXRemote>[0]["components"]>;

/**
 * Render an MDX body inside the reading column. Server-only.
 * `components` lets a page splice a live, data-driven element (e.g. a list rendered from a
 * TS const) into otherwise-static prose — the shortcode is written as `<Name />` in the
 * markdown source and resolved here, so the data source stays the single source of truth.
 *
 * Code fences are highlighted at build time with shiki's `dark-plus` — the same VS Code
 * Dark+ tokens latent-spaces-web renders with `vscDarkPlus`. See lib/mdx/highlight.ts.
 */
export function Mdx({ source, components }: { source: string; components?: MdxComponents }) {
  return (
    <MDXRemote
      source={source}
      components={components}
      options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [[rehypeShiki, rehypeShikiOptions]] } }}
    />
  );
}
