# TESTING.md — Local and Offline Replay Testing

This document explains how to run local integration testing for the RabiRiichi web client.

---

## 1. Running the Local C# Server

The server lives in the sibling repository `../RabiRiichi/RabiRiichi.Server`.

### Prerequisites

- .NET 9 SDK installed.

### Steps

1. Navigate to the server directory:
   ```bash
   cd ../RabiRiichi/RabiRiichi.Server
   ```
2. Run the server:

   ```bash
   dotnet run
   ```

   By default, this command reads `Properties/launchSettings.json` and starts the server on **`http://localhost:5150`** with a pre-configured development `JWT_SECRET`.

3. _(Optional)_ To run on a different port or customize the JWT Secret:
   ```bash
   JWT_SECRET="your-secret-key" ASPNETCORE_URLS="http://*:5150" dotnet run
   ```

---

## 2. Running the Web Client

1. Open a new terminal in the `RabiRiichi-Web` workspace.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   The client will run at **`http://localhost:5173`** (or a similar port printed in the terminal).

---

## 3. Local Multiplayer Testing (2-Player Happy Path)

To test the full gameplay loop, you need two distinct user sessions. Open the client URL in two separate browser windows:

- **Session 1**: Standard browser window/tab.
- **Session 2**: Incognito/private window, or a different browser profile (to prevent sharing credential tokens in `localStorage`).

### Setup & Connect

1. **Player 1**:
   - Go to `http://localhost:5173`.
   - Enter a nickname (e.g. `Alice`).
   - Keep the default Server Address (`ws://localhost:5150`).
   - Click **Connect**.
2. **Player 2**:
   - Go to `http://localhost:5173` (in Incognito or a different profile).
   - Enter a different nickname (e.g. `Bob`).
   - Click **Connect**.

### Create & Join Room

1. **Player 1 (Host)**:
   - Click **Create Room** on the Lobby Screen.
   - You will be redirected to the Room Screen. Note the 4-digit Room ID (e.g. `1234`).
2. **Player 2 (Guest)**:
   - In the Lobby Screen, enter the 4-digit Room ID in the join box.
   - Click **Join Room**.

### Playing

1. On the Room Screen, both players must check the **Ready** checkbox.
2. When all players are ready, the game will transition to the 3D game table.
3. The GamePlay HUD displays player names, seats, and current points.
4. When it is your turn, click a legal hand tile with the mouse to discard it. On touch devices, tap once to select and raise a tile, then tap the same tile again to play it. Tapping a different tile changes the selection. Alternatively, drag a legal tile upward and release beyond the discard threshold.
5. Action options (Chii, Pon, Kan, Riichi, Skip, etc.) appear as Majsoul-style HUD overlay buttons when applicable.
6. Once the game ends, the translucent **Result Panel** displays yaku lists, fu/han/yakuman count, and per-player point changes.
7. Click the proceed button on the Result Panel to return to the Lobby.

For mobile interaction checks, touch a tile to show its info immediately (with tile tooltips enabled), then move your finger over other tiles to inspect them without lifting it. This also works when the touch starts on empty space and moves onto a tile. Info closes when the finger leaves the tiles or is released. A stationary inspection must not select or play the tile on release. Check both sorted hand tiles and the separate drawn tile. Drag a hand tile anywhere on the screen, including sideways and downward; it follows the finger in every direction. On release it returns to its original place unless its upward displacement exceeds the discard threshold and the current prompt allows that tile. Check outside your turn and illegal tiles after riichi. A tile picked up before your turn stays in your finger through the turn change (your draw arriving does not drop it), so it can be released past the threshold to discard it; the drag ends only if that tile leaves your hand. Cancelling a touch must also return the tile without submitting an action.

On a phone in landscape, check that the HUD, lobby, room and login screens fit without sideways scrolling, that dropdowns near the bottom open upward instead of being cut off, and that your own sticker and chat bubbles appear above the left end of your hand rather than on it. In Settings > Game > Controls, turning off **Double-click table to discard drawn tile** must make a double-click on the table do nothing on your turn, and turning off **Close chat after sending** must keep the chat box and sticker tray open after sending.

---

## 4. Offline Replay Mode

If you want to verify rendering, HUD elements, or result screen layouts without running the local backend:

1. Start the Vite dev server (`npm run dev`).
2. Navigate to:
   ```
   http://localhost:5173/?replay=1
   ```
3. This mode reads the offline game log fixture (`src/dev/fixtures/full_game.json`) and simulates the game reducer pipeline.
4. The client will advance through events and automatically submit decisions to step through the entire mahjong game up to the final result panel.
