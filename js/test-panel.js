/**
 * Test Panel - System Control Controller
 * Handles communication with the widget and UI interactions.
 */
class TestPanelController {
    constructor() {
        this.widgetFrame = document.getElementById('widget-frame');
        this.previewContainer = document.getElementById('preview-container');
        this.simInterval = null;
        this.simCount = 0;
        this.broadcaster = null;
        this.logCounts = { success: 0, error: 0 };

        this.SIM_USERS = [
            'NeonSamurai', 'CyberPunk2077', 'NetRunner_01', 'ArasakaSpy', 
            'JohnnySilverhand', 'AltCunningham', 'RogueAmendiares', 'JudyAlvarez', 
            'PanamPalmer', 'GoroTakemura', 'MeredithStout', 'ViktorVektor', 
            'MistyOlszewski', 'JackieWelles', 'T-Bug', 'DexterDeShawn'
        ];

        this.SIM_MESSAGES = [
            "Wake up, Samurai! We have a city to burn.",
            "Preem chrome, choom!",
            "Just jacked in to the subnet.",
            "Anyone want to hit Afterlife later?",
            "Running low on eddies...",
            "Corpo scum everywhere.",
            "Nice rig! What specs?",
            "LUL", "Kappa", "PogChamp", "monkaS",
            "Glitch in the matrix detected.",
            "System override imminent.",
            "Downloading new shards...",
            "Trauma Team is on the way!",
            "Delta out of here!"
        ];

        this.init();
    }

    init() {
        // --- OVERRIDE CONSOLE.LOG (Global & Iframe) ---
        this.captureConsole(window);

        // --- GLOBAL EVENT LISTENERS ---
        // Forzar ajuste inicial
        this.fitPreview();
        window.addEventListener('load', () => this.fitPreview());
        window.addEventListener('resize', () => this.fitPreview());
        
        // Backup: Reintentar ajuste a los 500ms por si el CSS tardó en cargar
        setTimeout(() => this.fitPreview(), 500);

        this.widgetFrame.addEventListener('load', () => {
            console.log('✅ Widget iframe loaded');
            this.captureConsole(this.widgetFrame.contentWindow); 
            this.fitPreview();
            this._attachToWidget();
            this.setupBroadcaster();
        });

        // --- DELEGATED EVENT LISTENERS (ACTION DISPATCHER) ---
        document.body.addEventListener('click', (e) => this.handleAction(e));

        // --- SYNC CHECKBOXES ---
        document.getElementById('keep-visible-checkbox')?.addEventListener('change', (e) => {
            const win = this.getWidgetWindow();
            if (win) {
                win.KEEP_WIDGET_VISIBLE = e.target.checked;
                console.log('Keep Visible:', e.target.checked);
            }
        });
    }

    /**
     * Centralized Action Handler (Replaces inline onclick)
     */
    handleAction(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        const value = target.getAttribute('data-value');

        switch (action) {
            case 'toggle-auto-chat':
                this.toggleAutoChat();
                break;

            case 'send-message':
                this.testUser(document.getElementById('custom-user')?.value);
                break;
            case 'send-broadcaster':
                this.testUser(this.broadcaster || 'liiukiin');
                break;
            case 'set-streak':
                this.testStreak(document.getElementById('streak-days')?.value);
                break;
            case 'test-level-up':
                this.testLevelUp();
                break;
            case 'test-spam-charflood':
                this.testSpamCharFlood();
                break;
            case 'test-spam-repeat':
                this.testSpamRepeat();
                break;
            case 'test-spam-flood':
                this.testSpamFlood();
                break;
            case 'test-spam-copypasta':
                this.testSpamCopypasta();
                break;
            case 'widget-call':
                this.callWidgetFunction(value);
                break;
            default:
                console.warn(`Unknown action: ${action}`);
        }
    }

    /**
     * Captura los logs de una ventana específica (Main o Iframe)
     * y los redirige al panel de logs del sistema
     */
    captureConsole(targetWindow) {
        if (!targetWindow || targetWindow._isConsoleCaptured) return;

        const originalLog = targetWindow.console.log;
        const originalWarn = targetWindow.console.warn;
        const originalError = targetWindow.console.error;

        targetWindow.console.log = (...args) => {
            originalLog.apply(targetWindow.console, args);
            this.appendLogToPanel('log', args);
        };

        targetWindow.console.warn = (...args) => {
            originalWarn.apply(targetWindow.console, args);
            this.appendLogToPanel('warn', args);
        };

        targetWindow.console.error = (...args) => {
            originalError.apply(targetWindow.console, args);
            this.appendLogToPanel('error', args);
        };
        targetWindow._isConsoleCaptured = true;
    }



    appendLogToPanel(type, args) {
        const logBox = document.getElementById('panel-logs');
        if (!logBox) return;

        const line = document.createElement('div');
        line.className = 'log-entry';
        
        const text = args.map(arg => {
            try {
                if (typeof arg === 'object') {
                    // Intento simple de stringify para objetos
                    return JSON.stringify(arg, (key, value) => {
                         if (key === 'source' || key === 'target') return '[DOM/Window]'; // Evitar circulares comunes en eventos
                         return value;
                    });
                }
                return String(arg);
            } catch (e) {
                return '[Complex Object]';
            }
        }).join(' ');

        // --- FILTROS DE LOGS ---
        if (text.includes('Preview scaled')) return; // IGNORAR
        // -----------------------

        let color = 'rgba(255, 255, 255, 0.7)';
        let bg = 'transparent';

        if (type === 'warn') {
            color = 'rgba(255, 215, 0, 0.9)'; // Gold
            bg = 'rgba(255, 215, 0, 0.05)';
        }
        if (type === 'error' || text.includes('❌') || text.includes('[ERROR]') || text.includes('Error:')) {
            color = 'rgba(255, 60, 60, 0.9)'; // Red
            bg = 'rgba(255, 0, 0, 0.1)';
        }
        
        // Detección automática de éxito (verde)
        if (this._isSuccessLog(text) && color !== 'rgba(255, 60, 60, 0.9)') {
             color = 'rgba(0, 255, 128, 0.9)'; // Green
             bg = 'rgba(0, 255, 128, 0.05)';
        }
        
        line.style.color = color;
        line.style.background = bg;
        line.innerHTML = `<span style="opacity: 0.3;">></span> ${text}`;
        
        logBox.appendChild(line);
        // Mantener solo los últimos 100 logs
        if (logBox.children.length > 100) logBox.removeChild(logBox.firstChild);
        logBox.scrollTop = logBox.scrollHeight;

        // Actualizar contadores
        this._updateCounters(type, text);
    }

    _updateCounters(type, text) {
        const isErrorInText = text.includes('❌') || text.includes('[ERROR]') || text.includes('Error:');
        
        if (type === 'error' || isErrorInText) {
            this.logCounts.error++;
            const el = document.getElementById('log-count-error');
            if (el) el.textContent = this.logCounts.error;
        } else if (this._isSuccessLog(text)) {
            this.logCounts.success++;
            const el = document.getElementById('log-count-success');
            if (el) el.textContent = this.logCounts.success;
        }
    }

    /**
     * Determina si un log debe considerarse exitoso/positivo
     * @private
     */
    _isSuccessLog(text) {
        // Lista expandida de emojis y palabras clave positivas
        const successMarkers = [
            '✅', '🚀', '✨', '📦', '🏆', '🌐', '📊', '🎭', '💤', '🛠️', '📡', '🎮', 
            '🔍', '🔊', '⚙️', '📢', '📂', '🔌', '📄', 'ℹ️',
            'Success', 'Connected', 'OK', '[INFO]', 'initialized', 'Joined', 'Executing command', 'info:'
        ];
        
        return successMarkers.some(marker => text.includes(marker));
    }

    fitPreview() {
        const container = document.getElementById('preview-container');
        const iframe = document.getElementById('widget-frame');
        
        if (!container || !iframe) return;

        // Forzar recalculo si el contenedor no está listo
        const containerWidth = container.clientWidth || (window.innerWidth - 380);
        
        // El widget original es 2560px (2K)
        const ORIGINAL_WIDTH = 2560; 
        const scale = containerWidth / ORIGINAL_WIDTH;
        
        iframe.style.transformOrigin = '0 0'; // CRÍTICO: Escalar desde la esquina superior izquierda
        iframe.style.transform = `scale(${scale})`;
        
        // REINTENTAR CONEXIÓN SI FALLÓ AL INICIO
        if (!this.app) {
             this._attachToWidget();
        }
    }

    _attachToWidget() {
        if (this.app && this.widgetDebugReady) return; // Ya conectado y listo

        const win = this.getWidgetWindow();
        if (win) {
            // INTENTO 1: Directo (Solo si WidgetDebug ya existe)
            if (win.WidgetDebug) {
                this.app = win.APP_INSTANCE;
                this.widgetDebugReady = true;
                console.log('✅ Widget Connected & Debug Tools Ready (Direct)');
                return;
            } 
            
            // INTENTO 2: Evento (Si aún está cargando)
            if (!this._waitingForEvent) {
                this._waitingForEvent = true;
                console.log('⏳ Waiting for Widget Debug Tools...');
                
                // Opción A: Evento oficial
                win.addEventListener('widget-ready', () => {
                    this.app = win.APP_INSTANCE;
                    this.widgetDebugReady = true;
                    console.log('✅ Widget Connected (Event)');
                    this._waitingForEvent = false;
                }, { once: true });

                // Opción B: Polling de respaldo (por si el evento ya pasó pero WidgetDebug tardó un ms más)
                const polling = setInterval(() => {
                    if (win.WidgetDebug) {
                        this.app = win.APP_INSTANCE;
                        this.widgetDebugReady = true;
                        console.log('✅ Widget Connected (Polling)');
                        this._waitingForEvent = false;
                        clearInterval(polling);
                    }
                }, 500);
            }
        }
    }

    getWidgetWindow() {
        return this.widgetFrame.contentWindow;
    }

    setupBroadcaster(retries = 0) {
        const win = this.getWidgetWindow();
        // Ahora dependemos de WidgetDebug, no solo de app.config
        if (!win || !win.WidgetDebug) {
            if (retries < 20) setTimeout(() => this.setupBroadcaster(retries + 1), 500);
            return;
        }

        this.broadcaster = win.WidgetDebug.app?.config?.BROADCASTER_USERNAME;
        if (this.broadcaster) {
            const btn = document.getElementById('broadcaster-btn');
            if (btn) {
                btn.innerHTML = `👑 ${this.broadcaster.toUpperCase()}`;
                console.log(`✅ Controller synced with broadcaster: ${this.broadcaster}`);
            }
        }
    }

    async checkSubStatus(channel, username) {
        try {
            const cleanChannel = channel.replace('#', '').trim();
            const cleanUser = username.trim();
            const url = `https://api.ivr.fi/v2/twitch/subage/${cleanUser}/${cleanChannel}`;
            
            // Timeout de 2 segundos para no bloquear la UI en local/offline
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.status === 404) return 0;
            if (!response.ok) return 0;

            const data = await response.json();
            if (data.subscribed === true) {
                const months = data.cumulative ? data.cumulative.months : 0;
                return months > 0 ? months : 1;
            }
            return 0;
        } catch (e) {
            if (e.name === 'AbortError') {
                console.warn('⚠️ API Timeout (IVR): Skipping sub check');
            } else {
                console.warn('⚠️ API Error (IVR):', e);
            }
            return 0; 
        }
    }

    async testUser(username) {
        if (!username) return;
        const message = document.getElementById('test-message')?.value || 'ACCESS_GRANTED';
        const win = this.getWidgetWindow();

        if (!win?.WidgetDebug?.chat) {
            console.log('Waiting for widget instance...');
            return;
        }

        let channel = win.WidgetDebug.app?.config?.TWITCH_CHANNEL || 'liiukiin';
        console.log(`🔍 Checking REAL status for ${username} in ${channel}...`);
        
        const extraTags = {};
        const forceMod = document.getElementById('mod-toggle')?.checked;
        const forceVip = document.getElementById('vip-toggle')?.checked;
        const forceSub = document.getElementById('sub-toggle')?.checked;

        if (forceMod) extraTags.mod = true;
        if (forceVip) extraTags.vip = true;

        if (forceSub) {
            extraTags.subscriber = true;
            extraTags['badge-info'] = { subscriber: "1" };
        } else {
            const realMonths = await this.checkSubStatus(channel, username);
            if (realMonths > 0) {
                extraTags.subscriber = true;
                extraTags['badge-info'] = { subscriber: realMonths.toString() };
            }
        }

        win.WidgetDebug.chat.simulateMessage(username, message, extraTags);
    }

    testStreak(days) {
        const win = this.getWidgetWindow();
        if (!win?.WidgetDebug?.xp) return;

        days = parseInt(days) || 1;
        win.WidgetDebug.xp.setStreak('StreakTester', days);
        win.WidgetDebug.chat.simulateMessage('StreakTester', `Testing streak: ${days} days!`);
    }

    callWidgetFunction(path) {
        const win = this.getWidgetWindow();
        if (!win?.WidgetDebug) return;

        const parts = path.split('.');
        let current = win.WidgetDebug;
        let func = null;

        for (let i = 0; i < parts.length; i++) {
            if (current[parts[i]]) {
                if (i === parts.length - 1) {
                    func = current[parts[i]];
                    func.call(current);
                } else {
                    current = current[parts[i]];
                }
            } else {
                console.warn(`Path ${path} not found`);
                break;
            }
        }
    }

    testLevelUp() {
        const win = this.getWidgetWindow();
        if (!win?.WidgetDebug?.xp) {
            console.error('❌ Widget not ready: WidgetDebug.xp not available');
            return;
        }
        win.WidgetDebug.xp.testLevelUp({
            username: 'NetRunner_Test',
            level: Math.floor(Math.random() * 50) + 10,
            title: 'LEGEND OF NIGHT CITY'
        });
    }


    // =========================================================================
    // SPAM SHIELD TESTS
    // =========================================================================

    testSpamCharFlood() {
        const win = this.getWidgetWindow();
        if (!win?.WidgetDebug?.chat) return;
        console.log('🛡️ Testing Char Flood detection...');
        // Primer mensaje normal (debe pasar)
        win.WidgetDebug.chat.simulateMessage('SpamBot_01', 'This is a normal message, should pass');
        // Char flood (debe bloquearse)
        setTimeout(() => {
            win.WidgetDebug.chat.simulateMessage('SpamBot_01', 'AAAAAAAAAAAAAAAAAAAAAAAAA');
            console.log('→ Sent char flood (should be BLOCKED)');
        }, 500);
        setTimeout(() => {
            win.WidgetDebug.chat.simulateMessage('SpamBot_01', 'JAJAJAJAJAJAJAJAJAJAJAJA');
            console.log('→ Sent char flood 2 (should be BLOCKED)');
        }, 1000);
    }

    testSpamRepeat() {
        const win = this.getWidgetWindow();
        if (!win?.WidgetDebug?.chat) return;
        console.log('🛡️ Testing Repeat Message detection...');
        const repeatedMsg = 'Check out my stream link click here now!!!';
        // Enviar 4 veces el mismo mensaje (el 4to debe bloquearse)
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                win.WidgetDebug.chat.simulateMessage('SpamBot_02', repeatedMsg);
                console.log(`→ Repeat #${i + 1} sent (${i < 3 ? 'should PASS' : 'should be BLOCKED'})`);
            }, i * 400);
        }
    }

    testSpamFlood() {
        const win = this.getWidgetWindow();
        if (!win?.WidgetDebug?.chat) return;
        console.log('🛡️ Testing User Flood detection...');
        // Enviar 8 mensajes rápidos del mismo usuario
        const messages = [
            'First message', 'Second message', 'Third message',
            'Fourth message', 'Fifth message', 'Sixth message',
            'Seventh message', 'Eighth message'
        ];
        messages.forEach((msg, i) => {
            setTimeout(() => {
                win.WidgetDebug.chat.simulateMessage('FloodBot', msg);
                console.log(`→ Flood #${i + 1}: "${msg}" (${i < 5 ? 'should PASS' : 'THROTTLED'})`);
            }, i * 200);
        });
    }

    testSpamCopypasta() {
        const win = this.getWidgetWindow();
        if (!win?.WidgetDebug?.chat) return;
        console.log('🛡️ Testing Copypasta detection...');
        const pasta = 'This is a copypasta message that everyone is posting in chat right now omg';
        const users = ['CopyUser_A', 'CopyUser_B', 'CopyUser_C', 'CopyUser_D'];
        // 4 usuarios enviando el mismo texto
        users.forEach((user, i) => {
            setTimeout(() => {
                win.WidgetDebug.chat.simulateMessage(user, pasta);
                console.log(`→ Copypasta from ${user} (#${i + 1}) (${i < 3 ? 'should PASS' : 'should be BLOCKED'})`);
            }, i * 300);
        });
    }

    toggleAutoChat() {
        const btn = document.getElementById('sim-start-btn');
        const stats = document.getElementById('sim-stats');
        const counter = document.getElementById('sim-count');

        if (this.simInterval) {
            clearInterval(this.simInterval);
            this.simInterval = null;
            if (btn) btn.innerHTML = '▶ START_AUTO_CHAT';
            btn?.classList.remove('btn--red');
            btn?.classList.add('btn--cyan');
            if (stats) stats.style.display = 'none';
        } else {
            if (btn) btn.innerHTML = '⏹ ABORT_PROTOCOL';
            btn?.classList.remove('btn--cyan');
            btn?.classList.add('btn--red');
            if (stats) stats.style.display = 'block';

            this.simInterval = setInterval(() => {
                const user = this.SIM_USERS[Math.floor(Math.random() * this.SIM_USERS.length)];
                const msg = this.SIM_MESSAGES[Math.floor(Math.random() * this.SIM_MESSAGES.length)];
                
                const win = this.getWidgetWindow();
                if (win?.WidgetDebug?.chat) {
                    const extraTags = {};
                    if (Math.random() > 0.7) { 
                        extraTags.subscriber = true; 
                        extraTags['badge-info'] = { subscriber: "1" }; 
                    }
                    if (Math.random() > 0.9) extraTags.mod = true;
                    if (Math.random() > 0.93) extraTags.vip = true;

                    win.WidgetDebug.chat.simulateMessage(user, msg, extraTags);
                    this.simCount++;
                    if (counter) counter.textContent = this.simCount;
                }
            }, Math.floor(Math.random() * 2000) + 500);
        }
    }


}

// Global initialization
window.TestPanel = new TestPanelController();
