import { db } from './firebase_config.js';
import { ref, set, get, child, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { initHackerOS } from './hacker_core.js';

// DOM Elements
const btnCreate = document.getElementById('btn-create-server');
const btnJoin = document.getElementById('btn-join-server');
const inputCode = document.getElementById('input-server-code');
const statusDiv = document.getElementById('lobby-status');
const lobbyUI = document.getElementById('lobby-ui');
const hackerUI = document.getElementById('hacker-ui');
const displayRoomCode = document.getElementById('display-room-code');
const displayPlayers = document.getElementById('display-players');

// Helper to generate 4-digit code
function generateCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

btnCreate.addEventListener('click', async () => {
    btnCreate.disabled = true;
    statusDiv.innerText = "Creating secure connection...";
    
    const roomCode = generateCode();
    const roomRef = ref(db, `rooms/${roomCode}`);
    
    // Check if exists (rare, but possible)
    const snapshot = await get(roomRef);
    if (snapshot.exists()) {
        statusDiv.innerText = "Error: Code collision. Try again.";
        btnCreate.disabled = false;
        return;
    }

    // Create room structure
    await set(roomRef, {
        status: 'waiting',
        createdAt: Date.now(),
        players: {
            hacker: { id: "host", status: "online" }
        },
        gameState: {
            alarms: false,
            security: { lasers: "ACTIVE", cameras: "ONLINE" }
        },
        logs: {
            0: { msg: "System Initialized. Awaiting agents...", type: "INFO" }
        }
    });

    joinRoomUI(roomCode, "HACKER");
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
        const roomData = roomSnapshot.val();
        
        // For now, if we join from this UI, let's assume we want to be the hacker 
        // OR we can make it so joining from here assigns you as Hacker if available, else spectator.
        // Let's just join as Hacker for now to test the UI.
        
        joinRoomUI(code, "HACKER");
    } else {
        statusDiv.innerText = "Server not found. Connection refused.";
        btnJoin.disabled = false;
    }
});

function joinRoomUI(roomCode, role) {
    // Transition UI
    lobbyUI.classList.add('hidden');
    hackerUI.classList.remove('hidden');
    displayRoomCode.innerText = roomCode;

    // Listen to player count (basic example)
    const playersRef = ref(db, `rooms/${roomCode}/players`);
    onValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        if (players) {
            const count = Object.keys(players).length;
            displayPlayers.innerText = `${count}/3`;
        }
    });

    // Initialize Hacker Core
    initHackerOS(roomCode);
}
