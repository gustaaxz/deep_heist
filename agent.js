import { db } from './firebase_config.js';
import { ref, get, update, push, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const btnAgentTrigger = document.getElementById('btn-agent-trigger');
let currentRoomCode = null;

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
