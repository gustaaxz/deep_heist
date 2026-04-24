import { db } from './firebase_config.js';
import { ref, get, child, update, push, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const btnJoin = document.getElementById('btn-join');
const btnTrigger = document.getElementById('btn-trigger');
const inputCode = document.getElementById('room-code');
const statusDiv = document.getElementById('status');
const joinSection = document.getElementById('join-section');
const gameSection = document.getElementById('game-section');
const displayCode = document.getElementById('display-code');

let currentRoomCode = null;

btnJoin.addEventListener('click', async () => {
    const code = inputCode.value.trim();
    if (code.length !== 4) {
        statusDiv.innerText = "Please enter a 4-digit code.";
        return;
    }

    statusDiv.innerText = "Connecting...";
    
    const dbRef = ref(db);
    const roomSnapshot = await get(child(dbRef, `rooms/${code}`));

    if (roomSnapshot.exists()) {
        currentRoomCode = code;
        
        // Register agent
        const agentId = "agent_" + Math.floor(Math.random() * 1000);
        await update(ref(db, `rooms/${code}/players/${agentId}`), {
            role: "Agent",
            status: "online"
        });

        // Add a log for the hacker
        const logsRef = ref(db, `rooms/${code}/logs`);
        const newLogRef = push(logsRef);
        await set(newLogRef, {
            type: "INFO",
            msg: `[${new Date().toLocaleTimeString()}] INTRUSION DETECTED: Unknown entity entered the premises.`
        });

        joinSection.style.display = 'none';
        gameSection.style.display = 'block';
        displayCode.innerText = code;
    } else {
        statusDiv.innerText = "Room not found.";
    }
});

btnTrigger.addEventListener('click', async () => {
    if (!currentRoomCode) return;
    
    // Check if security is active before triggering alarm
    const securityRef = ref(db, `rooms/${currentRoomCode}/gameState/security`);
    const snap = await get(securityRef);
    const secData = snap.val();
    
    const logsRef = ref(db, `rooms/${currentRoomCode}/logs`);
    const newLogRef = push(logsRef);

    if (secData && secData.lasers === "DISABLED") {
        await set(newLogRef, {
            type: "INFO",
            msg: `[${new Date().toLocaleTimeString()}] Agent bypassed vault corridor safely (Lasers Offline).`
        });
        alert("You safely passed the lasers because the Hacker disabled them!");
    } else {
        // Trigger Alarm
        await update(ref(db, `rooms/${currentRoomCode}/gameState`), { alarms: true });
        await set(newLogRef, {
            type: "CRITICAL",
            msg: `[${new Date().toLocaleTimeString()}] ALARM TRIGGERED! Vault Lasers Intersected!`
        });
        alert("ALARM TRIGGERED! You hit the lasers.");
    }
});
