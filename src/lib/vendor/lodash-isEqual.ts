/**
 * ESM wrapper around lodash's CJS `isEqual`.
 *
 * `@refinedev/react-table`'s ESM build imports `lodash/isEqual` WITHOUT an
 * extension, and lodash ships no `exports` map — so Node's native ESM
 * resolver rejects the specifier (`ERR_MODULE_NOT_FOUND`, "Did you mean
 * lodash/isEqual.js?"). vite.config.ts aliases that specifier to this file;
 * the bare `lodash/isEqual.js` import below stays EXTERNAL in dev SSR (Node
 * loads CJS natively, so the module runner never inlines the CJS file with
 * its `require` calls) and bundles cleanly on the client / in the Nitro
 * node-server build.
 */
// @ts-ignore — lodash ships no types for this subpath (no @types/lodash);
// CJS default-interop import of the real file.
import lodashIsEqual from "lodash/isEqual.js";

export default lodashIsEqual as <T>(value: T, other: T) => boolean;
