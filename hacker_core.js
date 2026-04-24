import { db } from './firebase_config.js';
import { ref, onValue, update, set, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let currentRoomCode = null;

// --- MOTOR DE COMANDOS ---
const CommandLibrary = {
    help: () => "Available: ls, cat, sql, netscan, ping, clear",
    
    sql: (args) => {
        const query = args.join(" ").toUpperCase();
        if (query.includes("UPDATE SECURITY SET STATUS='OFF'")) {
            if (currentRoomCode) {
                update(ref(db, `rooms/${currentRoomCode}/gameState/security`), { lasers: "DISABLED", overrideBy: "HACKER_ROOT" });
                logToSystem("WARNING", "SQL Injection detected on security sub-system. Lasers offline.");
            }
            return "[✔] SQL Injection Success: Lasers deactivated.";
        }
        return "[✘] SQL Error: Unauthorized table access or malformed query.";
    },

    ls: () => "drwxr-xr-x  root  system  conf/\n-rw-r--r--  root  user    passwords.db",
    
    netscan: () => {
        let nodes = "";
        for(let i=0; i<8; i++) {
            const status = Math.random() > 0.2 ? "[ONLINE]" : "[OFFLINE]";
            nodes += `Node 192.168.1.${100 + i} ${status} - Latency: ${Math.floor(Math.random() * 50)}ms\n`;
        }
        return nodes;
    },

    ping: (args) => {
        if (!args[0]) return "Usage: ping [ip_address]";
        return `Pinging ${args[0]} with 32 bytes of data:\nReply from ${args[0]}: bytes=32 time=14ms TTL=54\nReply from ${args[0]}: bytes=32 time=15ms TTL=54`;
    },

    clear: () => {
        const output = document.getElementById("output");
        output.innerText = "Terminal cleared.\n";
        return "";
    }
};

// --- INTERFACE ---
const output = document.getElementById("output");
const input = document.getElementById("cmd-input");
let isTyping = false;

// Typewriter effect
async function typeText(text) {
    isTyping = true;
    input.disabled = true;
    
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        output.innerText += lines[i] + (i < lines.length - 1 ? '\n' : '');
        output.scrollTop = output.scrollHeight;
        // Small delay per line, longer for longer text
        await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
    }
    
    output.innerText += '\n';
    output.scrollTop = output.scrollHeight;
    input.disabled = false;
    isTyping = false;
    input.focus();
}

input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && !isTyping) {
        const cmdString = input.value.trim();
        if (!cmdString) return;

        output.innerText += `\nroot@heist:~$ ${cmdString}\n`;
        input.value = "";
        
        const [cmd, ...args] = cmdString.split(" ");
        
        if (CommandLibrary[cmd]) {
            const response = CommandLibrary[cmd](args);
            if (response) {
                if (cmd === 'clear') {
                    // special case
                } else {
                    await typeText(response);
                }
            }
        } else {
            await typeText(`bash: ${cmd}: command not found`);
        }
    }
});

function logToSystem(type, msg) {
    if (!currentRoomCode) return;
    const logsRef = ref(db, `rooms/${currentRoomCode}/logs`);
    const newLogRef = push(logsRef);
    set(newLogRef, {
        type: type, // INFO, WARNING, CRITICAL
        msg: `[${new Date().toLocaleTimeString()}] ${msg}`
    });
}

// --- INITIALIZATION ---
export function initHackerOS(roomCode) {
    currentRoomCode = roomCode;
    
    // Sync Logs
    const logsRef = ref(db, `rooms/${roomCode}/logs`);
    onValue(logsRef, (snapshot) => {
        const logs = snapshot.val();
        const logDiv = document.getElementById("security-logs");
        logDiv.innerHTML = "";
        if (logs) {
            // Sort by key (which are timestamp-based push IDs) and reverse to show newest first
            const sortedLogs = Object.values(logs).reverse();
            sortedLogs.forEach(log => {
                logDiv.innerHTML += `<div class="log-entry ${log.type}">${log.msg}</div>`;
            });
        }
    });

    // Sync Node Data (simulate changing system status)
    setInterval(() => {
        document.getElementById('cpu-usage').innerText = `${Math.floor(Math.random() * 40 + 10)}%`;
        document.getElementById('ram-usage').innerText = `${Math.floor(Math.random() * 1000 + 1000)}MB`;
        
        // Randomly add a log to simulate activity if it's too quiet
        if (Math.random() < 0.05) {
            logToSystem("INFO", "Routine network scan completed. No anomalies.");
        }
    }, 5000);
}