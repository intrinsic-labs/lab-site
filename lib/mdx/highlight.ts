import rehypeShiki from "@shikijs/rehype";

/**
 * Code-block highlighting, shared by both render paths (MDX and plain markdown).
 *
 * latent-spaces-web highlights posts and the OpenLoom spec with
 * react-syntax-highlighter's Prism `vscDarkPlus` theme at `borderRadius: 1rem`.
 * `dark-plus` is the same VS Code Dark+ token set, so the colours Asher likes are
 * reproduced exactly — but resolved at BUILD time in a server component rather
 * than by shipping a highlighter to the browser. The 1rem radius and the #1e1e1e
 * ground live in `.prose pre` in app/globals.css.
 */
export const SHIKI_THEME = "dark-plus";

export const rehypeShikiOptions = {
  theme: SHIKI_THEME,
  /** A fence with no language (or an unknown one) renders plain rather than failing the build. */
  fallbackLanguage: "text",
  defaultLanguage: "text",
} as const;

export const shikiRehypePlugin = [rehypeShiki, rehypeShikiOptions] as const;
