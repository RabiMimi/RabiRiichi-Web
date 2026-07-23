/**
 * Ambient declarations for the CLI TypeScript project.
 *
 * The CLI imports the shared browser-isomorphic core, which references two
 * Vite-provided constructs that don't exist under a plain Node/tsc build:
 *   - `__COMMIT_HASH__`: a build-time define (guarded at runtime, defaults to
 *     'dev' when absent — which is always the case for the CLI).
 *   - `import.meta.env`: Vite's env object (the reducer reads it behind a guard).
 * Declaring them here lets the shared code type-check for the CLI without
 * changing the source. At runtime the guards fall back to safe defaults.
 */
declare const __COMMIT_HASH__: string | undefined;

interface ImportMeta {
  readonly env?: Record<string, string | boolean | undefined>;
}
