import { db } from './firebase_config.js?v=3';
import { ref, set, get, child, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { initHackerOS } from './hacker_core.js?v=3';
import { initAgentOS } from './agent.js?v=3';

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
    
    // Listen for Game Over State
    const statusRef = ref(db, `rooms/${roomCode}/gameState/status`);
    onValue(statusRef, (snapshot) => {
        if (snapshot.val() === 'game_over') {
            gameOverUI.classList.remove('hidden');
        } else {
            gameOverUI.classList.add('hidden'); // hide if it resets
        }
    });
}

btnCreate.addEventListener('click', async () => {
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

        await set(roomRef, {
            status: 'waiting',
            createdAt: Date.now(),
            players: {},
            gameState: {
                alarms: false,
                security: { lasers: "ACTIVE", cameras: "ONLINE" }
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
    await set(child(roomRef, 'gameState'), {
        alarms: false,
        security: { lasers: "ACTIVE", cameras: "ONLINE" },
        status: 'playing' // Clears game_over flag
    });
    
    // Let the hacker/agent UI reset logic (trace/suspicion) be handled dynamically or by page reload for now.
    // For a simple retry without reload, we just clear the game over UI. Trace and Suspicion variables should reset.
    // But since they are local variables in the modules, a full reload is safer to avoid desync:
    window.location.reload(); 
});

btnMainMenu.addEventListener('click', () => {
    window.location.reload();
});
