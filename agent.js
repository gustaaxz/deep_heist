import { db } from './firebase_config.js';
import { ref, get, update, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let currentRoomCode = null;

// Canvas setup
let canvas, ctx;
let lastTime = 0;
let gameStateRef = null;

// Input
const keys = {};

// Game State
let currentState = null;

// The Player
const player = {
    x: 100, y: 100, size: 10, speed: 150, color: '#3498db',
    suspicion: 0
};

// Map
const mapWidth = 800;
const mapHeight = 600;

const walls = [
    // Outer border
    {x: 0, y: 0, w: 800, h: 20}, {x: 0, y: 580, w: 800, h: 20},
    {x: 0, y: 0, w: 20, h: 600}, {x: 780, y: 0, w: 20, h: 600},
    // Inner walls
    {x: 200, y: 0, w: 20, h: 400},
    {x: 400, y: 200, w: 20, h: 400},
    {x: 600, y: 0, w: 20, h: 400}
];

const interactables = [
    { id: 'usb', x: 100, y: 500, w: 40, h: 40, color: '#8e44ad', label: 'USB (L1)', active: true },
    { id: 'wire', x: 500, y: 50, w: 40, h: 40, color: '#e67e22', label: 'Wire Box (L3)', active: true },
    { id: 'vault', x: 700, y: 500, w: 60, h: 60, color: '#f1c40f', label: 'VAULT (L4)', active: true }
];

let lasers = [
    {x: 220, y: 200, w: 180, h: 10, color: 'rgba(255,0,0,0.5)'},
    {x: 420, y: 400, w: 180, h: 10, color: 'rgba(255,0,0,0.5)'}
];

// Guards
const guards = [
    {x: 300, y: 100, size: 12, speed: 50, color: '#e74c3c', path: [{x:300,y:100}, {x:300,y:500}], currentPathIdx: 0, visionRadius: 100, visionAngle: Math.PI/2, angle: 0},
    {x: 500, y: 500, size: 12, speed: 60, color: '#e74c3c', path: [{x:500,y:500}, {x:500,y:100}], currentPathIdx: 0, visionRadius: 120, visionAngle: Math.PI/2, angle: Math.PI}
];

export async function initAgentOS(roomCode) {
    currentRoomCode = roomCode;
    
    // Register agent
    const agentId = "agent_" + Math.floor(Math.random() * 1000);
    await update(ref(db, `rooms/${roomCode}/players/${agentId}`), { role: "Agent", status: "online" });

    // Setup Canvas
    canvas = document.getElementById('agent-canvas');
    ctx = canvas.getContext('2d');
    
    // Resize to fit container
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Inputs
    window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

    // Start DB Listeners
    setupFirebaseListeners();

    // Start Loop
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    if(!canvas) return;
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
}

function setupFirebaseListeners() {
    gameStateRef = ref(db, `rooms/${currentRoomCode}/gameState`);
    onValue(gameStateRef, (snapshot) => {
        currentState = snapshot.val();
        
        if (!currentState) return;

        // Sync Lasers
        if (currentState.security && currentState.security.lasers === "DISABLED") {
            lasers = []; // Remove lasers
        }
        
        // Sync Interactables state
        if (currentState.layer1_usb) interactables.find(i => i.id === 'usb').active = false;
        if (currentState.layer2_done) interactables.find(i => i.id === 'wire').active = false;
        
        // Update Objective text
        const objUI = document.getElementById('agent-objectives');
        if (!currentState.layer1_usb) {
            objUI.innerHTML = "<li>Find purple terminal and press 'E' to plug USB.</li>";
        } else if (!currentState.layer2_done) {
            objUI.innerHTML = "<li>Wait for Hacker to disable lasers.</li><li>Find Orange Wire Box to cut wire.</li>";
        } else {
            if (!currentState.agent_defending) {
                objUI.innerHTML = "<li>Go to Yellow VAULT and press 'E' to defend.</li>";
            } else {
                objUI.innerHTML = "<li style='color:red'>DEFEND VAULT! DO NOT GET SPOTTED!</li>";
            }
        }
    });
}

function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (dt < 0.1) { // prevent huge jumps on tab switch
        updateLogic(dt);
        draw();
    }
    
    requestAnimationFrame(gameLoop);
}

function updateLogic(dt) {
    if (!currentState) return;

    // Movement
    let dx = 0; let dy = 0;
    if (keys['w']) dy -= 1;
    if (keys['s']) dy += 1;
    if (keys['a']) dx -= 1;
    if (keys['d']) dx += 1;

    // Normalize
    if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx*dx + dy*dy);
        dx /= length; dy /= length;
    }

    const nextX = player.x + dx * player.speed * dt;
    const nextY = player.y + dy * player.speed * dt;

    // AABB Collision with walls
    if (!checkCollision(nextX, player.y, player.size, walls) && !checkCollision(nextX, player.y, player.size, lasers)) {
        player.x = nextX;
    }
    if (!checkCollision(player.x, nextY, player.size, walls) && !checkCollision(player.x, nextY, player.size, lasers)) {
        player.y = nextY;
    }

    // Interaction
    if (keys['e']) {
        interact();
        keys['e'] = false; // Prevent spam
    }

    // Guards Logic
    let spotted = false;
    guards.forEach(g => {
        // Move along path
        const target = g.path[g.currentPathIdx];
        const distX = target.x - g.x;
        const distY = target.y - g.y;
        const dist = Math.sqrt(distX*distX + distY*distY);
        
        if (dist < 5) {
            g.currentPathIdx = (g.currentPathIdx + 1) % g.path.length;
        } else {
            g.x += (distX / dist) * g.speed * dt;
            g.y += (distY / dist) * g.speed * dt;
            g.angle = Math.atan2(distY, distX);
        }

        // Vision cone check
        const toPlayerX = player.x - g.x;
        const toPlayerY = player.y - g.y;
        const distToPlayer = Math.sqrt(toPlayerX*toPlayerX + toPlayerY*toPlayerY);
        
        if (distToPlayer < g.visionRadius) {
            const angleToPlayer = Math.atan2(toPlayerY, toPlayerX);
            let angleDiff = angleToPlayer - g.angle;
            
            // Normalize angle diff between -PI and PI
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            if (Math.abs(angleDiff) < g.visionAngle / 2) {
                // Raycast to check walls
                if (!raycast(g.x, g.y, player.x, player.y, walls)) {
                    spotted = true;
                }
            }
        }
    });

    if (spotted) {
        player.suspicion += 50 * dt; // Fill up fast
        if (currentState.agent_defending) {
            // Cancel defense if spotted!
            update(gameStateRef, { agent_defending: false });
            pushLog("WARNING", "Agent was spotted during defense! Defense Protocol aborted.");
            document.getElementById('agent-status-msg').innerText = "SPOTTED! DEFENSE FAILED!";
            document.getElementById('agent-status-msg').style.color = "red";
        }
    } else {
        player.suspicion -= 10 * dt;
    }
    
    player.suspicion = Math.max(0, Math.min(100, player.suspicion));
    
    // If suspicion hits 100, push trace penalty to hacker
    if (player.suspicion >= 100) {
        pushLog("WARNING", "AGENT DETECTED! TRACE PENALTY APPLIED.");
        // This would require a direct cloud function or letting the hacker listen,
        // for now we just reset the agent position as penalty.
        player.x = 100;
        player.y = 100;
        player.suspicion = 0;
    }
}

function interact() {
    interactables.forEach(async (obj) => {
        if (!obj.active) return;
        
        // AABB check for interaction
        if (player.x > obj.x && player.x < obj.x + obj.w &&
            player.y > obj.y && player.y < obj.y + obj.h) {
            
            if (obj.id === 'usb') {
                await update(gameStateRef, { layer1_usb: true });
                pushLog("INFO", "Agent successfully plugged the USB bypass.");
            }
            else if (obj.id === 'wire') {
                await update(gameStateRef, { layer2_done: true });
                pushLog("INFO", "Agent severed physical wire.");
            }
            else if (obj.id === 'vault') {
                await update(gameStateRef, { agent_defending: true });
                pushLog("INFO", "Agent holding position at the Vault. Network aligned.");
                document.getElementById('agent-status-msg').innerText = "DEFENDING VAULT!";
                document.getElementById('agent-status-msg').style.color = "#2ecc71";
            }
        }
    });
}

// Simple Raycast for vision blocking
function raycast(x1, y1, x2, y2, rects) {
    // Basic sampling along the line
    const steps = 20;
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;
    
    for(let i=1; i<steps; i++) {
        const cx = x1 + dx * i;
        const cy = y1 + dy * i;
        if (checkPointInRects(cx, cy, rects)) return true; // Hit a wall
    }
    return false;
}

function checkPointInRects(x, y, rects) {
    for (const r of rects) {
        if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return true;
    }
    return false;
}

function checkCollision(px, py, size, rects) {
    for (const r of rects) {
        // Simple circle-rect collision
        const testX = Math.max(r.x, Math.min(px, r.x + r.w));
        const testY = Math.max(r.y, Math.min(py, r.y + r.h));
        
        const distZ = px - testX;
        const distY = py - testY;
        const distance = Math.sqrt((distZ*distZ) + (distY*distY));
        
        if (distance <= size) return true;
    }
    return false;
}

function draw() {
    // Clear
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply scaling/centering logic for 800x600 logical map
    ctx.save();
    const scale = Math.min(canvas.width / mapWidth, canvas.height / mapHeight);
    ctx.translate((canvas.width - mapWidth * scale) / 2, (canvas.height - mapHeight * scale) / 2);
    ctx.scale(scale, scale);

    // Draw Floor Grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for(let i=0; i<mapWidth; i+=40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, mapHeight); ctx.stroke();
    }
    for(let i=0; i<mapHeight; i+=40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(mapWidth, i); ctx.stroke();
    }

    // Draw Walls
    ctx.fillStyle = '#444';
    walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));

    // Draw Lasers
    lasers.forEach(l => {
        ctx.fillStyle = l.color;
        ctx.fillRect(l.x, l.y, l.w, l.h);
    });

    // Draw Interactables
    interactables.forEach(obj => {
        if (!obj.active) {
            ctx.fillStyle = '#333';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
        } else {
            ctx.fillStyle = obj.color;
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.fillText(obj.label, obj.x, obj.y - 5);
        }
    });

    // Draw Guards
    guards.forEach(g => {
        // Vision Cone
        ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.arc(g.x, g.y, g.visionRadius, g.angle - g.visionAngle/2, g.angle + g.visionAngle/2);
        ctx.closePath();
        ctx.fill();

        // Body
        ctx.fillStyle = g.color;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Player
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Player Suspicion Aura
    if (player.suspicion > 0) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size + (player.suspicion/10), 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

async function pushLog(type, msg) {
    if (!currentRoomCode) return;
    const logsRef = ref(db, `rooms/${currentRoomCode}/logs`);
    await set(push(logsRef), {
        type: type,
        msg: `[${new Date().toLocaleTimeString()}] ${msg}`
    });
}
