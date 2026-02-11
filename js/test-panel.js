/**
 * Test Panel - Script de Control
 * Comunica con el widget via postMessage o acceso directo al iframe
 */

// Referencia al iframe del widget
const widgetFrame = document.getElementById('widget-frame');
const previewContainer = document.getElementById('preview-container');

// --- OVERRIDE CONSOLE.LOG TO DISPLAY IN PANEL ---
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function appendLog(type, args) {
    const logBox = document.getElementById('panel-logs');
    if (!logBox) return;

    const line = document.createElement('div');
    line.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    line.style.padding = '2px 0';
    
    // Convert args to string
    const text = args.map(arg => {
        if (typeof arg === 'object') return JSON.stringify(arg);
        return String(arg);
    }).join(' ');

    let color = '#aaa';
    if (type === 'warn') color = '#ffd700'; // Gold
    if (type === 'error') color = '#ff003c'; // Red
    
    line.style.color = color;
    line.textContent = `> ${text}`;
    
    logBox.appendChild(line);
    
    // Keep max 50 lines
    if (logBox.children.length > 50) {
        logBox.removeChild(logBox.firstChild);
    }
    
    // Auto-scroll to bottom
    logBox.scrollTop = logBox.scrollHeight;
}

console.log = function(...args) {
    originalLog.apply(console, args);
    appendLog('log', args);
};

console.warn = function(...args) {
    originalWarn.apply(console, args);
    appendLog('warn', args);
};

console.error = function(...args) {
    originalError.apply(console, args);
    appendLog('error', args);
};

// AUTO-SCALE FUNCTION
function fitPreview() {
    if (!widgetFrame || !previewContainer) return;
    const containerWidth = previewContainer.getBoundingClientRect().width;
    const scale = containerWidth / 2560;
    widgetFrame.style.transform = `scale(${scale})`;
    console.log(`🖥️ Preview rescaled to 2K: ${Math.round(containerWidth)}px width (Scale: ${scale.toFixed(3)})`);
}

window.addEventListener('load', fitPreview);
window.addEventListener('resize', fitPreview);

widgetFrame.addEventListener('load', () => {
    console.log('✅ Widget iframe loaded');
    fitPreview();
    setupBroadcasterButton();
});

function getWidgetWindow() {
    return widgetFrame.contentWindow;
}

// Simple escape for test panel
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}

function setupBroadcasterButton(retries = 0) {
    const win = getWidgetWindow();
    
    // Check if widget and config are ready
    if (!win || !win.WidgetDebug || !win.WidgetDebug.app || !win.WidgetDebug.app.config) {
        if (retries < 20) setTimeout(() => setupBroadcasterButton(retries + 1), 500);
        return;
    }

    const broadcaster = win.WidgetDebug.app.config.BROADCASTER_USERNAME;
    if (broadcaster) {
        const btn = document.getElementById('broadcaster-btn');
        if (btn) {
            btn.innerHTML = `👑 ${broadcaster.toUpperCase()}`;
            btn.onclick = () => testUser(broadcaster);
            console.log(`✅ Test button updated for broadcaster: ${broadcaster}`);
        }
    }
}

// --- REAL TIME TWITCH API CHECKER ---

async function checkSubStatus(channel, username) {
    try {
        // Normalizar entrada
        const cleanChannel = channel.replace('#', '').trim();
        const cleanUser = username.trim();

        // Usamos IVR API (alternativa robusta a DecAPI) que devuelve JSON
        // Endpoint: https://api.ivr.fi/v2/twitch/subage/{user}/{channel}
        const url = `https://api.ivr.fi/v2/twitch/subage/${cleanUser}/${cleanChannel}`;
        console.log(`📡 GET ${url}`);
        
        const response = await fetch(url);
        
        if (response.status === 404) {
            // Usuario o canal no existen
            return 0;
        }

        if (!response.ok) {
            console.warn(`⚠️ API Error ${response.status}:`, response.statusText);
            return 0;
        }

        const data = await response.json();
        console.log(`📥 API Response for ${cleanUser}:`, data);

        // IVR API devuelve un objeto JSON claro
        // { subscribed: boolean, cumulative: { months: number } }
        
        if (data.subscribed === true) {
            const months = data.cumulative ? data.cumulative.months : 0;
            // Si está suscrito pero retorna 0 meses (recién sub), devolvemos al menos 1
            return months > 0 ? months : 1;
        }

        return 0;

    } catch (e) {
        console.warn('⚠️ Error consultando API de subs (IVR):', e);
        return 0; 
    }
}

// Simular mensaje con DATOS REALES
async function testUser(username) {
    const message = document.getElementById('test-message').value || 'Mensaje de prueba';
    const win = getWidgetWindow();

    if (!win || !win.WidgetDebug || !win.WidgetDebug.chat) {
        console.log('Esperando a que cargue el widget...');
        return;
    }

    // Intentar obtener el canal configurado en el widget
    let channel = 'liiukiin'; // Fallback
    if (win.WidgetDebug.app && win.WidgetDebug.app.config) {
        channel = win.WidgetDebug.app.config.TWITCH_CHANNEL;
    }

    console.log(`🔍 Consultando estado real de ${username} en el canal ${channel}...`);
    
    // Feedback visual temporal en el botón (opcional, pero buena UX)
    // Como no tenemos referencia al botón presionado fácil, usamos log
    
    const extraTags = {};

    // Leer overrides manuales
    const forceMod = document.getElementById('mod-toggle').checked;
    const forceVip = document.getElementById('vip-toggle').checked;
    const forceSub = document.getElementById('sub-toggle').checked;

    if (forceMod) extraTags.mod = true;
    if (forceVip) extraTags.vip = true;

    if (forceSub) {
        console.log(`🧪 Forzando estado SUSCRIPTOR para ${username}`);
        extraTags.subscriber = true;
        extraTags['badge-info'] = { subscriber: "1" };
    } else {
        const realMonths = await checkSubStatus(channel, username);
        if (realMonths > 0) {
            console.log(`✅ ¡CONFIRMADO! ${username} es suscriptor (${realMonths} meses)`);
            extraTags.subscriber = true;
            extraTags['badge-info'] = { subscriber: realMonths.toString() };
        } else {
            console.log(`👤 ${username} no parece estar suscrito (o API error)`);
        }
    }

    win.WidgetDebug.chat.simulateMessage(username, message, extraTags);
}

// Test streak
function testStreak(days) {
    const win = getWidgetWindow();

    if (!win || !win.WidgetDebug || !win.WidgetDebug.xp) {
        console.error("Widget XP System not ready");
        return;
    }

    if (win.WidgetDebug.xp.setStreak) {
        win.WidgetDebug.xp.setStreak('StreakTester', parseInt(days));
        win.WidgetDebug.chat.simulateMessage('StreakTester', `Testing streak: ${days} days!`);
    } else {
        console.log("setStreak not available in widget");
    }
}

// Llamar función expuesta en el widget (Soporta dot notation)
function callWidgetFunction(path) {
    const win = getWidgetWindow();
    if (!win || !win.WidgetDebug) {
        console.warn('Widget window not found or WidgetDebug not ready');
        return;
    }

    // Resolver el path (ej: "xp.exportData")
    const parts = path.split('.');
    let current = win.WidgetDebug;
    let func = null;

    for (let i = 0; i < parts.length; i++) {
        if (current[parts[i]]) {
            if (i === parts.length - 1) {
                func = current[parts[i]];
                // Para asegurar que el 'this' sea el objeto contenedor
                func.call(current);
            } else {
                current = current[parts[i]];
            }
        } else {
            console.warn(`Path ${path} not found in WidgetDebug at part: ${parts[i]}`);
            break;
        }
    }
}

// Sincronizar checkbox "mantener visible"
document.getElementById('keep-visible-checkbox').addEventListener('change', function () {
    const win = getWidgetWindow();
    if (win) {
        win.KEEP_WIDGET_VISIBLE = this.checked;
        console.log('Keep Visible:', this.checked);
    }
});

// Test Level Up (Specific for Cyberpunk overlay)
function testLevelUp() {
    const win = getWidgetWindow();
    if (win) {
        // Use postMessage for cross-origin safety (local files)
        win.postMessage({
            type: 'TEST_LEVEL_UP',
            username: 'NetRunner_Test',
            level: Math.floor(Math.random() * 50) + 10,
            title: 'LEGEND OF NIGHT CITY'
        }, '*');

        console.log('Triggered Level Up Animation via postMessage');
    } else {
        console.warn('Widget window not found');
    }
}

// --- BACKGROUND CHANGER ---
function changeBG(url) {
    const container = document.getElementById('preview-container');
    if (url) {
        container.style.backgroundImage = `url("${url}")`;
        container.style.backgroundColor = 'transparent';
    } else {
        container.style.backgroundImage = 'none';
        container.style.backgroundColor = '#000';
    }
}
