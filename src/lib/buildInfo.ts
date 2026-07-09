// Client build metadata. __COMMIT_HASH__ is injected by vite.config.ts at build
// time (from Cloudflare Pages' CF_PAGES_COMMIT_SHA or the local git checkout).
// It is absent under Vitest (no `define`), so guard against that.
export const COMMIT_HASH: string =
  typeof __COMMIT_HASH__ === 'string' ? __COMMIT_HASH__ : 'dev';
