# RabiRiichi-Web

The web client of [RabiRiichi](https://github.com/RabiMimi/RabiRiichi), built as
a 3D browser game on top of the open-source gRPC server implementation.

## Tech Stack

- **[Vite](https://vite.dev/)** — dev server and bundler.
- **[React](https://react.dev/) + TypeScript** — UI and application shell.
- **[three.js](https://threejs.org/)** via
  **[react-three-fiber](https://r3f.docs.pmnd.rs/)** — 3D rendering. No
  dedicated editor required; the scene is described entirely in code.
- **[@react-three/drei](https://github.com/pmndrs/drei)** — helpers (camera
  controls, loaders, etc.) for react-three-fiber.
- **ESLint (flat config) + Prettier** — type-aware linting and formatting.
- **[protobuf.js](https://github.com/protobufjs/protobuf.js)** — generates
  TypeScript bindings from the shared proto definitions.

### Why three.js?

The requirement was a code-first 3D engine that does **not** depend on a
dedicated editor (unlike Cocos Creator, Unity, or Godot). Candidates:

| Engine       | Editor required | Notes                                                            |
| ------------ | --------------- | ---------------------------------------------------------------- |
| **three.js** | No              | Largest ecosystem, code-first, first-class React integration.    |
| Babylon.js   | No              | More batteries-included (physics, GUI), heavier, smaller R-ecos. |
| PlayCanvas   | Optional/Yes    | Engine is code-first but the product is editor-centric.          |

**three.js** was chosen for its maturity, ecosystem size, and the excellent
`react-three-fiber` renderer, which lets us express the 3D scene declaratively
as React components alongside the rest of the UI.

## Getting Started

This project uses the public npm registry (see `.npmrc`). Node 18+ is
recommended.

```bash
# Install dependencies.
npm install

# Start the dev server.
npm run dev
```

## Scripts

| Script                 | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Start the Vite dev server with HMR.                  |
| `npm run build`        | Type-check and produce a production build in `dist`. |
| `npm run preview`      | Preview the production build locally.                |
| `npm run lint`         | Run ESLint (type-aware).                             |
| `npm run lint:fix`     | Run ESLint and auto-fix where possible.              |
| `npm run format`       | Format the codebase with Prettier.                   |
| `npm run format:check` | Check formatting without writing.                    |
| `npm run typecheck`    | Run the TypeScript compiler without emitting.        |
| `npm run proto:update` | Fetch the latest proto files (git submodule).        |
| `npm run proto:gen`    | Generate TS bindings into `src/generated`.           |

## Protos

The proto definitions are shared with the server via the
[`RabiRiichi-Proto`](https://github.com/RabiMimi/RabiRiichi-Proto) git submodule
mounted at `protos/`.

```bash
# Initialize / update the submodule.
npm run proto:update

# Regenerate the TypeScript bindings (output: src/generated/, git-ignored).
npm run proto:gen
```

The generated `src/generated/` directory is intentionally git-ignored and
excluded from both TypeScript compilation roots and ESLint. Run `proto:gen`
after cloning before importing from it.

## Code Quality

Linting uses typescript-eslint's **type-aware** recommended + stylistic configs
plus a set of practical rules, including:

- `@typescript-eslint/no-floating-promises` — no unhandled promises.
- `@typescript-eslint/no-misused-promises` — no async functions where a
  void-returning callback is expected.
- `@typescript-eslint/return-await` (`in-try-catch`) — avoid redundant
  `return await` outside `try`/`catch`.
- `@typescript-eslint/await-thenable` — no awaiting non-promises.
- `@typescript-eslint/no-unnecessary-condition`,
  `switch-exhaustiveness-check`, `consistent-type-imports`, and strict
  unused-variable handling.

Formatting is owned by Prettier; `eslint-config-prettier` disables any
conflicting stylistic ESLint rules.

## Testing

For details on local multiplayer testing and using the offline replay viewer, see [TESTING.md](./TESTING.md).
