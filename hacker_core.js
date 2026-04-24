import { db } from './firebase_config.js';
import { ref, onValue, update, set, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let currentRoomCode = null;
let activeMinigame = null;
let traceLevel = 0;

// --- MOTOR DE COMANDOS ---
const CommandLibrary = {
    help: () => "Available: ls, cat, sql, netscan, ping, brute_force, clear, manual",
    
    manual: () => {
        document.getElementById("hacker-manual-ui").classList.remove("hidden");
        return "Opening Hacker Manual...";
    },

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

    brute_force: (args) => {
        if (!args[0]) return "Usage: brute_force [ip_address]\nBypasses basic numeric pin codes.";
        
        const targetPin = Math.floor(100 + Math.random() * 900).toString(); // 3 digit pin
        activeMinigame = {
            type: "brute_force",
            target: targetPin,
            attempts: 5
        };
        return `Initiating brute force on ${args[0]}...\nTarget is a 3-digit PIN. You have 5 attempts.\nEnter your guess:`;
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
    if (e.key === "Tab") {
        e.preventDefault();
        const val = input.value.trim();
        const cmds = Object.keys(CommandLibrary);
        const matches = cmds.filter(c => c.startsWith(val));
        if (matches.length === 1) {
            input.value = matches[0] + " ";
        }
        return;
    }

    if (e.key === "Enter" && !isTyping && !input.disabled) {
        const cmdString = input.value.trim();
        if (!cmdString) return;

        output.innerText += `\nroot@heist:~$ ${cmdString}\n`;
        input.value = "";
        
        // Handle Active Minigame
        if (activeMinigame) {
            if (activeMinigame.type === "brute_force") {
                const guess = cmdString;
                if (guess === activeMinigame.target) {
                    activeMinigame = null;
                    await typeText("[✔] PIN ACCEPTED. ACCESS GRANTED.");
                } else {
                    activeMinigame.attempts--;
                    let hints = "";
                    for(let i=0; i<3; i++) {
                        if(guess[i] === activeMinigame.target[i]) hints += "🟩";
                        else if(activeMinigame.target.includes(guess[i])) hints += "🟨";
                        else hints += "🟥";
                    }
                    if (activeMinigame.attempts > 0) {
                        await typeText(`[✘] INVALID PIN. Hint: ${hints}\nAttempts remaining: ${activeMinigame.attempts}\nEnter your guess:`);
                    } else {
                        activeMinigame = null;
                        await typeText(`[!] BRUTE FORCE FAILED. System locked. The correct PIN was ${activeMinigame.target}.`);
                        increaseTrace(20); // Penalty for failing
                    }
                }
            }
            return;
        }

        const [cmd, ...args] = cmdString.split(" ");
        
        if (CommandLibrary[cmd]) {
            const response = CommandLibrary[cmd](args);
            if (response) {
                if (cmd === 'clear') {
                    // handled instantly
                } else {
                    await typeText(response);
                }
            }
        } else {
            await typeText(`bash: ${cmd}: command not found`);
            increaseTrace(10);
        }
    }
});

function increaseTrace(amount) {
    traceLevel += amount;
    if (traceLevel > 100) traceLevel = 100;
    document.getElementById('trace-bar').style.width = `${traceLevel}%`;
    
    if (traceLevel >= 100) {
        logToSystem("CRITICAL", "TRACE COMPLETE. SECURITY FORCES DISPATCHED TO HACKER LOCATION.");
        typeText("\n[!!!] TRACE 100% - CONNECTION SEVERED [!!!]");
        input.disabled = true;
        update(ref(db, `rooms/${currentRoomCode}/gameState`), { status: 'game_over' });
    }
}

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
export async function initHackerOS(roomCode) {
    currentRoomCode = roomCode;
    
    // Intro Text
    output.innerText = "";
    const introMsg = `[ HEIST OS v4.0 - ROOT ACCESS GRANTED ]
Mission: Disable security systems to allow your field agent to infiltrate.
Type 'help' to see available commands.
Use [TAB] to autocomplete commands.
Waiting for agent connection...\n`;
    await typeText(introMsg);

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

    // Listen for Game Over / Restart
    const statusRef = ref(db, `rooms/${roomCode}/gameState/status`);
    onValue(statusRef, (snapshot) => {
        if (snapshot.val() === 'playing') {
            traceLevel = 0;
            document.getElementById('trace-bar').style.width = '0%';
            input.disabled = false;
            activeMinigame = null;
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

    // Close Manual Event
    document.getElementById("btn-close-manual").addEventListener("click", () => {
        document.getElementById("hacker-manual-ui").classList.add("hidden");
    });
}