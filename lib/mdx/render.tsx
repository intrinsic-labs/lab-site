import { MDXRemote } from "next-mdx-remote-client/rsc";
import remarkGfm from "remark-gfm";

/** Render an MDX body inside the reading column. Server-only. */
export function Mdx({ source }: { source: string }) {
  return <MDXRemote source={source} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />;
}
