import { db } from './firebase_config.js';
import { ref, onValue, update, set, push, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
let timerInterval = null;

let currentRoomCode = null;
let activeMinigame = null;
let traceLevel = 0;

// --- MOTOR DE COMANDOS ---
const CommandLibrary = {
    help: () => "Available: ls, cat, sql, netscan, ping, brute_force, scan_db, decrypt_payload, clear, manual",
    
    manual: () => {
        document.getElementById("hacker-manual-ui").classList.remove("hidden");
        return "Opening Hacker Manual...";
    },

    scan_db: async () => {
        const snap = await get(ref(db, `rooms/${currentRoomCode}/gameState`));
        const state = snap.val();
        if (!state.layer1_usb) return "ERROR: Firewall active. Waiting for Agent to plug USB bypass.";
        
        return "BRUTE_FORCE_INIT";
    },

    align_nodes: async () => {
        const snap = await get(ref(db, `rooms/${currentRoomCode}/gameState`));
        const state = snap.val();
        
        if (!state.layer2_done) return "ERROR: Vault door is closed. Disarm physical alarms first (Layer 2 & 3).";
        if (state.layer4_active) return "Network Alignment Protocol already active.";
        
        await update(ref(db, `rooms/${currentRoomCode}/gameState`), { layer4_active: true });
        
        // Show puzzle UI
        document.getElementById('hacker-grid-ui').classList.remove('hidden');
        logToSystem("INFO", "NETWORK ALIGNMENT PROTOCOL INITIATED.");
        initGridPuzzle();
        return "Opening Data Flow Grid... Awaiting Agent Defense Protocol.";
    },

    sql: async (args) => {
        const snap = await get(ref(db, `rooms/${currentRoomCode}/gameState`));
        const state = snap.val();
        
        const query = args.join(" ").toUpperCase();
        if (query.includes(`UPDATE ${state.layer2_table} SET LASERS='OFF'`)) {
            await update(ref(db, `rooms/${currentRoomCode}/gameState/security`), { lasers: "DISABLED" });
            logToSystem("INFO", "SQL Injection Successful. Vault Lasers DISABLED.");
            return "Query executed successfully. 1 row affected.";
        }
        increaseTrace(15);
        return "ERROR: Invalid syntax or table not found. TRACE INCREASED.";
    },
    
    decrypt_payload: async () => {
        const snap = await get(ref(db, `rooms/${currentRoomCode}/gameState`));
        const state = snap.val();
        
        if (!state.layer2_done) return "ERROR: Vault door is closed. Disarm alarms first (Layer 2).";
        if (state.security.lasers !== "DISABLED") return "ERROR: Vault lasers are active. Cannot access physical payload terminal.";
        
        await update(ref(db, `rooms/${currentRoomCode}/gameState`), { layer3_active: true });
        
        input.disabled = true;
        await typeText("\n[!] INITIATING PAYLOAD EXTRACTION...\n[!] WARNING: MASSIVE DATA TRANSFER DETECTED BY SECURITY.\n");
        logToSystem("CRITICAL", "PAYLOAD DOWNLOADING. GUARDS DISPATCHED.");
        
        // 30 second fake loading bar
        let progress = 0;
        return new Promise(resolve => {
            const downloadInterval = setInterval(async () => {
                progress += 10;
                let bar = "█".repeat(progress/10) + "-".repeat(10 - progress/10);
                output.innerText += `\r[${bar}] ${progress}%`;
                
                if (progress >= 100) {
                    clearInterval(downloadInterval);
                    update(ref(db, `rooms/${currentRoomCode}/gameState`), { heist_success: true });
                    resolve("\n[+] PAYLOAD EXTRACTED SECURELY. HEIST COMPLETE.");
                }
            }, 3000);
        });
    },

    ls: () => "bin/   etc/   home/   var/   manuals/",
    
    cat: async (args) => {
        if (args[0] === "secret.txt") return "Nice try, but you won't find passwords here.";
        if (args[0] === "/manuals/door.txt") {
            const snap = await get(ref(db, `rooms/${currentRoomCode}/gameState`));
            const state = snap.val();
            return `SECURITY DOOR MANUAL:\nTo disarm the physical alarm, the Field Agent must cut the [${state.layer2_wire}] wire.\nWARNING: Incorrect wire will trigger lockdown.`;
        }
        return "cat: " + (args[0] || "") + ": No such file or directory";
    },

    netscan: () => "Scanning network...\n192.168.1.1 (Router)\n192.168.1.10 (Local PC)\n10.0.0.5 (Security Node)",
    
    ping: (args) => {
        if (!args[0]) return "Usage: ping [ip_address]";
        return `Pinging ${args[0]} with 32 bytes of data:\nReply from ${args[0]}: bytes=32 time=4ms TTL=64\nReply from ${args[0]}: bytes=32 time=5ms TTL=64`;
    },

    brute_force: async (args) => {
        const snap = await get(ref(db, `rooms/${currentRoomCode}/gameState`));
        const state = snap.val();
        
        if (!state.layer1_usb) {
            return "ERROR: No physical connection. Field Agent must plug the USB bypass into the terminal first.";
        }
        if (state.layer1_done) {
            return "Firewall already breached.";
        }

        if (activeMinigame) return "A session is already active.";
        if (!args[0]) {
            return "Usage: brute_force [ip_address]";
        }
        if (args[0] !== "10.0.0.5") {
            increaseTrace(10);
            return "Target not vulnerable or offline.";
        }
        
        // 4 digit PIN
        const pin = Math.floor(1000 + Math.random() * 9000).toString(); 
        activeMinigame = {
            type: "brute_force",
            target: pin,
            attempts: 7
        };
        return `Initializing Brute Force Attack on 10.0.0.5...\n[!] Firewall engaged. Target is a 4-digit PIN.\nYou have ${activeMinigame.attempts} attempts.\nEnter your guess:`;
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
                if (guess.length !== 4 || isNaN(guess)) {
                    await typeText("Invalid input. Must be a 4-digit number.");
                } else {
                    activeMinigame.attempts--;
                    let hints = "";
                    for (let i = 0; i < 4; i++) {
                        if (guess[i] === activeMinigame.target[i]) hints += "🟩";
                        else if (activeMinigame.target.includes(guess[i])) hints += "🟨";
                        else hints += "🟥";
                    }

                    if (guess === activeMinigame.target) {
                        activeMinigame = null;
                        await update(ref(db, `rooms/${currentRoomCode}/gameState`), { layer1_done: true });
                        logToSystem("WARNING", "Firewall breached from unknown IP.");
                        await typeText("[✔] ACCESS GRANTED. External Firewall Breached.");
                    } else {
                        if (activeMinigame.attempts > 0) {
                            await typeText(`[✘] INVALID PIN. Hint: ${hints}\nAttempts remaining: ${activeMinigame.attempts}\nEnter your guess:`);
                        } else {
                            activeMinigame = null;
                            await typeText(`[!] BRUTE FORCE FAILED. System locked. The correct PIN was ${activeMinigame.target}.`);
                            increaseTrace(20); // Penalty for failing
                        }
                    }
                }
            }
            return;
        }

        const [cmd, ...args] = cmdString.split(" ");
        
        if (CommandLibrary[cmd]) {
            const response = await CommandLibrary[cmd](args);
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

    // Listen for Game Over / Restart / Timer
    const statusRef = ref(db, `rooms/${roomCode}/gameState`);
    onValue(statusRef, (snapshot) => {
        const state = snapshot.val();
        if (!state) return;

        if (state.status === 'playing') {
            // Only reset if trace is full (prevents resetting on every state update)
            if (traceLevel >= 100) {
                traceLevel = 0;
                document.getElementById('trace-bar').style.width = '0%';
                input.disabled = false;
                activeMinigame = null;
            }
            
            // Timer Logic
            if (!timerInterval) {
                timerInterval = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
                    const remaining = (15 * 60) - elapsed;
                    
                    if (remaining <= 0) {
                        clearInterval(timerInterval);
                        document.getElementById('hacker-timer').innerText = "00:00";
                        update(ref(db, `rooms/${currentRoomCode}/gameState`), { status: 'game_over' });
                        document.getElementById('game-over-reason').innerText = "O tempo limite de extração acabou.";
                    } else {
                        const m = Math.floor(remaining / 60).toString().padStart(2, '0');
                        const s = (remaining % 60).toString().padStart(2, '0');
                        document.getElementById('hacker-timer').innerText = `${m}:${s}`;
                        if (remaining <= 60) {
                            document.getElementById('hacker-timer').style.color = 'var(--alert-red)';
                        } else {
                            document.getElementById('hacker-timer').style.color = '#f1c40f';
                        }
                    }
                }, 1000);
            }
            
            if (state.heist_success) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            
            // Grid Puzzle Interdependency
            if (state.layer4_active) {
                const gridStatus = document.getElementById('grid-status');
                const puzzleGrid = document.getElementById('puzzle-grid');
                if (state.agent_defending) {
                    gridEnabled = true;
                    gridStatus.innerText = "AGENT DEFENDING. GRID UNLOCKED.";
                    gridStatus.style.color = "#2ecc71";
                    puzzleGrid.style.opacity = "1";
                    puzzleGrid.style.pointerEvents = "auto";
                } else {
                    gridEnabled = false;
                    gridStatus.innerText = "WARNING: AGENT NOT DEFENDING! GRID LOCKED.";
                    gridStatus.style.color = "var(--alert-red)";
                    puzzleGrid.style.opacity = "0.5";
                    puzzleGrid.style.pointerEvents = "none";
                }
            }
        } else {
            clearInterval(timerInterval);
            timerInterval = null;
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

    // Make Manual Draggable
    dragElement(document.getElementById("hacker-manual-ui"));
}

function dragElement(elmnt) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = document.getElementById("manual-header");
    
    if (header) {
        header.onmousedown = dragMouseDown;
    } else {
        elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        // Don't drag if clicking the close button
        if (e.target.id === "btn-close-manual") return;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// --- GRID PUZZLE LOGIC ---
let gridCells = [];
let gridEnabled = false;

function initGridPuzzle() {
    const gridContainer = document.getElementById('puzzle-grid');
    gridContainer.innerHTML = '';
    gridCells = [];
    
    // Create 3x3 grid of pipes
    // 0 = straight, 1 = corner
    const layout = [
        {type: 1, rot: Math.floor(Math.random()*4)}, {type: 0, rot: Math.floor(Math.random()*2)}, {type: 1, rot: Math.floor(Math.random()*4)},
        {type: 0, rot: Math.floor(Math.random()*2)}, {type: 1, rot: Math.floor(Math.random()*4)}, {type: 0, rot: Math.floor(Math.random()*2)},
        {type: 1, rot: Math.floor(Math.random()*4)}, {type: 0, rot: Math.floor(Math.random()*2)}, {type: 1, rot: Math.floor(Math.random()*4)}
    ];
    
    layout.forEach((cellData, i) => {
        const cell = document.createElement('div');
        cell.style.width = '100%';
        cell.style.height = '100%';
        cell.style.backgroundColor = '#111';
        cell.style.border = '1px solid #333';
        cell.style.display = 'flex';
        cell.style.justifyContent = 'center';
        cell.style.alignItems = 'center';
        cell.style.cursor = 'pointer';
        cell.style.transition = 'transform 0.2s';
        
        // Draw pipe visually using SVG or simple CSS
        cell.innerHTML = cellData.type === 0 ? 
            `<div style="width: 100%; height: 20px; background: var(--neon-green);"></div>` : 
            `<div style="width: 50%; height: 20px; background: var(--neon-green); position:absolute; left:0;"></div>
             <div style="width: 20px; height: 50%; background: var(--neon-green); position:absolute; bottom:0;"></div>`;
             
        cell.style.transform = `rotate(${cellData.rot * 90}deg)`;
        
        cell.addEventListener('click', () => {
            if (!gridEnabled) return;
            cellData.rot = (cellData.rot + 1) % 4;
            cell.style.transform = `rotate(${cellData.rot * 90}deg)`;
            checkGridWin();
        });
        
        gridContainer.appendChild(cell);
        gridCells.push(cellData);
    });
}

async function checkGridWin() {
    const isWin = gridCells.every(c => c.rot === 0 || c.rot === 2);
    
    if (isWin) {
        gridEnabled = false;
        document.getElementById('grid-status').innerText = "DATA FLOW ESTABLISHED. EXTRACTION COMPLETE.";
        document.getElementById('grid-status').style.color = "#2ecc71";
        
        await update(ref(db, `rooms/${currentRoomCode}/gameState`), { heist_success: true });
        
        setTimeout(() => {
            document.getElementById('hacker-grid-ui').classList.add('hidden');
        }, 3000);
    }
}