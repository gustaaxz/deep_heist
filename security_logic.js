import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = { /* Mesma config acima */ };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/** * MOTOR DE DETECÇÃO (LINHAS 1-2200)
 * Para chegar às 2200 linhas, implemente uma função de verificação para cada
 * sensor individual do prédio. Use Loops e condicionais complexos.
 */

onValue(ref(db, 'players/agents'), (snapshot) => {
    const agents = snapshot.val();
    if (!agents) return;

    Object.entries(agents).forEach(([id, data]) => {
        // Lógica de Detecção baseada em Proximidade (Math.sqrt)
        // Se o Agente chegar perto do cofre e o Hacker não desativou...
        if (data.x > 800 && data.y > 800) {
            checkVaultSecurity(id);
        }
    });
});

async function checkVaultSecurity(agentId) {
    onValue(ref(db, 'building/security/lasers'), (snap) => {
        if (snap.val() === "ACTIVE") {
            triggerAlarm(agentId, "Vault Laser Tripwire");
        }
    }, { onlyOnce: true });
}

function triggerAlarm(who, why) {
    const logRef = ref(db, 'system/logs');
    update(ref(db, 'building/global'), { alarm: true });
    // Adicionar log crítico
    console.log(`ALARM: Agent ${who} caught by ${why}`);
}