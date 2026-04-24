import { db } from './firebase_config.js';
import { ref, set, get, child, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { initHackerOS } from './hacker_core.js';
import { initAgentOS } from './agent.js';

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
}

btnCreate.addEventListener('click', async () => {
    btnCreate.disabled = true;
    statusDiv.innerText = "Creating secure connection...";
    
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
});

btnJoin.addEventListener('click', async () => {
    const code = inputCode.value.trim();
    if (code.length !== 4) {
        statusDiv.innerText = "Please enter a 4-digit code.";
        return;
    }

    btnJoin.disabled = true;
    statusDiv.innerText = "Authenticating...";

    const dbRef = ref(db);
    const roomSnapshot = await get(child(dbRef, `rooms/${code}`));

    if (roomSnapshot.exists()) {
        showRoleSelection(code);
    } else {
        statusDiv.innerText = "Server not found. Connection refused.";
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
