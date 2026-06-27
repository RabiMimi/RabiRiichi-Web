# AGENTS.md — RabiRiichi-Web

> Always-on context and rules for any AI agent (or human) working in this
> repository. Read this file in full before making changes. Keep changes
> consistent with everything below.

## 0. What this project is

RabiRiichi-Web is the **web client** for RabiRiichi, an open-source riichi
mahjong server. The client is a **3D browser game** built with Vite + React +
TypeScript, rendering the table and tiles with **three.js** (via
react-three-fiber). The UI and game flow should feel like **Mahjong Soul
(Majsoul)**.

This is an **external, open-source project**. See the hard rules in §1.

### Sibling repositories (read-only references, NOT part of this repo)

These live next to this repo on disk for reference only. Do not add build
dependencies on them.

- `../RabiRiichi/` — the C# (.NET 9) server (`RabiRiichi.Server`) and game
  engine. You MAY modify server code when strictly necessary for the client to
  work (see §6), but prefer client-side solutions first.
- `../RabiRiichi-Cocos/` — an existing Cocos Creator client. It is the single
  best reference for how to talk to the server and how to render the table.
  **Mirror its patterns; do not copy its Cocos-specific code.** You may copy
  **assets** from it (see §7).
- `protos/` (git submodule in THIS repo) — the shared `.proto` wire format,
  identical to what the server uses.

## 1. HARD RULES (never violate)

1. **External-only.** This is a public open-source project. NEVER use, mention,
   reference, or depend on any private/corporate tooling, infrastructure,
   libraries, internal package registries, internal short links, code names, or
   conventions. Use only public npm packages from `registry.npmjs.org` (already
   configured in `.npmrc`). Do not leak anything internal into code, comments,
   commit messages, docs, or filenames.
2. **No secrets.** Never commit tokens, credentials, or `.env` files.
3. **Read before write.** Always read a file before editing it. Prefer editing
   existing files over creating new ones.
4. **Keep the toolchain green.** Every change must pass, before you consider a
   task done:
   - `npm run typecheck`
   - `npm run lint` (zero errors)
   - `npm run format:check`
   - `npm run build`
   - `npm run test` (once tests exist)
5. **Don't weaken the guardrails.** Do not disable or loosen ESLint rules,
   TypeScript `strict` options, or add `// eslint-disable` / `any` to make
   errors go away. Fix the root cause. If a rule is genuinely wrong for the
   project, raise it explicitly rather than silently disabling it.
6. **Generated code is off-limits to hand-edit.** `src/generated/` is produced
   by `npm run proto:gen`. Never edit it by hand; it is git-ignored.

## 2. Tech stack & commands

- **Build/dev:** Vite 6. `npm run dev` (HMR), `npm run build`, `npm run preview`.
- **Language:** TypeScript 5 (strict, see `tsconfig.app.json`).
- **3D:** three.js via `@react-three/fiber` + `@react-three/drei`. Code-first;
  there is no scene editor.
- **Wire format:** protobuf via `protobufjs`. Bindings generated from `protos/`
  into `src/generated/` by `npm run proto:gen` (run `npm run proto:update`
  first to init/update the submodule).
- **Package manager:** npm against the public registry.

Quality scripts: `npm run lint`, `npm run lint:fix`, `npm run format`,
`npm run typecheck`, `npm run test`.

## 3. Coding style & quality bar (ENFORCED)

The user's explicit standard: **human-readable, maintainable, modular, testable
code. Prefer small functions / small files / clear abstractions / shared
utilities over large, repetitive code.**

Concretely:

- **Small units.** Keep functions short and single-purpose. If a file exceeds
  ~200–250 lines or a function exceeds ~40 lines, look for a decomposition.
- **DRY.** Extract repeated logic into shared utilities (e.g. `src/lib/…`).
  Three or more repetitions of the same shape ⇒ factor it out.
- **Separation of concerns.** Keep these layers distinct and independently
  testable (see DESIGN.md):
  - **transport** (WebSocket + protobuf framing) — no React, no three.js.
  - **domain/view-model** (pure TS: tiles, game state, reducers) — no React,
    no three.js, no DOM. This layer MUST be unit tested.
  - **rendering** (three.js / R3F components) — no business logic.
  - **UI** (React DOM overlays: lobby, dialogs, buttons).
- **Pure functions for logic.** Domain logic should be pure and deterministic so
  it is trivially unit-testable. Push side effects to the edges.
- **Types over `any`.** Use precise types. `any` is disallowed by lint; use
  `unknown` + narrowing when needed. Use `import type` for type-only imports.
- **Async hygiene** (lint-enforced): no floating promises, no misused promises,
  no `return await` outside try/catch, no awaiting non-thenables.
- **Naming.** Descriptive names. React components `PascalCase`; functions/vars
  `camelCase`; files: components `PascalCase.tsx`, everything else
  `camelCase.ts`. Test files `*.test.ts` next to the unit under test.
- **No dead code / no commented-out code.** Remove it.
- **Comments explain _why_, not _what_.** Don't narrate obvious code.

## 4. Testing policy

- **Unit-test all domain/view-model logic** (tile decoding, reducers that apply
  events to state, inquiry → option mapping, score math, seat rotation, etc.).
  This is the layer that carries correctness; it is the agent's feedback loop.
- **Do NOT** write heavy GUI/visual/snapshot tests. No Scuba, no screenshot
  diffs, no 3D-render assertions. The user verifies visuals manually.
- Use **Vitest** for logic-level unit tests only. Keep tests fast and
  deterministic. The recorded game in §5 is a rich fixture — use it.
- A change to domain logic without a corresponding test is incomplete.

## 5. The offline replay fixture (your validation harness)

`../RabiRiichi-Cocos/assets/DevData/full_game.json` is a full recorded game
(`GameLogMsg` as JSON: `{ playerLogs: [ { logs: [ {event|inquiry} ] } ] }`).
Copy it into this repo (e.g. `src/dev/fixtures/full_game.json`) and use it to:

- drive the view-model/reducer end-to-end with **no server**, and
- render a real game in the browser for manual visual verification.

Mirror `../RabiRiichi-Cocos/assets/Scripts/Dev/GameLogReader.ts`: feed each log
entry into the same reducer the live transport uses. In offline mode, inquiry
responses are not sent anywhere (they auto-advance).

## 6. Server interaction contract (authoritative summary)

Full details and message shapes are in `DESIGN.md`. Key facts the server
investigation established (do not re-derive — trust these, verify against
`protos/` and `../RabiRiichi/RabiRiichi.Server`):

- **Transport is a raw binary WebSocket carrying length-unprefixed protobuf
  frames. It is NOT gRPC / gRPC-web / JSON.** One `ClientMessageDto` or
  `ServerMessageDto` per WS frame; `ws.binaryType = 'arraybuffer'`.
- Endpoints (default `ws://localhost:5150`): `/ws/public` (unauthenticated:
  `get_info`, `create_user`) and `/ws/connect` (authenticated game socket).
- **Handshake order on `/ws/connect`:** (1) send `client_request.sign_in`
  with the JWT within 15s; (2) reply to the server's `version_check_msg` with a
  `ClientVersionCheckMsg` (client_version ≥ `0.1.0`); (3) maintain a heartbeat.
- **Reliability layer:** monotonic client message `id` (from 1), `respond_to`
  correlation, out-of-order buffering, and a heartbeat that requests resend of
  missing ids. Mirror `RabiWSClient.ts`/`RabiMsgRecord`.
- **Rooms:** `create_room` / `join_room{room_id}` where `room_id` is a 4-digit
  number (1000–9999). Default game is **2 players**. Ready up via
  `client_msg.room_update_msg{status: READY}`; game starts when all are READY.
- **Gameplay = inquiry/response:** server pushes `event` (`EventMsg` oneof) and
  `server_msg.inquiry`. Client answers with
  `client_msg.inquiry_msg{ index, response }` and `respond_to` = inquiry id.
  - `index` selects which action in `actions[]`.
  - `response` is a **JSON string** deserialized by the engine into that
    action's response type:
    - single-choice actions (chii/pon/kan/play-tile/riichi) ⇒ JSON of an
      **int** option index, e.g. `"0"`.
    - multi-choice ⇒ JSON **int array**, e.g. `"[0]"`.
    - confirm actions (agari/ryuukyoku) and skip ⇒ JSON **`{}`** (Empty).
- **Tile encoding:** `GameTileMsg.tile` is a packed `int32`:
  `akadora << 7 | suit << 4 | num`, where `suit` ∈ {M=1,P=2,S=3,Z=4} and `num`
  is the rank. Mirror `../RabiRiichi-Cocos/assets/Scripts/Rabi/Tile.ts`
  (`FromByte`/`toByte`). Cover this with unit tests.
- **State sync:** `sync_game_state_event` carries a full `GameStateMsg` snapshot
  (config, info, wall, players[hand/called/discards/riichi/furiten], current
  player). Hydrate from it, then apply incremental events.
- **4 KB WS frame cap** on the server read buffer — keep client→server messages
  small (they always are; this mainly means don't batch).

### When you may modify the server

Only if the client genuinely cannot work otherwise (e.g. a CORS gap, a missing
field, an enabling endpoint). Keep server edits minimal, justify them in the
task notes, and keep them external/open-source clean. Prefer adapting the client.

## 7. Reusing assets from RabiRiichi-Cocos

Copy assets into `public/` or `src/assets/` (decide per DESIGN.md). Convert
formats where three.js needs it (e.g. FBX → glTF/GLB).

- **Rabbit-girl character** (avatar + result screen):
  `../RabiRiichi-Cocos/assets/Textures/初始表情.png` (3000×3000 PNG w/ alpha).
- **3D tile mesh:** `../RabiRiichi-Cocos/assets/Models/Tile.fbx` (front/side/back
  materials). Re-export to GLB for three.js.
- **Tile face textures (runtime, keyed by tile string):**
  `../RabiRiichi-Cocos/assets/resources/hand_tiles/*.jpg` (`1m`..`9m`, `r5m`,
  `1p`..`9p`, `r5p`, `1s`..`9s`, `r5s`, `1z`..`7z`, plus `back`, `front`,
  `blank`).
- **Table:** `../RabiRiichi-Cocos/assets/Textures/Table_Dif.jpg` and
  `assets/Materials/Table*.mtl`.
- **Center-of-table info graphics:**
  `../RabiRiichi-Cocos/assets/Textures/UI/TableMid/*`.
- **Offline fixture:** `../RabiRiichi-Cocos/assets/DevData/full_game.json`.

Respect the upstream license. Keep copied asset filenames/credits intact.

## 8. Definition of done for a task

A task is done only when ALL hold:

1. Code follows §1 and §3.
2. New/changed domain logic has passing Vitest unit tests (§4).
3. `npm run typecheck && npm run lint && npm run format:check && npm run build &&
npm run test` all pass.
4. The change is small and focused (one logical concern; see TASKS.md sizing).
5. No internal references leaked anywhere (§1.1).
6. If touching the server, the edit is minimal and justified (§6).

## 9. Where to look

- `DESIGN.md` — architecture, layers, scene graph, state model, message flows.
- `TASKS.md` — the decomposed, ordered build plan (each item ≈ one small PR).
- `protos/` — the wire contract (source of truth for messages).
- `../RabiRiichi-Cocos/assets/Scripts/Rabi/` and `.../Game/` — reference
  implementations to mirror (transport, reducers, inquiry mapping).
