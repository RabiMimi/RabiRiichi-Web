# DESIGN.md — RabiRiichi-Web architecture

This document is the technical blueprint for the RabiRiichi web client. It is
the source of truth for _how_ the client is structured. Read `AGENTS.md` first
for rules and the server-contract summary.

## 1. Goals & constraints

- A 3D riichi mahjong client in the browser. Look & flow ≈ **Mahjong Soul**.
- Talk to the existing `RabiRiichi.Server` over its **binary-protobuf
  WebSocket** (see §4). No gRPC-web.
- **Private rooms**: a user creates a room and gets a 4-digit room number;
  others join by entering that number.
- Clean, layered, testable code. Domain logic is pure and unit-tested; visuals
  are verified manually.
- External/open-source only (no internal deps).

## 2. Layered architecture

Four layers, each with a one-way dependency flow:
`transport → domain → (state) → rendering/UI`. Lower layers never import upper
layers.

```
src/
  generated/            # protobuf bindings (git-ignored, do not edit)
  proto/                # thin re-export shim over generated/ (stable import surface)
  lib/                  # generic, framework-free utilities (Deferred, Logger, assert, ...)
  transport/            # WebSocket + protobuf framing + reliability  (NO react/three)
  domain/               # pure game logic: tiles, view-model, reducers  (NO react/three/dom)
  net/                  # high-level client facade: connect, rooms, inquiry  (uses transport+domain)
  state/                # React state stores/hooks bridging net+domain to UI
  scene/                # three.js / react-three-fiber rendering        (NO business logic)
  ui/                   # React DOM overlays: lobby, dialogs, HUD
  dev/                  # offline replay harness + fixtures
  App.tsx, main.tsx
```

Rationale: the **transport** and **domain** layers are framework-free and
exhaustively unit-testable — that's where correctness lives and where the
agent's feedback loop comes from. **scene** and **ui** are thin and verified by
eye.

### 2.1 `proto/` shim

Mirror Cocos's `Data/Protos.ts`: re-export the concrete classes/enums you use
(`ClientMessageDto`, `ServerMessageDto`, `EventMsg`, `GameTileMsg`, enums, etc.)
from `generated/`, and re-export `I*` interfaces as types. Everything else
imports from `proto/`, never directly from `generated/`. This isolates the one
allowed dependency on generated code.

## 3. Domain layer (the testable core)

Pure TypeScript. No React, no three.js, no DOM, no WebSocket.

### 3.1 Tiles (`domain/tile.ts`)

Port `../RabiRiichi-Cocos/assets/Scripts/Rabi/Tile.ts` exactly:

- `TileSuit = { Invalid:0, M:1, P:2, S:3, Z:4 }`
- `Tile { num, suit, akadora }`
- `fromByte(b)`: `num = b & 0x0f`, `suit = (b >> 4) & 0x07`, `akadora = (b & 0x80) !== 0`
- `toByte()`: `(akadora?0x80:0) | (suit<<4) | num`
- `toString()` / `fromString()` (`r5m`, `0p` = red five, `1z`..`7z` honors)
- `compareTo()` for sorting.

`GameTileMsg.tile` (an `int32`) decodes via `fromByte`. The `traceId` field is
the stable per-instance id used to track a tile across events.
**Unit-test the round-trip and edge cases (red fives, honors).**

### 3.2 View-model (`domain/model.ts`)

Plain data classes mirroring Cocos `Rabi/Info.ts`:

- `RoomModel { id, config, info: GameInfo, players: PlayerModel[] }` with
  `playerBySeat`, `playerById`, `nextSeat`, `prevSeat`.
- `PlayerModel { id, nickname, status, seat, gameState }`.
- `GameInfo { round, dealer, honba, riichiStick, remainingTiles, currentPlayer,
doras[], uradoras[] }`.
- `PlayerGameState { jun, points, riichiTileId, furiten{discard/riichi/temp},
hand:{ freeTiles[], called[], discarded[] }, agari? }`.

Seats are server-absolute (0..playerCount-1). Rendering rotates them so the
local player is always at the bottom (see §6.2). Keep that rotation in the
rendering layer, not the model.

### 3.3 Reducer (`domain/reducer.ts`) — the heart of correctness

A pure function family that applies server messages to the view-model:

```
applyEvent(state: GameState, event: EventMsg): GameState        // immutable update
hydrateFromGameState(snapshot: GameStateMsg): GameState         // full reset/sync
```

- Handle every `EventMsg` oneof variant (see §4.5). Reference the 24 handlers in
  `../RabiRiichi-Cocos/assets/Scripts/Game/GameEventHandlers.ts` and the
  full-state rebuild `SyncGameStateEventHandler` (≈ line 370 there).
- Prefer immutable updates returning a new state (easier to test & to drive
  React). Keep per-event handlers tiny and individually tested.
- This layer is **mandatory unit-tested**, driven both by hand-written minimal
  events and by replaying the recorded `full_game.json` fixture (§7).

### 3.4 Inquiry → options (`domain/inquiry.ts`)

Pure mapping from `SinglePlayerInquiryMsg` to a UI-agnostic option tree, and the
inverse: from a chosen option to the `{ index, response }` wire answer.

Mirror `../RabiRiichi-Cocos/assets/Scripts/Game/InquiryHandlers.ts`:

- Each `PlayerActionMsg` in `actions[]` becomes an option labelled by type
  (Majsoul-style: Chii 吃 / Pon 碰 / Kan 杠 / Riichi 立直 / Ron 和 / Tsumo 自摸 /
  Ryuukyoku 流局 / Skip 跳过 / discard-a-tile).
- Actions with multiple candidate groups/tiles (chii/pon/kan/riichi/play-tile)
  produce sub-options the player picks among.
- **Answer encoding** (see AGENTS.md §6): `index` = position in `actions[]`;
  `response` = JSON string:
  - single-choice (chii/pon/kan/play-tile/riichi) ⇒ JSON of the chosen option
    **int** index, e.g. `"0"`.
  - multi-choice ⇒ JSON int array, e.g. `"[0]"`.
  - confirm (agari/ryuukyoku) & skip ⇒ `"{}"`.

  Keep this encoding in one tested helper (`encodeInquiryResponse`).

## 4. Transport & networking

### 4.1 Wire transport (`transport/`)

Port `../RabiRiichi-Cocos/assets/Scripts/Rabi/RabiWSClient.ts`:

- `RabiSocket`: wraps `WebSocket` with `binaryType = 'arraybuffer'`. Send =
  `ClientMessageDto.encode(msg).finish()`; receive = `ServerMessageDto.decode(
new Uint8Array(data))`. One protobuf message per frame (no length prefix).
- **Reliability** (`MsgRecord`): monotonic client `id` from 1; track server ids;
  buffer & reorder; `respond_to` correlates responses to a `Deferred`/promise;
  detect gaps.
- **Heartbeat:** `TwoWayHeartBeatMsg` (id = -1) on an interval (~2s like Cocos);
  carry `max_id` + `requesting_ids`; resend client messages the server asks for.
- **Request/response:** `send(msg).waitResponse(timeout)` returns the correlated
  `ServerResponse` (15s timeout like Cocos).

This layer is unit-testable with a fake/mock `WebSocket`.

### 4.2 Client facade (`net/client.ts`)

Port `../RabiRiichi-Cocos/assets/Scripts/Rabi/RabiRiichiClient.ts`:

- URLs from a base (default `ws://localhost:5150`):
  `/ws/public` (unauth) and `/ws/connect` (auth).
- `createUser(nickname)` over `/ws/public` ⇒ `{ id, accessToken }`.
- `connect(base)` / reconnect from saved creds (localStorage keys, e.g.
  `rabiriichi_url`, `rabiriichi_token`).
- Handshake on `/ws/connect`: sign-in (JWT) → version-check reply → heartbeat.
- `createRoom()`, `joinRoom(roomId)`, `setReady(status)`, `respondInquiry(
respondTo, index, response)`.
- A message pump (`net/messagePump.ts`) feeds incoming `ServerMessageDto`s, in
  order, to (a) the room/lobby handler and (b) the game reducer + inquiry
  handler. Mirror Cocos `GameMessageQueue` + `ServerMsgHandlers`.

### 4.3 Bootstrap & auth

- Identity = integer user id inside a JWT (7-day). Obtain via `create_user`.
- On `/ws/connect`, first message MUST be `client_request.sign_in{access_token}`
  within 15s, else the server closes the socket with `Unauthenticated`.

### 4.4 Rooms / lobby

- `create_room` (auth) ⇒ `ServerRoomStateResponse`; creator auto-joins.
- `join_room{room_id}` with the 4-digit number ⇒ room state, or `NotFound` /
  `Unavailable` (full).
- Readiness: `client_msg.room_update_msg{status}` with `UserStatus`
  (`NONE→IN_ROOM→READY→PLAYING`). All players READY ⇒ server starts the game.
- Room state pushes: `ServerRoomStateMsg{ id, config, players[] }`.

### 4.5 Game messages

- Server → client: `ServerMessageDto.event` (`EventMsg` oneof: deal/draw/
  discard/claim/kan/agari/apply-score/reveal-dora/set-riichi/set-furiten/
  ryuukyoku/next-game/sync-game-state/end-inquiry/...), and
  `ServerMessageDto.server_msg.inquiry` (`ServerInquiryMsg`).
- Client → server: `client_msg.inquiry_msg{ index, response }` with `respond_to`
  = inquiry message id.
- See `protos/Events/Event.proto` for the full oneof and tags; `protos/Events/
InGame/*` for each event's fields; `protos/Communication/Sync/GameState.proto`
  for the snapshot.

## 5. React + state bridge (`state/`)

- Keep React state minimal and derived from the domain model. A small store
  (Context + `useSyncExternalStore`, or Zustand if added as a dep) holds:
  connection status, current room, and current `GameState`.
- The reducer output (immutable `GameState`) is pushed into the store; React
  components subscribe to slices. No game logic in components.
- Inquiry UI subscribes to "current inquiry options"; on user choice it calls
  `net.respondInquiry(...)` via the encoded answer from `domain/inquiry.ts`.

## 6. Rendering (`scene/`) — three.js / R3F

### 6.1 Scene graph

- `<Canvas>` with a camera angled over a square table (Majsoul-style 3/4 view).
- Table: textured plane/box using `Table_Dif.jpg`; center info panel
  (round/honba/wall-count/seat winds) from `Textures/UI/TableMid/*`, rendered
  either as textured quads or as an HTML overlay (simpler — prefer overlay).
- Per player (4 seats max; default 2): hand, called melds (fuuro), discard pond
  (river), riichi stick, score, avatar (rabbit-girl image).
- Tiles: instances of the GLB tile mesh (from `Tile.fbx`) with a per-tile face
  texture from `hand_tiles/*`. Track tile nodes by `traceId` (mirror Cocos
  `TableComponent.tileComponents`), so events animate existing tiles.

Tile display states (mirror Cocos `TileComponent.TileDisplayState`): Hand /
Face-up / Back / Sideways (called) / Sideways-back, each a rotation preset.
Animate moves/rotations with a tween (e.g. drei/`@react-spring/three` or manual
lerp in `useFrame`).

### 6.2 Seat rotation

Local player always at the bottom. Render-seat = `(seat - selfSeat + N) % N`.
Keep this transform in the scene layer.

### 6.3 Interaction

- Raycast hand tiles for discard selection (R3F `onPointer*` events; no manual
  raycaster needed). Highlight legal options coming from the current inquiry.

### 6.4 Assets

Tile mesh `Tile.fbx` must be converted to **GLB** for three.js (document the
conversion in `public/assets/README` or a script). Face textures and the
rabbit-girl PNG can be used as-is. Put runtime-loaded assets under `public/` so
Vite serves them by URL; import small static ones via `src/assets` if preferred.

## 7. Offline replay harness (`dev/`)

- Copy `../RabiRiichi-Cocos/assets/DevData/full_game.json` to
  `src/dev/fixtures/full_game.json`.
- `dev/replay.ts`: parse it as `GameLogMsg`, then feed each `logs[]` entry to the
  SAME pipeline the live socket uses — events into the reducer, inquiries into
  the inquiry handler (auto-advance, no network). Mirror Cocos
  `Dev/GameLogReader.ts` (it fabricates a fake room + players).
- Expose a dev route/flag (`?replay=1` or `import.meta.env.DEV`) to launch the
  table from the fixture for manual visual checks.
- Use the fixture as a fixture in reducer unit tests too.

## 8. Majsoul-like UX flow

1. **Title / connect** → enter server (default `ws://localhost:5150`) + nickname.
2. **Lobby** → Create Room (shows the 4-digit number to share) or Join Room
   (enter number).
3. **Room** → player list with avatars, Ready toggle; auto-start when all ready.
4. **Table** → 3D game; inquiry buttons (Chii/Pon/Kan/Riichi/Ron/Tsumo/Skip)
   appear Majsoul-style near the bottom; discard by clicking a hand tile.
5. **Round/Result** → agari/ryuukyoku panel with yaku, score deltas, and the
   rabbit-girl art; advance to next round.
6. **Game end** → final standings.

## 9. Out of scope (for now)

- Spectating, reconnect-UX polish beyond what the protocol gives for free,
  animations beyond basic tile moves, sound, settings persistence beyond creds.
  Note these as follow-ups; do not block core flow on them.
