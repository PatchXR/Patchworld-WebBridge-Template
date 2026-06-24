# Patchworld UX & Architecture

Patchworld is a massive VR creative sandbox developed in Unity for PCVR and Meta Quest (Android). It allows users to build 3D environments, interactive games, and complex audio synthesis engines using a modular "block" system similar to **Pure Data** or **Max/MSP**. It supports both solo and multiplayer experiences.

## Controls
- **A Button**: Open the "Radial Menu" (sometimes called the "Action Menu").
- **B Button**: Open the Main Menu to browse worlds (via the Discover tab) and blocks (via the Library tab).
- **Grip**: Grab a block to move it.
- **Grip + Trigger**: Pull yourself forward (this is the main Patchworld locomotion, known as "Swimming").
- **Trigger**: Interact with dials and toggles.
- **Grab + Joystick Vertical Axis**: Change a block's size.
- **Swim + Joystick Vertical Axis**: Change player scale.
- **Joystick Horizontal Axis**: Turn around.
- **Joystick Vertical Axis**: Thrust yourself forward or backward.

## Core Concepts
- **Block**: An assembly of inputs, outputs, and interactive objects fulfilling a specific task. There are various types of blocks for audio, physics, visuals, mixed reality, etc.
- **Block's Movable Parts**:
- **Group**: You can select multiple blocks and group them. Once grouped, they are attached together. You can add, remove, or move items using the **Radial Menu -> Open**. Hidden blocks are not visible from outside a group.
- **Device**: A Group can be turned into a Device via the **Radial Menu -> Save**.

## UI Elements
- **Inspector**: Shows a panel to edit specific settings on a block, such as:
  - Changing RGB colors.
  - Changing scale.
  - Hiding inputs or outputs.
- **Radial Menu**:
  - **On a block**: Use "Inspect" for more options, or "Hide", "Lock" position, "Cut", and "Copy".
  - **On a device**: Includes the same options as a block, plus "Open", which allows you to see what's inside.
  - **In empty space**: Provides access to "World Inspector", "Close" (if inside a device), "Select Tool", and "Paste".
- **Main Menu**: The top panel displays current live multiplayer sessions. The Main Panel has five tabs on top:
  - **Profile icon (Top Left)**: Log out/login, edit your player profile, browse your worlds, create new worlds, see your last visited or shared worlds, and view your Vibz balance.
  - **World**: Browse worlds curated by Patchworld.
  - **Library**: An embedded web browser with several tabs on the left:
    - *Featured*: A selection of devices curated by Patchworld.
    - *Published*: Player-made devices (some cost Vibz).
    - *My Assets*: Showcase your own devices, avatars, 3D models, and samples, as well as those you have purchased.
    - *Blocks*: Displays all blocks in their respective categories. Click to spawn them in the world, or click the "i" to view the full description.
    - *News*: News about Patchworld.
    - *Wiki*: Browse the Patchworld Wiki.
  - **Community**: Displays online players. You can search for worlds and player profiles here.
  - **Settings**: Tweak settings like Volume, Locomotion, and Graphic Quality.

## Connections
Usually, players can make connections by clicking and dragging from an output to an input (except for Tags, where it's the opposite).
- **Jolts (Events)**: Values triggered at a specific time (e.g., the beat of a "Metronome" block, or an event sent when a "Raycast" block hits something). This is the most common connection and is illustrated using thin black wires.
- **Streams (Audio)**: Communicate audio buffers (e.g., connecting an Oscillator to a Speaker).
- **Tags (References)**: Represent references to other blocks or devices. For example, they define which block a `block_set_scale` will affect when its jolt input changes. Tag inputs can be connected in two ways:
  - Click and drag directly from the input to the target block.
  - Click and drag from the input to a Tag Output. (Some blocks, like `block_spawn`, output the block they just spawned; `all_with_variable` outputs all blocks with the selected variables).

## Interactive Objects
These are classes derived from `interactiveBase`:
- **Dial**: A knob you can twist or pull up to change a value. Very often, there is a jolt input in the middle to make it patchable. (*`Knob.cs`*)
- **Text Input**: Listed in `SynthComponent.textInputs`. When a player clicks on it with the trigger, a keyboard appears to type text. It's also possible to copy and paste using the button on the left of the keyboard. (*`TextInput.cs`*)
- **Toggle**: Click on it to toggle state. (*`InteractiveToggle.cs`*)
- **Button**: A standard button. (*`Button3D.cs`*)
- **Draggable Part**: A part that can be dragged. (*`InteractiveDrag.cs`*)

## Web Bridge Block (UI Integration)
The **Web Bridge Block** allows bidirectional communication between PatchWorld and an embedded WebBrowser. It acts as a physical interface for web developers to link virtual objects to HTML/JS logic.

### Physical IOs on the Block
- **Inputs:**
  - `Browser (Selection)`: Must be connected to a WebBrowser block to inject the JS Bridge API.
  - `Text In`: Receives text from connected blocks and sends it to JS (`onInterfaceMessageIn`).
  - `Parts In`: When a block or player is connected here, it becomes the "Target". The JS receives `onInterfaceInputPartConnected` and can use it as the default target for commands (Move, Scale, Hide, Lock).
  - `Jolt In`: Any jolt received here triggers `onInterfaceInputJolt` in the JS.
- **Outputs:**
  - `Text Out`: A read-only text panel updated directly from JS (`interfaceMessageOut`).
  - `Parts Out`: A dynamic selection output. The JS can script which blocks this output connects to (via `interfaceAddPartRef` / `interfaceRemovePartRef`), effectively allowing the web UI to route connections dynamically.
  - `Jolt Out`: Emits a jolt whenever the JS calls `interfaceSendJolt`.

## Additional Resources
- **Wiki**: [wiki.patchxr.io](https://wiki.patchxr.io/)
