# TASKS.md — RabiRiichi-Web build plan

Ordered, decomposed tasks for building the client. Each task is sized to ~one
small PR (roughly ≤300 lines excluding generated code/tests). Do them in order;
later tasks depend on earlier ones. Read `AGENTS.md` and `DESIGN.md` before
starting any task.

**Definition of done for every task:** see `AGENTS.md` §8. In short — layered &
small code, unit tests for any domain logic, and
`npm run typecheck && npm run lint && npm run format:check && npm run build &&
npm run test` all green, no internal references.

Mark progress by checking the box and noting the PR/commit.

---

## Phase 0 — Foundations

- [x] **T1. Tooling: Vitest + proto generation.**
  - Add `vitest` (+ `@vitest/coverage-v8` optional) as dev deps; add `"test":
"vitest run"` and `"test:watch": "vitest"` scripts; minimal `vitest.config.ts`
    (jsdom not required for domain tests).
  - Run `npm run proto:update` then `npm run proto:gen`; confirm `src/generated/`
    builds and is git-ignored.
  - Add `src/proto/index.ts` re-export shim over `generated/` (DESIGN §2.1).
  - Add a trivial `src/proto/proto.test.ts` that constructs+encodes+decodes one
    message (e.g. `ClientMessageDto`) to prove the toolchain.
  - _Validates:_ `npm run test` runs and passes.

- [x] **T2. Generic utilities (`src/lib/`).**
  - `Deferred<T>` (promise + resolve/reject), `Logger`, `assert`, small
    collection/string helpers as needed. Each with focused unit tests.
  - No dependencies on other layers.

## Phase 1 — Domain core (pure, fully unit-tested)

- [x] **T3. Tile model (`domain/tile.ts`).**
  - Port Cocos `Rabi/Tile.ts` (DESIGN §3.1): `TileSuit`, `Tile`, `fromByte`,
    `toByte`, `fromString`, `toString`, `compareTo`.
  - _Tests (required):_ byte round-trip for all suits/ranks, red-five (`0p`/`r5m`),
    honors `1z`..`7z`, sorting.

- [x] **T4. View-model types (`domain/model.ts`).**
  - `RoomModel`, `PlayerModel`, `GameInfo`, `PlayerGameState` (DESIGN §3.2) with
    seat helpers (`nextSeat`/`prevSeat`/`playerBySeat`/`playerById`).
  - _Tests:_ seat math for 2- and 4-player configs.

- [x] **T5. Reducer — full-state hydration (`domain/reducer.ts`, part 1).**
  - `hydrateFromGameState(GameStateMsg): GameState` — build the whole view-model
    from a sync snapshot (hands, called, discards, riichi, furiten, doras,
    points, current player). Reference Cocos `SyncGameStateEventHandler`.
  - _Tests:_ hydrate from a snapshot extracted from the recorded fixture.

- [x] **T6. Reducer — incremental events (`domain/reducer.ts`, part 2).**
  - `applyEvent(state, EventMsg): GameState` for the core gameplay events:
    begin-game, deal-hand, draw-tile, discard-tile, claim-tile (chii/pon),
    kan/add-kan, next-player, increase-jun, reveal-dora, set-riichi,
    set-furiten, set-menzen, set-ippatsu. Tiny handler per event.
  - Keep updates immutable; track tiles by `traceId`.
  - _Tests (required):_ per-event unit tests with minimal hand-built events.

- [x] **T7. Reducer — scoring/end events.**
  - agari, apply-score, ryuukyoku, conclude-game, next-game, stop-game,
    end-inquiry. Compute per-player score deltas for the result panel.
  - _Tests:_ agari & ryuukyoku score transfers; next-game advances round/honba.

- [x] **T8. Replay fixture + reducer integration test (`dev/` + `domain/`).**
  - Copy `../RabiRiichi-Cocos/assets/DevData/full_game.json` to
    `src/dev/fixtures/full_game.json`. Add `dev/replay.ts` that parses
    `GameLogMsg` and yields ordered messages (events + inquiries) for one seat.
  - _Test (required, the keystone):_ replay the entire fixture through
    `hydrate`/`applyEvent` without throwing and assert key invariants at the end
    (e.g. tile counts conserved, final scores present, no unknown event hit the
    `other`/`Any` fallback unexpectedly).

- [x] **T9. Inquiry mapping (`domain/inquiry.ts`).**
  - `toOptions(SinglePlayerInquiryMsg)` → UI-agnostic option tree (DESIGN §3.4);
    `encodeInquiryResponse(...)` → `{ index, response }` with correct JSON
    (`"0"` / `"[0]"` / `"{}"`). Reference Cocos `InquiryHandlers.ts`.
  - _Tests (required):_ every action type maps correctly; response JSON exact.

## Phase 2 — Transport & networking (unit-tested with a fake socket)

- [ ] **T10. WebSocket transport (`transport/`).**
  - `RabiSocket` (binary protobuf frames) + `MsgRecord` (monotonic ids,
    `respond_to` correlation via `Deferred`, reorder buffer, gap detection).
    Port Cocos `RabiWSClient.ts`.
  - _Tests:_ feed encoded `ServerMessageDto`s through a mock socket; assert
    ordering, response correlation, gap detection.

- [ ] **T11. Heartbeat & resend (`transport/`).**
  - `TwoWayHeartBeatMsg` loop (id = -1), `max_id`/`requesting_ids`, resend of
    requested client messages.
  - _Tests:_ missing-id request triggers resend; heartbeat scheduling.

- [ ] **T12. Client facade — auth & connect (`net/client.ts`).**
  - URLs (`/ws/public`, `/ws/connect`), `createUser`, `connect`, sign-in +
    version-check handshake, credential persistence (localStorage). Port Cocos
    `RabiRiichiClient.ts` connect path.
  - _Tests:_ handshake sequence against a mock socket (sign-in then version
    reply); reconnect from stored creds.

- [ ] **T13. Message pump + room handlers (`net/messagePump.ts`).**
  - In-order dispatch of incoming `ServerMessageDto` to: room/lobby handler
    (room state) and game pipeline (reducer + inquiry). Mirror Cocos
    `GameMessageQueue` + `ServerMsgHandlers`.
  - _Tests:_ room-state messages update a room model; events reach the reducer.

- [ ] **T14. Rooms API (`net/`): create/join/ready + respondInquiry.**
  - `createRoom`, `joinRoom(roomId)`, `setReady(status)`,
    `respondInquiry(respondTo, option)` (uses `domain/inquiry`’s encoder).
  - _Tests:_ correct wire messages produced for each call.

## Phase 3 — React state bridge

- [ ] **T15. State store (`state/`).**
  - A minimal store (Context + `useSyncExternalStore`, or add `zustand`) holding
    connection status, current room, current `GameState`, and current inquiry
    options. Reducer output flows in; React reads slices via hooks.
  - _Tests:_ store updates on dispatched events (logic-level, no rendering).

## Phase 4 — UI (React DOM, Majsoul-like; manual visual verification)

- [ ] **T16. Connect / login screen (`ui/`).**
  - Server address (default `ws://localhost:5150`) + nickname; calls
    `createUser`/`connect`. Validate `ws://`/`wss://`.
- [ ] **T17. Lobby + create/join room (`ui/`).**
  - Create Room → show 4-digit number to share. Join Room → 4-digit entry
    (1000–9999) → `joinRoom`. Error toasts for NotFound/Unavailable.
- [ ] **T18. Room screen (`ui/`).**
  - Player list with rabbit-girl avatars + Ready/Cancel toggle; auto-transition
    to table when the game starts.

## Phase 5 — Assets & 3D rendering (manual visual verification)

- [ ] **T19. Asset import + conversion.**
  - Copy from Cocos (AGENTS §7) into `public/assets/`: rabbit-girl PNG, tile
    face textures (`hand_tiles/*`), table texture, TableMid info graphics.
  - Convert `Tile.fbx` → `tile.glb` (document the step / add a script). Add a
    small typed asset-path/texture registry module (`scene/assets.ts`) keyed by
    tile string (with a unit test for the key mapping).

- [ ] **T20. Static table scene (`scene/`).**
  - `<Canvas>`, camera (Majsoul 3/4 view), table mesh, lights, seat anchors for
    2 and 4 players. No tiles yet. Seat rotation helper (render-seat) — unit
    test the rotation math.

- [ ] **T21. Tile rendering (`scene/`).**
  - Load `tile.glb`; render a tile with a face texture; `TileDisplayState`
    rotation presets (hand/face/back/sideways). A `TileManager` keyed by
    `traceId`. Render a static hand from a hydrated state.

- [ ] **T22. Bind scene to game state.**
  - Drive hands, rivers (discards), called melds, riichi sticks, scores, current
    -player indicator from the store’s `GameState`. Verify by running the replay
    harness in the browser (`?replay=1`).

- [ ] **T23. Tile animations.**
  - Tween tile moves/flips on draw/discard/claim. Keep timing data-driven.

## Phase 6 — Interaction & result

- [ ] **T24. Inquiry HUD (`ui/` + `scene/`).**
  - Majsoul-style action buttons (Chii/Pon/Kan/Riichi/Ron/Tsumo/Skip/Ryuukyoku)
    - sub-option selection; click-to-discard hand tiles with legal-option
      highlighting. On choice, call `respondInquiry`.
  - Logic (which options, what response) is already tested in T9; this task is
    wiring + visuals.

- [ ] **T25. Round/result + game-end panels (`ui/`).**
  - Agari/ryuukyoku panel: yaku list, fu/han, score deltas, rabbit-girl art;
    next-round advance. Final standings on game end.

## Phase 7 — Wire-up & docs

- [ ] **T26. End-to-end happy path against a local server.**
  - Two browser tabs: create room in one, join in the other (4-digit), both
    ready, play to a result. Fix any integration gaps. Server edits only if
    unavoidable (AGENTS §6).

- [ ] **T27. Local multiplayer testing instructions.**
  - Add a `TESTING.md` (and link from `README.md`) describing exactly how to run
    the server locally (`dotnet run` in `../RabiRiichi/RabiRiichi.Server`,
    `JWT_SECRET` env, port 5150), run the web client (`npm run dev`), and play a
    2-player local game across two browser tabs/profiles. Also document the
    offline replay mode (`?replay=1`).

---

## Known gaps / follow-ups (from Phase 1 review)

These are non-blocking gaps found during review of T4–T9. Tests pass and
point-conservation holds across the full recorded game, but address these before
or during the rendering phase:

- [ ] **F1. `addKanEvent` (kakan) is not handled** in `applyEvent`
      (`reducer.ts`). The recorded fixture contains 8 such events; they are
      currently dropped, so a kakan (adding a tile to an existing pon) will not
      update the called-meld view. Add a `handleAddKan` and a unit test.
- [ ] **F2. `ryuukyokuEvent` ignores its own `score_change`.** Scores currently
      stay correct only because the server also emits `applyScoreEvent`; if a
      ryuukyoku ever carries transfers solely in `RyuukyokuEventMsg`, points
      would desync. Process `ryuukyokuEvent.score_change` (or confirm via the
      server that it is always mirrored by `applyScoreEvent`) and add a test.
- [ ] **F3. Strengthen the replay test** to assert no known event variant is
      silently dropped (e.g. count handled vs. present event types), so gaps like
      F1 fail loudly in future.

## Suggested delegation grouping (for parallel agents)

- **Agent A (domain):** T3–T9 (pure logic, heavily tested). Highest value, fully
  verifiable — best first delegation.
- **Agent B (transport/net):** T10–T14 (needs the `proto/` shim from T1).
- **Agent C (UI/scene):** T15–T25 (depends on A & B landing).
- Integration (T26–T27) after A/B/C converge.

Keep each agent task scoped to a single Tn with its tests; review and merge
before starting dependents.
