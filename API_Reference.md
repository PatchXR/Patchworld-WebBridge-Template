# PatchWorld WebBridge API Reference

Welcome to the WebBridge API documentation for PatchWorld.
This library allows you to communicate directly with the PatchWorld game engine from your own Web interface (HTML/JS) displayed inside a Browser block.

## 🚀 Quick Start

1. Include the `patchworld-bridge.js` file in your HTML page:
```html
<script src="patchworld-bridge.js"></script>
```

2. Make sure your Javascript code runs asynchronously so you can query PatchWorld and await its responses easily.

> [!TIP]
> **Local Development:** You can test your HTML/JS interfaces locally in PatchWorld without hosting them on a web server!
> In the Browser block's URL field, use the `file://` protocol. 
> For example, if you place your files in the `StreamingAssets` folder, you can type:
> `file://PathToYour/index.html`

## 🔄 Lifecycle & Context Data

PatchWorld automatically provides context data to your Web UI (like the Player Name, User ID, World ID, etc.).
To manage state cleanly, the API provides **Lifecycle Hooks**.

### Connection Callbacks
Override these properties on `PatchWorld` to react to state changes:
- `PatchWorld.onBeforeData = function() { ... }` : Called when the bridge is ready, right before the initial `pxr.bridge.context` data is processed. Use this to clear your local state.
- `PatchWorld.onData = function() { ... }` : Called when the Unity bridge has established a connection and provided the `context` object.
- `PatchWorld.onDisconnected = function() { ... }` : Called when the block is disconnected or destroyed in PatchWorld.

### Player Callbacks & Data
Players in the room (including the LocalPlayer) are synchronized to the JavaScript side.
- **`PatchWorld.players`** : A dictionary of all connected players, keyed by their `playerRef`.
- **`PatchWorld.LocalPlayer`** : A direct reference to the Local Player object, or `null` if not found.
- `PatchWorld.onPlayerConnect = function(player) { ... }` : Called whenever a new player joins the room or is already in the room when the UI connects.
- `PatchWorld.onPlayerDisconnect = function(player) { ... }` : Called whenever a player leaves the room.

**Player Object Format:**
```json
{
  "playerRef": "player:0fb5acb6de123",
  "playerId": "0fb5acb6de123",
  "playerName": "DarkKiller666",
  "isLocal": true
}
```

**Global Access:**
The context is passed as an argument to `onData`, but you can also access it anywhere, at any time, via:
```javascript
console.log(window.PatchWorld.context.username);
```

### 🎛️ Physical Block Interface (IO)
The WebBridge block in PatchWorld has physical inputs and outputs you can interact with from Javascript.
Override these properties on `PatchWorld` to receive physical inputs:
- `PatchWorld.onInterfaceMessageIn = function(txt) { ... }` : Receives text from the "Text In" physical connection.
- `PatchWorld.onInterfaceInputPartConnected = function(data) { ... }` : Called when a block is plugged into the "Parts In" connection. `data` is an object: `{ fullId, partId }`.
- `PatchWorld.onInterfaceInputPartDisconnected = function(data) { ... }` : Called when a block is unplugged.
- `PatchWorld.onInterfaceInputJolt = function(value) { ... }` : Called when the "Jolt In" receives a physical trigger.

Use these helper methods to trigger physical outputs:
- `await PatchWorld.interfaceMessageOut(txt)` : Sends text to the physical "Text Out" connection.
- `await PatchWorld.interfaceSendJolt(value)` : Emits a physical jolt from "Jolt Out".
- `await PatchWorld.interfaceClearPartRefs()` : Disconnects all blocks from the "Parts Out" store.
- `await PatchWorld.interfaceAddPartRef(targetBlock, partID)` : Connects a specific block to "Parts Out".
- `await PatchWorld.interfaceRemovePartRef(targetBlock, partID)` : Disconnects a specific block from "Parts Out".

---

## 🛠️ API Usage

The API is `Promise`-based. The main shortcut function is `runCommand(commandName, ...args)`.

```javascript
// Example: Change the game's time scale
async function slowMotion() {
    try {
        // Calls the console command "SetTimeScale" with the value 0.5
        await runCommand("SetTimeScale", 0.5);
        console.log("Slow motion activated!");
    } catch (error) {
        console.error("Error:", error);
    }
}
```

### System State & Info
- **`GetWorldID`** : Returns the current World's ID.
- **`GetUserID`** : Returns the local Player's ID.
- **`GetBlockInfo <blockFullID>`** : Returns a JSON string with `IDName`, `DisplayName`, `AssetId`, `AssetUrl`, `AssetPath`, and `AssetUrlOrPath`.

---

## 🪪 Understanding Block IDs (`fullID`)

In PatchWorld, a `fullID` (or `PathID`) represents the hierarchical path of a block from the root of the world. It is composed of IDs separated by slashes (`/`).
For instance, a `fullID` of `"1234/5678"` means that block `5678` is located inside the sub-patch `1234`. If it is `"5678"`, it is at the root of the world.

> [!NOTE]
> **Players as Blocks**: You can target players in Transform commands using their `playerRef` (e.g., `"player:0fb5acb6de"`). When using a `playerRef` as a target or space, the `partID` maps to the player's BodyParts:
> - `0` = Root
> - `1` = RightHand
> - `2` = RightCTRL
> - `3` = LeftHand
> - `4` = LeftCTRL
> - `5` = Head
> - `6` = Feet

> [!TIP]
> **JavaScript Helper:**
> The `patchworld-bridge.js` API provides a convenient `GetParentDevice(fullID)` function to easily extract the parent group of any block.
> ```javascript
> let parentID = GetParentDevice("1234/5678/9999");
> // Returns "1234/5678"
> ```

---

## 🎮 PatchWorld Commands (Console API)
*(This list will be updated as new features are added)*

### 🧱 Blocks & Scene
- **`CopyBlock <sourcePathID> <parentPathID>`** : Duplicates a block and returns its new `fullID`.
  - `sourcePathID`: The `fullID` of the block to copy.
  - `parentPathID`: (Optional) The `fullID` of a `SubPatch` where the new block should be spawned. Leave empty `""` to spawn it at the root of the world.
  - Example: `CopyBlock "1234/5678" ""`
- **`RemoveBlock <blockPathID> <delay>`** : Deletes a block from the world. Returns `"SUCCESS"` or an error string.
  - `blockPathID`: The `fullID` of the block to delete.
  - `delay`: (Optional, default `0`) Number of seconds to wait before the block is destroyed.
  - Example: `RemoveBlock "1234/5678" 1.5`

### 📐 Transforms (Position, Rotation, Scale)
All set/get methods below support `partID` (default `0`) if you need to manipulate a specific sub-mesh of the block.
They also support an optional relative space coordinate system via `blockAsSpace` and `blockAsSpacePartID`.
If you only want to change one axis, pass the magic number `PatchWorld.UNCHANGED` (or `-999999`) for the axes you want to leave alone!

- **`SetBlockPosition <blockFullID> <x> <y> <z> [partID] [blockAsSpace] [blockAsSpacePartID]`** : Moves a block.
  - Example: `SetBlockPosition "123" 0.0 1.0 PatchWorld.UNCHANGED` (Moves to Y=1, leaves X and Z where they are).
- **`GetBlockPosition <blockFullID> [partID] [blockAsSpace] [blockAsSpacePartID]`** : Returns a JSON string `{"x":0.0, "y":0.0, "z":0.0}`.
- **`SetBlockRotation <blockFullID> <x> <y> <z> [partID] [blockAsSpace] [blockAsSpacePartID]`** : Sets Euler rotation.
- **`GetBlockRotation <blockFullID> [partID] [blockAsSpace] [blockAsSpacePartID]`** : Returns Euler rotation JSON.
- **`SetBlockQuaternion <blockFullID> <x> <y> <z> <w> [partID] [blockAsSpace] [blockAsSpacePartID]`** : Sets Quaternion rotation.
- **`GetBlockQuaternion <blockFullID> [partID] [blockAsSpace] [blockAsSpacePartID]`** : Returns Quaternion JSON.
- **`SetBlockScale <blockFullID> <x> <y> <z> [partID]`** : Sets local scale. (Use `PatchWorld.UNCHANGED` to ignore axes).
- **`GetBlockScale <blockFullID> [partID]`** : Returns a JSON string with `x`, `y`, `z`.

### Block State
- **`SetBlockVisible <blockFullID> <isVisible> [partID]`** : Sets visibility. If `partID` is `-1` (default), affects all parts of the block.
- **`SetBlockLocked <blockFullID> <isLocked>`** : Locks/unlocks a block's position, preventing physical grabbing.

### ⏱️ Time and Engine
- **`SetTimeScale <float>`** : Changes the global time scale of the game. Example: `SetTimeScale 0.5`.

### 🍞 UI & Feedback
- **`ToasterMessage <string>`** : Displays a temporary text popup (Toaster) in front of the player. Example: `ToasterMessage Hello PatchWorld`.

### 📡 Wireless Connectivity
- **`SendWirelessJolt <float_value> <channelStr> <channelInt> <restrictionPathID>`** : Sends a wireless event (Jolt) to any block listening on the specified channel.
  - `float_value`: The value to send.
  - `channelStr`: The string name of the channel.
  - `channelInt`: The integer ID of the channel (use `0` for any).
  - `restrictionPathID`: (Optional) Provide the PathID of a specific block/subpatch to restrict the broadcast to that block only. Use `""` for no restriction.
  - Example: `SendWirelessJolt 1.0 "trigger" 0 ""`

### 🌐 Online Variables
- **`PostString <key> <value>`** : Saves a string to the PatchXR server at the specified key. Returns `"SUCCESS"` or `"ERROR_Budget_Exceeded_Try_Later"`.
- **`PostValue <key> <value>`** : Saves a numeric value (float/double) to the server at the specified key. Returns `"SUCCESS"` or `"ERROR_Budget_Exceeded_Try_Later"`.
- **`FetchString <key>`** : Retrieves a string from the server. Returns the string, `"ERROR_Not_Found"`, or `"ERROR_Budget_Exceeded_Try_Later"`.
- **`FetchValue <key>`** : Retrieves a numeric value from the server. Returns the number as a string, `"ERROR_Not_Found"`, or `"ERROR_Budget_Exceeded_Try_Later"`.
  > *Note:* These API calls consume the global online variable budget (max 10 operations per 10 seconds).

---

## 💡 Advanced Examples

### Fire and Forget (Performance)
If you do not care about the result of a command and simply want to execute several commands as fast as possible without waiting for the Unity main thread to reply, you can omit the `await` keyword.

```javascript
// These commands will be queued instantly from the JS side
runCommand("SetTimeScale", 0.5);
runCommand("ToasterMessage", "Slowing down time!");
runCommand("SendWirelessJolt", 1.0, "trigger");
```
*Note: Because there is no `await`, Javascript will instantly move to the next line without waiting for the frame delay of the Unity ↔ JS handshake.*

### Waiting for multiple commands in parallel
If you want to execute several commands at once but still wait until all of them are processed by Unity, use `Promise.all`:

```javascript
await Promise.all([
    runCommand("PostValue", "score", 100),
    runCommand("PostString", "status", "playing")
]);
// Code here continues only after BOTH commands have returned a response
```

### Fetching information and reacting to it
```javascript
async function doSomethingComplex() {
    // 1. Fetch info (Assuming a 'GetPlayerCount' command exists)
    const playerCount = await runCommand("GetPlayerCount");
    
    // 2. Process the info in JS
    if (playerCount > 1) {
        // 3. Send a new command based on the result
        await runCommand("SetTimeScale", 1.0);
    }
}
```
