/**
 * DevTools - Herramientas de Desarrollo y Testing
 * 
 * Se encarga de exponer funciones al objeto global 'window' para permitir
 * realizar pruebas desde la consola del navegador o desde el panel de control.
 */
export default class DevTools {
    /**
     * @param {Object} app - Instancia de la clase App principal
     */
    constructor(app) {
        this.app = app;
    }

    /**
     * Inicializa las herramientas de desarrollo
     */
    init() {
        console.log('🛠️ DevTools: Inyectando herramientas de testing...');

        // 1. Simulación de Mensajes
        window.simularMensaje = (usuario, mensaje) => {
            console.log('🧪 Simulando mensaje de:', usuario);
            const tags = { 'display-name': usuario, emotes: {} };
            this.app.onMessageReceived(tags, mensaje);
        };

        window.reloadRankings = async () => {
            if (this.app.processor) {
                await this.app.processor.loadAsyncData();
            }
        };

        // 2. Herramientas de XP (Solo si el servicio está disponible)
        if (this.app.processor) {
            this._setupXPTools();
            this._setupEmoteTools();
            this._setupAchievementTools();
            this._setupIdleTools();
            this._setupGistTools();
            this._setupPostMessageListener();
        }

        // Exponer la instancia de la app para debugging profundo
        window.APP_INSTANCE = this.app;
    }

    /** @private */
    _setupXPTools() {
        const xpService = this.app.processor.getService('xp');
        const xpDisplay = this.app.processor.getManager('xpDisplay');
        
        if (!xpService) return;

        window.getXPStats = () => xpService.getGlobalStats();

        window.testLevelUp = (lvl) => {
            if (xpDisplay) {
                xpDisplay.showLevelUp({
                    username: 'TestUser',
                    newLevel: lvl || 10,
                    title: 'DEBUG RANK'
                });
            }
        };

        window.resetAllXP = async () => {
            if (confirm('⚠️ PELIGRO: ¿ESTÁS SEGURO?\n\nEsto BORRARÁ PERMANENTEMENTE todos los niveles y XP de TODOS los usuarios.')) {
                await xpService.resetAllData();
                alert('✅ Todos los datos de XP han sido eliminados.');
            }
        };

        window.exportXPData = () => {
            try {
                const data = xpService.getAllDataJSON();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `xp_backup_${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                console.log('💾 Datos XP Exportados');
            } catch (e) {
                console.error('Error exportando:', e);
            }
        };

        window.setTestStreak = (username, days) => {
            const userData = xpService.getUserData(username);
            userData.streakDays = days;
            userData.lastStreakDate = new Date().toLocaleDateString('en-CA');
            xpService.usersXP.set(username.toLowerCase(), userData);
            console.log(`🔥 Streak set for ${username}: ${days} days`);
        };
    }

    /** @private */
    _setupEmoteTools() {
        const emoteService = this.app.processor.getService('thirdPartyEmotes');
        if (!emoteService) return;

        window.showEmoteStats = () => {
            const stats = emoteService.getStats();
            const emotes = emoteService.listEmotes(20);
            console.log('🎭 Emote Stats:', stats);
            alert(`🎭 Emotes: Total ${stats.total} | 7TV: ${stats.byProvider['7tv']} | BTTV: ${stats.byProvider['bttv']} | FFZ: ${stats.byProvider['ffz']}`);
        };

        window.testEmoteMessage = () => {
            if (!emoteService.isLoaded) {
                alert('❌ Espera a que carguen los emotes...');
                return;
            }
            const samples = emoteService.listEmotes(3);
            if (samples.length > 0) {
                window.simularMensaje('EmoteTester', `Testing emotes: ${samples.join(' ')}`);
            }
        };
    }

    /** @private */
    _setupAchievementTools() {
        const achievementService = this.app.processor.getService('achievements');
        if (!achievementService) return;

        window.testAchievement = () => {
            const testAchievements = [
                { id: 'test_common', name: 'First Words', rarity: 'common', icon: '💬' },
                { id: 'test_legendary', name: 'Netrunner Legend', rarity: 'legendary', icon: '🧠' }
            ];
            const random = testAchievements[Math.floor(Math.random() * testAchievements.length)];
            achievementService.emitAchievementUnlocked('TestUser', random);
        };
    }

    /** @private */
    _setupIdleTools() {
        const idleManager = this.app.processor.getManager('idleDisplay');
        if (!idleManager) return;

        window.testIdleMode = () => {
            idleManager._enterIdleMode();
            console.log('📊 TEST: Forzando modo idle');
        };
    }

    /** @private */
    _setupGistTools() {
        const gistService = this.app.processor.getService('gist');
        if (!gistService) return;

        window.testGistConnection = async () => {
            console.log('📡 Verificando conexión Gist...');
            const success = await gistService.testConnection();
            alert(success ? '✅ Gist Conectado' : '❌ Error de Conexión Gist');
        };
    }

    /** @private */
    _setupPostMessageListener() {
        window.addEventListener('message', (event) => {
            const data = event.data;
            if (!data || !data.type) return;

            if (data.type === 'TEST_LEVEL_UP') {
                const xpDisplay = this.app.processor.getManager('xpDisplay');
                if (xpDisplay) {
                    xpDisplay.showLevelUp({
                        username: data.username || 'Test',
                        newLevel: data.level || 10,
                        title: data.title || 'TEST RANK'
                    });
                }
            }
        });
    }
}
