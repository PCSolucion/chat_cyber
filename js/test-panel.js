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
        // --- OVERRIDE CONSOLE.LOG ---
        this.setupLogger();

        // --- GLOBAL EVENT LISTENERS ---
        window.addEventListener('load', () => this.fitPreview());
        window.addEventListener('resize', () => this.fitPreview());

        this.widgetFrame.addEventListener('load', () => {
            console.log('✅ Widget iframe loaded');
            this.fitPreview();
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
            case 'change-bg':
                this.changeBG(value);
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
            case 'widget-call':
                this.callWidgetFunction(value);
                break;
            default:
                console.warn(`Unknown action: ${action}`);
        }
    }

    setupLogger() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        const appendLog = (type, args) => {
            const logBox = document.getElementById('panel-logs');
            if (!logBox) return;

            const line = document.createElement('div');
            line.className = 'log-entry';
            
            const text = args.map(arg => {
                if (typeof arg === 'object') return JSON.stringify(arg);
                return String(arg);
            }).join(' ');

            let color = '#aaa';
            if (type === 'warn') color = '#ffd700';
            if (type === 'error') color = '#ff003c';
            
            line.style.color = color;
            line.innerHTML = `<span style="opacity: 0.3;">></span> ${text}`;
            
            logBox.appendChild(line);
            if (logBox.children.length > 50) logBox.removeChild(logBox.firstChild);
            logBox.scrollTop = logBox.scrollHeight;
        };

        console.log = (...args) => { originalLog.apply(console, args); appendLog('log', args); };
        console.warn = (...args) => { originalWarn.apply(console, args); appendLog('warn', args); };
        console.error = (...args) => { originalError.apply(console, args); appendLog('error', args); };
    }

    fitPreview() {
        if (!this.widgetFrame || !this.previewContainer) return;
        const containerWidth = this.previewContainer.getBoundingClientRect().width;
        const scale = containerWidth / 2560;
        this.widgetFrame.style.transform = `scale(${scale})`;
        console.log(`🖥️ Preview rescaled: ${Math.round(containerWidth)}px width (Scale: ${scale.toFixed(3)})`);
    }

    getWidgetWindow() {
        return this.widgetFrame.contentWindow;
    }

    setupBroadcaster(retries = 0) {
        const win = this.getWidgetWindow();
        if (!win || !win.WidgetDebug?.app?.config) {
            if (retries < 20) setTimeout(() => this.setupBroadcaster(retries + 1), 500);
            return;
        }

        this.broadcaster = win.WidgetDebug.app.config.BROADCASTER_USERNAME;
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
            
            const response = await fetch(url);
            if (response.status === 404) return 0;
            if (!response.ok) return 0;

            const data = await response.json();
            if (data.subscribed === true) {
                const months = data.cumulative ? data.cumulative.months : 0;
                return months > 0 ? months : 1;
            }
            return 0;
        } catch (e) {
            console.warn('⚠️ API Error (IVR):', e);
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
        if (!win) return;
        win.postMessage({
            type: 'TEST_LEVEL_UP',
            username: 'NetRunner_Test',
            level: Math.floor(Math.random() * 50) + 10,
            title: 'LEGEND OF NIGHT CITY'
        }, '*');
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

    changeBG(url) {
        if (!this.previewContainer) return;
        if (url) {
            this.previewContainer.style.backgroundImage = `url("${url}")`;
            this.previewContainer.style.backgroundColor = 'transparent';
        } else {
            this.previewContainer.style.backgroundImage = 'none';
            this.previewContainer.style.backgroundColor = '#000';
        }
    }
}

// Global initialization
window.TestPanel = new TestPanelController();
