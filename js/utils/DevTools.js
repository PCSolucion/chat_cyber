/**
 * DevTools - Herramientas de Desarrollo y Testing
 * 
 * Se encarga de exponer funciones al objeto global 'window' para permitir
 * realizar pruebas desde la consola del navegador o desde el panel de control.
 * 
 * Refactored: Ahora utiliza el objeto 'WidgetDebug' para organizar las herramientas.
 */
export default class DevTools {
    /**
     * @param {Object} app - Instancia de la clase App principal
     */
    constructor(app) {
        this.app = app;
        this.xpService = null;
        this.emoteService = null;
        this.achievementService = null;
        this.idleManager = null;
        this.firestoreService = null;
        this.notificationManager = null;
    }

    /**
     * Inicializa las herramientas de desarrollo
     */
    init() {
        console.log('🛠️ DevTools: Inicializando entorno de debugging...');

        if (this.app.processor) {
            this.xpService = this.app.processor.getService('xp');
            this.emoteService = this.app.processor.getService('thirdPartyEmotes');
            this.achievementService = this.app.processor.getService('achievements');
            
            this.idleManager = this.app.processor.getManager('idleDisplay');
            this.notificationManager = this.app.processor.notificationManager;
        }

        // 1. Crear el nuevo objeto de debug organizado
        window.WidgetDebug = {
            app: this.app,
            
            chat: {
                simulateMessage: (usuario, mensaje, extraTags = {}) => this._simulateMessage(usuario, mensaje, extraTags),
                reloadRankings: () => this._reloadRankings()
            },

            xp: {
                getStats: () => this.xpService?.getGlobalStats(),
                getTopUsers: (limit) => this.xpService?.getXPLeaderboard(limit),
                testLevelUp: (lvl) => this._testLevelUp(lvl),
                resetAll: () => this._resetAllXP(),
                exportData: () => this._exportXPData(),
                setStreak: (user, days) => this._setTestStreak(user, days),
                testWelcomeBack: (days) => this._testWelcomeBack(days)
            },

            achievements: {
                test: () => this._testAchievement()
            },

            emotes: {
                showStats: () => this._showEmoteStats(),
                testMessage: () => this._testEmoteMessage()
            },

            idle: {
                forceMode: () => this.idleManager?._enterIdleMode()
            }
        };

        // 2. Mantener ALIASES para compatibilidad con test-panel actual (Legacy Support)
        this._setupLegacyAliases();

        // 3. Listeners
        this._setupPostMessageListener();

        // 4. Polling de Cuota (Monitor en tiempo real)
        if (this.app.processor) {
            this.firestoreService = this.app.processor.getService('firestore');
            if (this.firestoreService) {
                setInterval(() => this._sendQuotaUpdate(), 2000);
            }
        }

        console.log('✅ DevTools: Objeto window.WidgetDebug listo.');
    }

    _sendQuotaUpdate() {
        if (!this.firestoreService) return;
        
        // FirestoreService usa .metrics {reads, writes}, no .opCounts
        const counts = this.firestoreService.metrics || { reads: 0, writes: 0 };
        
        // MAX_READS_PER_SESSION no está definido en el servicio, usamos un valor informativo.
        const maxReads = 50000; // Límite diario de plan gratuito Firebase como referencia
        const isBlocked = counts.reads >= maxReads;

        window.parent.postMessage({
            type: 'QUOTA_UPDATE',
            reads: counts.reads,
            writes: counts.writes,
            isBlocked: isBlocked
        }, '*');
    }

    /** --- IMPLEMENTACIONES --- **/

    _simulateMessage(usuario, mensaje, extraTags = {}) {
        console.log('🧪 Simulando mensaje de:', usuario, extraTags);
        const tags = { 
            'display-name': usuario, 
            emotes: {},
            ...extraTags 
        };
        this.app.onMessageReceived(tags, mensaje);
    }

    async _reloadRankings() {
        if (this.app.processor) {
            await this.app.processor.loadAsyncData();
        }
    }

    _testLevelUp(lvl) {
        const data = {
            username: 'TestUser',
            newLevel: lvl || 10,
            title: 'DEBUG RANK'
        };
        this.notificationManager?.showLevelUp(data);
    }

    async _resetAllXP() {
        if (confirm('⚠️ PELIGRO: ¿ESTÁS SEGURO?\n\nEsto BORRARÁ PERMANENTEMENTE todos los niveles y XP de TODOS los usuarios.')) {
            await this.xpService?.resetAllData();
            alert('✅ Todos los datos de XP han sido eliminados.');
        }
    }

    _exportXPData() {
        try {
            const data = this.xpService?.getAllDataJSON(); // Solo memoria de la sesión actual
            if (!data) return;
            
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            console.log('💾 Datos Sesión Exportados');
        } catch (e) {
            console.error('Error exportando:', e);
        }
    }

    _setTestStreak(username, days) {
        if (!this.xpService) return;
        // getUserData espera (userId, username)
        const userData = this.xpService.getUserData(null, username);
        if (!userData) return;
        
        userData.streakDays = parseInt(days);
        userData.lastStreakDate = new Date().toISOString().split('T')[0];
        this.xpService.stateManager.markDirty(username);
        console.log(`🔥 Streak set for ${username}: ${days} days`);
    }

    _testWelcomeBack(daysAway = 14) {
        if (!this.xpService) {
            console.warn('⚠️ XP Service not available');
            return;
        }

        const testUser = 'ReturningRunner';
        // getUserData espera (userId, username)
        const userData = this.xpService.getUserData(null, testUser);
        if (!userData) return;

        // Simular que el usuario estuvo inactivo N días
        const msAway = daysAway * 24 * 60 * 60 * 1000;
        userData.lastActivity = Date.now() - msAway;

        // Limpiar el cache de sesión para que pueda dispararse de nuevo
        this.xpService.sessionReturningShown.delete(testUser.toLowerCase());

        console.log(`🔄 Simulating ${testUser} returning after ${daysAway} days...`);

        // Enviar mensaje para disparar la detección
        this._simulateMessage(testUser, `I'm back after ${daysAway} days! Did I miss anything?`);
    }

    _showEmoteStats() {
        if (!this.emoteService) return;
        const stats = this.emoteService.getStats();
        console.log('🎭 Emote Stats:', stats);
        alert(`🎭 Emotes: Total ${stats.total} | 7TV: ${stats.byProvider['7tv']} | BTTV: ${stats.byProvider['bttv']} | FFZ: ${stats.byProvider['ffz']}`);
    }

    _testEmoteMessage() {
        if (!this.emoteService?.isLoaded) {
            alert('❌ Espera a que carguen los emotes...');
            return;
        }
        const samples = this.emoteService.listEmotes(3);
        if (samples.length > 0) {
            this._simulateMessage('EmoteTester', `Testing emotes: ${samples.join(' ')}`);
        }
    }

    _testAchievement() {
        if (!this.achievementService) return;
        const testAchievements = [
            { id: 'test_common', name: 'First Words', rarity: 'common', description: 'Simulated common achievement', condition: 'DEBUG' },
            { id: 'test_legendary', name: 'Netrunner Legend', rarity: 'legendary', description: 'Simulated legendary achievement', condition: 'DEBUG' }
        ];
        const random = testAchievements[Math.floor(Math.random() * testAchievements.length)];
        // Pasar: userId, username, achievement
        this.achievementService.emitAchievementUnlocked('99999', 'TestUser', random);
    }

    async _reloadRankings() {
        if (this.app.processor) {
            await this.app.processor.loadAsyncData();
        }
    }

    _setupLegacyAliases() {
        const d = window.WidgetDebug;
        
        // Globals sueltos (Deprecados)
        window.simularMensaje = d.chat.simulateMessage;
        window.reloadRankings = d.chat.reloadRankings;
        window.getXPStats = d.xp.getStats;
        window.getTopUsers = d.xp.getTopUsers;
        window.testLevelUp = d.xp.testLevelUp;
        window.resetAllXP = d.xp.resetAll;
        window.exportXPData = d.xp.exportData;
        window.setTestStreak = d.xp.setStreak;
        window.showEmoteStats = d.emotes.showStats;
        window.testEmoteMessage = d.emotes.testMessage;
        window.testAchievement = d.achievements.test;
        window.testIdleMode = d.idle.forceMode;
        window.APP_INSTANCE = this.app;
    }

    /** @private */
    _setupPostMessageListener() {
        window.addEventListener('message', (event) => {
            const data = event.data;
            if (!data || !data.type) return;

            if (data.type === 'TEST_LEVEL_UP') {
                this._testLevelUp(data.level);
            }
        });
    }
}
