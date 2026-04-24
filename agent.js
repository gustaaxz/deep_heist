import { db } from './firebase_config.js';
import { ref, get, update, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const btnAgentTrigger = document.getElementById('btn-agent-trigger');
const btnAgentKeypad = document.getElementById('btn-agent-keypad');
const inputKeypad = document.getElementById('agent-keypad-input');
const suspicionBar = document.getElementById('suspicion-bar');

let currentRoomCode = null;
let suspicionLevel = 0;

export async function initAgentOS(roomCode) {
    currentRoomCode = roomCode;
    
    // Register agent
    const agentId = "agent_" + Math.floor(Math.random() * 1000);
    await update(ref(db, `rooms/${roomCode}/players/${agentId}`), {
        role: "Agent",
        status: "online"
    });

    // Add a log for the hacker
    const logsRef = ref(db, `rooms/${roomCode}/logs`);
    onValue(logsRef, (snapshot) => {
        // Logs can be handled or displayed in the future for the agent
    });

    // Listen for Game Over / Restart
    const statusRef = ref(db, `rooms/${roomCode}/gameState/status`);
    onValue(statusRef, (snapshot) => {
        if (snapshot.val() === 'playing') {
            suspicionLevel = 0;
            suspicionBar.style.width = '0%';
        }
    });

    const newLogRef = push(logsRef);
    await set(newLogRef, {
        type: "INFO",
        msg: `[${new Date().toLocaleTimeString()}] INTRUSION DETECTED: Unknown entity entered the premises.`
    });
}

btnAgentTrigger.addEventListener('click', async () => {
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

btnAgentKeypad.addEventListener('click', async () => {
    if (!currentRoomCode) return;
    const pin = inputKeypad.value.trim();
    const logsRef = ref(db, `rooms/${currentRoomCode}/logs`);
    const newLogRef = push(logsRef);

    if (pin === "734") { // Hardcoded correct pin for now, can be dynamic later
        await set(newLogRef, {
            type: "INFO",
            msg: `[${new Date().toLocaleTimeString()}] DOOR UNLOCKED. Agent used correct PIN at Sector 4.`
        });
        alert("ACCESS GRANTED. Door Unlocked.");
        inputKeypad.value = "";
    } else {
        increaseSuspicion(25);
        await set(newLogRef, {
            type: "WARNING",
            msg: `[${new Date().toLocaleTimeString()}] INVALID PIN ATTEMPT at Sector 4.`
        });
        alert("ACCESS DENIED. Incorrect PIN.");
    }
});

function increaseSuspicion(amount) {
    suspicionLevel += amount;
    if (suspicionLevel > 100) suspicionLevel = 100;
    suspicionBar.style.width = `${suspicionLevel}%`;
    
    if (suspicionLevel >= 100) {
        const logsRef = ref(db, `rooms/${currentRoomCode}/logs`);
        const newLogRef = push(logsRef);
        set(newLogRef, {
            type: "CRITICAL",
            msg: `[${new Date().toLocaleTimeString()}] SUSPICIOUS ACTIVITY LIMIT REACHED. GUARDS ALERTED.`
        });
        update(ref(db, `rooms/${currentRoomCode}/gameState`), { status: 'game_over' });
    }
}
