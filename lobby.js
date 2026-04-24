import { db } from './firebase_config.js';
import { ref, set, get, child, onValue, onDisconnect, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { initHackerOS } from './hacker_core.js';
import { initAgentOS } from './agent.js';

console.log("=== LOBBY.JS STARTED ===");

// Garbage Collector for Dead Rooms
async function cleanupDeadRooms() {
    const roomsRef = ref(db, 'rooms');
    const snap = await get(roomsRef);
    if (snap.exists()) {
        const now = Date.now();
        snap.forEach(roomSnap => {
            const room = roomSnap.val();
            // Delete rooms older than 2 hours to prevent database bloat
            if (room.createdAt && (now - room.createdAt > 2 * 60 * 60 * 1000)) {
                remove(roomSnap.ref);
            }
        });
    }
}
cleanupDeadRooms();

// DOM Elements
const btnCreate = document.getElementById('btn-create-server');
const btnJoin = document.getElementById('btn-join-server');
const inputCode = document.getElementById('input-server-code');
const statusDiv = document.getElementById('lobby-status');

const lobbyUI = document.getElementById('lobby-ui');
const roleUI = document.getElementById('role-ui');
const hackerUI = document.getElementById('hacker-ui');
const agentUI = document.getElementById('agent-ui');

const roleRoomCode = document.getElementById('role-room-code');
const btnRoleHacker = document.getElementById('btn-role-hacker');
const btnRoleAgent = document.getElementById('btn-role-agent');

const displayRoomCode = document.getElementById('display-room-code');
const displayPlayers = document.getElementById('display-players');
const agentDisplayCode = document.getElementById('agent-display-code');

const gameOverUI = document.getElementById('game-over-ui');
const btnRetry = document.getElementById('btn-retry');
const btnMainMenu = document.getElementById('btn-main-menu');

let currentRoomToJoin = null;

// Helper to generate 4-digit code
function generateCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function showRoleSelection(roomCode) {
    currentRoomToJoin = roomCode;
    lobbyUI.classList.add('hidden');
    roleUI.classList.remove('hidden');
    roleRoomCode.innerText = roomCode;
    
    // Listen for Game Over / Victory State
    const statusRef = ref(db, `rooms/${roomCode}/gameState/status`);
    onValue(statusRef, (snapshot) => {
        if (snapshot.val() === 'game_over') {
            gameOverUI.classList.remove('hidden');
        } else {
            gameOverUI.classList.add('hidden'); // hide if it resets
        }
    });

    const victoryRef = ref(db, `rooms/${roomCode}/gameState/heist_success`);
    onValue(victoryRef, (snapshot) => {
        if (snapshot.val() === true) {
            document.getElementById('victory-ui').classList.remove('hidden');
        }
    });
}

btnCreate.addEventListener('click', async () => {
    console.log("CREATE SERVER CLICKED!");
    btnCreate.disabled = true;
    statusDiv.innerText = "Creating secure connection...";
    
    try {
        const roomCode = generateCode();
        const roomRef = ref(db, `rooms/${roomCode}`);
        
        const snapshot = await get(roomRef);
        if (snapshot.exists()) {
            statusDiv.innerText = "Error: Code collision. Try again.";
            btnCreate.disabled = false;
            return;
        }

        const tables = ["SEC_89X", "VAULT_DB", "CORE_AUTH", "SYS_900"];
        const wires = ["RED", "BLUE", "GREEN"];
        const randomTable = tables[Math.floor(Math.random() * tables.length)];
        const randomWire = wires[Math.floor(Math.random() * wires.length)];

        // Host's connection keeps the room alive. If Host disconnects, room is deleted automatically.
        onDisconnect(roomRef).remove();

        await set(roomRef, {
            status: 'waiting',
            createdAt: Date.now(),
            players: {},
            gameState: {
                status: 'playing',
                startTime: Date.now(),
                alarms: false,
                security: { lasers: "ACTIVE", cameras: "ONLINE" },
                layer1_usb: false,
                layer1_done: false,
                layer2_table: randomTable,
                layer2_wire: randomWire,
                layer2_done: false,
                layer3_active: false,
                layer4_active: false,
                agent_defending: false,
                heist_success: false
            },
            logs: {
                0: { msg: "System Initialized. Awaiting agents...", type: "INFO" }
            }
        });

        showRoleSelection(roomCode);
    } catch (error) {
        console.error(error);
        statusDiv.innerText = `Error: ${error.message}`;
        btnCreate.disabled = false;
    }
});

btnJoin.addEventListener('click', async () => {
    const code = inputCode.value.trim();
    if (code.length !== 4) {
        statusDiv.innerText = "Please enter a 4-digit code.";
        return;
    }

    btnJoin.disabled = true;
    statusDiv.innerText = "Authenticating...";

    try {
        const dbRef = ref(db);
        const roomSnapshot = await get(child(dbRef, `rooms/${code}`));

        if (roomSnapshot.exists()) {
            showRoleSelection(code);
        } else {
            statusDiv.innerText = "Server not found. Connection refused.";
            btnJoin.disabled = false;
        }
    } catch (error) {
        console.error(error);
        statusDiv.innerText = `Error: ${error.message}`;
        btnJoin.disabled = false;
    }
});

btnRoleHacker.addEventListener('click', () => {
    roleUI.classList.add('hidden');
    hackerUI.classList.remove('hidden');
    displayRoomCode.innerText = currentRoomToJoin;

    const playersRef = ref(db, `rooms/${currentRoomToJoin}/players`);
    onValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        if (players) {
            const count = Object.keys(players).length;
            displayPlayers.innerText = `${count}/3`;
        }
    });

    initHackerOS(currentRoomToJoin);
});

btnRoleAgent.addEventListener('click', () => {
    roleUI.classList.add('hidden');
    agentUI.classList.remove('hidden');
    agentDisplayCode.innerText = currentRoomToJoin;

    initAgentOS(currentRoomToJoin);
});

// Game Over Buttons
btnRetry.addEventListener('click', async () => {
    if (!currentRoomToJoin) return;
    
    // Reset room state
    const roomRef = ref(db, `rooms/${currentRoomToJoin}`);
    const tables = ["SEC_89X", "VAULT_DB", "CORE_AUTH", "SYS_900"];
    const wires = ["RED", "BLUE", "GREEN"];
    
    await set(child(roomRef, 'gameState'), {
        status: 'playing',
        startTime: Date.now(),
        alarms: false,
        security: { lasers: "ACTIVE", cameras: "ONLINE" },
        layer1_usb: false,
        layer1_done: false,
        layer2_table: tables[Math.floor(Math.random() * tables.length)],
        layer2_wire: wires[Math.floor(Math.random() * wires.length)],
        layer2_done: false,
        layer3_active: false,
        layer4_active: false,
        agent_defending: false,
        heist_success: false
    });
    
    // We do NOT reload here, because the local JS state resets automatically
    // when gameState/status changes to 'playing' thanks to the listeners.
    document.getElementById('game-over-ui').classList.add('hidden');
});

btnMainMenu.addEventListener('click', () => {
    window.location.reload();
});

document.getElementById('btn-victory-main-menu').addEventListener('click', () => {
    window.location.reload();
});
