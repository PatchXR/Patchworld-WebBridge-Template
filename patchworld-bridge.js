/**
 * PatchWorld WebBridge API
 * Allows bidirectional communication between a web page and the PatchWorld game engine.
 */

window.PatchWorld = {
    // Stores the latest context data received from Unity
    context: null,

    // Stores connected players by playerRef
    players: {},
    LocalPlayer: null,

    // Magic number to tell PatchWorld to ignore an axis when setting transforms
    UNCHANGED: -999999,

    // Lifecycle hooks that developers can override
    onBeforeData: null,
    onData: null,
    onDisconnected: null,
    
    // Player events
    onPlayerConnect: null,
    onPlayerDisconnect: null,

    // Interface Block IO events
    onInterfaceMessageIn: null,
    onInterfaceInputPartConnected: null,
    onInterfaceInputPartDisconnected: null,
    onInterfaceInputJolt: null,

    // Enum matching C# BodyPart for targeting player parts
    PlayerBodyPart: {
        Root: 0,
        RightHand: 1,
        RightCTRL: 2,
        LeftHand: 3,
        LeftCTRL: 4,
        Head: 5,
        Feet: 6
    },

    /**
     * Sends a command to PatchWorld and waits for the response.
     * @param {string} command - The command to execute (e.g., "RunCommand").
     * @param {any} args - The arguments for the command (e.g., "SetTimeScale 0.5").
     * @returns {Promise<any>} - A promise that resolves with PatchWorld's response.
     */
    sendToPatchWorld: function(command, args = {}) {
        return new Promise((resolve, reject) => {
            if (!window.vuplex) {
                console.warn("Vuplex is not available. Are you running this inside PatchWorld?");
                // Fallback for local browser testing
                resolve(null);
                return;
            }

            // Generate a unique ID for this request
            const requestId = Math.random().toString(36).substring(2, 11);
            
            // Define the listener that will wait for the specific response
            const listener = function(event) {
                try {
                    const message = JSON.parse(event.data);
                    
                    // Check if this message is the response to our request
                    if (message.replyTo === requestId) {
                        // Stop listening for this specific request
                        window.vuplex.removeEventListener('message', listener);
                        
                        if (message.error) {
                            reject(message.error);
                        } else {
                            resolve(message.data);
                        }
                    }
                } catch (e) {
                    // Ignore non-JSON messages or unrelated errors
                }
            };
            
            // Attach the listener
            window.vuplex.addEventListener('message', listener);
            
            // Send the request
            window.vuplex.postMessage({
                type: command,
                requestId: requestId,
                data: args
            });
        });
    },

    /**
     * Shortcut to execute a console command in PatchWorld.
     * @param {string} commandName - The name of the command (e.g., "SetTimeScale", "ToasterMessage").
     * @param {...any} args - The arguments for the command (can be string, number, etc.).
     * @returns {Promise<any>} - A promise that resolves with the command's result.
     */
    runCommand: function(commandName, ...args) {
        // Format the arguments into a single string for PatchWorld's console parser
        const argsString = args.map(arg => {
            if (arg === "") {
                // Force quotes for empty strings so they aren't lost during space joining
                return `""`;
            }
            if (typeof arg === 'string' && arg.includes(' ')) {
                // Wrap strings with spaces in quotes so PatchWorld parses them as a single argument
                return `"${arg}"`;
            }
            return arg;
        }).join(' ');

        const fullCommandString = `${commandName} ${argsString}`.trim();
        return this.sendToPatchWorld("RunCommand", fullCommandString);
    },

    /**
     * Extracts the parent device (or group) fullID from a given fullID.
     * fullIDs are structured as paths (e.g. "rootID/groupID/blockID").
     * @param {string} fullID - The fullID of the block.
     * @returns {string} - The fullID of the parent, or an empty string if it's already at the root.
     */
    GetParentDevice: function(fullID) {
        if (!fullID || typeof fullID !== 'string') return "";
        const parts = fullID.split('/');
        if (parts.length <= 1) return "";
        return parts.slice(0, -1).join('/');
    },

    /**
     * Interface IO Methods
     * These require the bridge to be active (context.bridgeId must exist).
     */
    interfaceMessageOut: function(txt) {
        if (!this.context || !this.context.bridgeId) return Promise.reject("Bridge ID not found");
        return this.runCommand("InterfaceMessageOut", this.context.bridgeId, txt);
    },
    
    interfaceSendJolt: function(value) {
        if (!this.context || !this.context.bridgeId) return Promise.reject("Bridge ID not found");
        return this.runCommand("InterfaceSendJolt", this.context.bridgeId, value);
    },
    
    interfaceClearPartRefs: function() {
        if (!this.context || !this.context.bridgeId) return Promise.reject("Bridge ID not found");
        return this.runCommand("InterfaceClearPartRefs", this.context.bridgeId);
    },
    
    interfaceAddPartRef: function(targetBlock, partID = -1) {
        if (!this.context || !this.context.bridgeId) return Promise.reject("Bridge ID not found");
        return this.runCommand("InterfaceAddPartRef", this.context.bridgeId, targetBlock, partID);
    },
    
    interfaceRemovePartRef: function(targetBlock, partID = -1) {
        if (!this.context || !this.context.bridgeId) return Promise.reject("Bridge ID not found");
        return this.runCommand("InterfaceRemovePartRef", this.context.bridgeId, targetBlock, partID);
    }
};

// Global shorthands for convenience
window.sendToPatchWorld = window.PatchWorld.sendToPatchWorld.bind(window.PatchWorld);
window.runCommand = window.PatchWorld.runCommand.bind(window.PatchWorld);
window.GetParentDevice = window.PatchWorld.GetParentDevice.bind(window.PatchWorld);

// ==========================================
// Handshake & Lifecycle Management
// ==========================================

function initPatchWorldBridge() {
    if (!window.vuplex) {
        console.warn("Vuplex not found. Waiting for vuplexready event...");
        window.addEventListener('vuplexready', setupBridgeListeners);
    } else {
        setupBridgeListeners();
    }
}

function setupBridgeListeners() {
    // Listen for lifecycle events from Unity
    window.vuplex.addEventListener('message', function(event) {
        try {
            const message = JSON.parse(event.data);
            
            if (message.type === "pxr.bridge.context") {
                window.PatchWorld.players = {};
                window.PatchWorld.LocalPlayer = null;

                if (message.data && message.data.localPlayer) {
                    const lp = message.data.localPlayer;
                    window.PatchWorld.LocalPlayer = lp;
                    window.PatchWorld.players[lp.playerRef] = lp;
                }

                if (typeof window.PatchWorld.onBeforeData === 'function') {
                    window.PatchWorld.onBeforeData();
                }
                
                window.PatchWorld.context = message.data;
                
                if (typeof window.PatchWorld.onData === 'function') {
                    window.PatchWorld.onData(window.PatchWorld.context);
                }
            }
            else if (message.type === "pxr.bridge.disconnected") {
                window.PatchWorld.context = null;
                window.PatchWorld.players = {};
                window.PatchWorld.LocalPlayer = null;

                if (typeof window.PatchWorld.onDisconnected === 'function') {
                    window.PatchWorld.onDisconnected();
                }
            }
        } catch (e) {
            // Ignore parse errors
        }
    });

    // Unity will call these internal callbacks via ExecuteJavaScript
    window.PatchWorld._internal_onPlayerConnect = function(player) {
        window.PatchWorld.players[player.playerRef] = player;
        if (player.isLocal) window.PatchWorld.LocalPlayer = player;
        
        if (typeof window.PatchWorld.onPlayerConnect === 'function') {
            window.PatchWorld.onPlayerConnect(player);
        }
    };

    window.PatchWorld._internal_onPlayerDisconnect = function(player) {
        delete window.PatchWorld.players[player.playerRef];
        if (player.isLocal) window.PatchWorld.LocalPlayer = null;
        
        if (typeof window.PatchWorld.onPlayerDisconnect === 'function') {
            window.PatchWorld.onPlayerDisconnect(player);
        }
    };

    window.PatchWorld._internal_onInterfaceMessageIn = function(txt) {
        if (typeof window.PatchWorld.onInterfaceMessageIn === 'function') {
            window.PatchWorld.onInterfaceMessageIn(txt);
        }
    };

    window.PatchWorld._internal_onInterfaceInputPartConnected = function(data) {
        if (typeof window.PatchWorld.onInterfaceInputPartConnected === 'function') {
            window.PatchWorld.onInterfaceInputPartConnected(data);
        }
    };

    window.PatchWorld._internal_onInterfaceInputPartDisconnected = function(data) {
        if (typeof window.PatchWorld.onInterfaceInputPartDisconnected === 'function') {
            window.PatchWorld.onInterfaceInputPartDisconnected(data);
        }
    };

    window.PatchWorld._internal_onInterfaceInputJolt = function(value) {
        if (typeof window.PatchWorld.onInterfaceInputJolt === 'function') {
            window.PatchWorld.onInterfaceInputJolt(value);
        }
    };

    // Notify Unity that the page is ready to receive context data
    window.vuplex.postMessage({ type: "pxr.bridge.ready" });
}

// Auto-initialize
initPatchWorldBridge();
