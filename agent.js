import { db } from './firebase_config.js?v=3';
import { ref, get, update, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const btnAgentTrigger = document.getElementById('btn-agent-trigger');
const btnAgentKeypad = document.getElementById('btn-agent-keypad');
const inputKeypad = document.getElementById('agent-keypad-input');
const suspicionBar = document.getElementById('suspicion-bar');

const btnUsb = document.getElementById('btn-agent-usb');
const wireButtons = document.querySelectorAll('.btn-wire');
const btnHide = document.getElementById('btn-agent-hide');

let currentRoomCode = null;
let suspicionLevel = 0;
let layer3Interval = null;

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
    const statusRef = ref(db, `rooms/${roomCode}/gameState`);
    onValue(statusRef, (snapshot) => {
        const state = snapshot.val();
        if (!state) return;
        
        if (state.status === 'playing') {
            suspicionLevel = 0;
            suspicionBar.style.width = '0%';
            
            // Manage UI progression based on layers
            if (!state.layer1_usb) {
                document.getElementById('agent-layer1').classList.remove('hidden');
                document.getElementById('agent-layer2').classList.add('hidden');
                document.getElementById('agent-layer3').classList.add('hidden');
            } else if (state.layer1_done && !state.layer2_done) {
                document.getElementById('agent-layer1').classList.add('hidden');
                document.getElementById('agent-layer2').classList.remove('hidden');
            } else if (state.layer2_done && state.layer3_active) {
                document.getElementById('agent-layer2').classList.add('hidden');
                document.getElementById('agent-layer3').classList.remove('hidden');
                
                // Start Layer 3 auto-suspicion if not already running
                if (!layer3Interval && !state.heist_success && state.status === 'playing') {
                    layer3Interval = setInterval(() => {
                        increaseSuspicion(10);
                    }, 1500); // Suspicion goes up quickly!
                }
            }
            
            if (state.heist_success || state.status === 'game_over') {
                clearInterval(layer3Interval);
                layer3Interval = null;
            }
        } else {
            clearInterval(layer3Interval);
            layer3Interval = null;
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

// LAYER 1: USB BYPASS
btnUsb.addEventListener('click', async () => {
    if (!currentRoomCode) return;
    await update(ref(db, `rooms/${currentRoomCode}/gameState`), { layer1_usb: true });
    
    const logsRef = ref(db, `rooms/${currentRoomCode}/logs`);
    await set(push(logsRef), {
        type: "INFO",
        msg: `[${new Date().toLocaleTimeString()}] EXTERNAL HARDWARE DETECTED. USB Bypass connected by Field Agent.`
    });
    alert("USB Plugged in. Tell your Hacker to start the Brute Force!");
});

// LAYER 2: WIRES
wireButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        if (!currentRoomCode) return;
        
        const stateRef = ref(db, `rooms/${currentRoomCode}/gameState`);
        const snap = await get(stateRef);
        const state = snap.val();
        
        const color = btn.getAttribute('data-color');
        const logsRef = ref(db, `rooms/${currentRoomCode}/logs`);
        
        if (color === state.layer2_wire) {
            await update(stateRef, { layer2_done: true });
            await set(push(logsRef), {
                type: "INFO",
                msg: `[${new Date().toLocaleTimeString()}] ALARM DISARMED. Correct wire severed.`
            });
            alert("Correct! The alarm is disarmed. Proceed to Vault!");
        } else {
            increaseSuspicion(30);
            await set(push(logsRef), {
                type: "WARNING",
                msg: `[${new Date().toLocaleTimeString()}] TAMPERING DETECTED! Incorrect wire severed on Security Box.`
            });
            alert("WRONG WIRE! Suspicion increased drastically!");
        }
    });
});

// LAYER 3: HIDE
btnHide.addEventListener('click', () => {
    if (suspicionLevel > 0) {
        suspicionLevel -= 15;
        if (suspicionLevel < 0) suspicionLevel = 0;
        suspicionBar.style.width = `${suspicionLevel}%`;
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
        document.getElementById('game-over-reason').innerText = "O Agente foi capturado pelos guardas.";
    }
}
