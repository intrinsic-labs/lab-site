// Lets a script import the site's .ts sources (lib/content/*) under Node's type stripping:
// their extensionless relative imports ("./areas") resolve to the .ts file, as the bundler
// does. Import this module before any dynamic import of a .ts file.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw err;
    }
  },
});
