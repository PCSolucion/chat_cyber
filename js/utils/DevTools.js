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
        this.quotaInterval = null;
        this._boundPostMessageListener = null;
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
                getStats: () => window.WidgetCentral?.xpLeaderboardService?.getGlobalStats(),
                getTopUsers: (limit) => window.WidgetCentral?.xpLeaderboardService?.getXPLeaderboard(limit),
                testLevelUp: (lvl) => this._testLevelUp(lvl),
                resetAll: () => this._resetAllXP(),
                exportData: () => this._exportXPData(),
                setStreak: (user, days) => this._setTestStreak(user, days)
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
            },
            
            predictions: {
                testWinner: (user = 'Tester') => this._testPrediction(user, true),
                testParticipant: (user = 'Tester') => this._testPrediction(user, false)
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
                this.quotaInterval = setInterval(() => this._sendQuotaUpdate(), 2000);
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
        
        // Registrar artificialmente al usuario como presente para pasar filtros
        if (this.app.twitchService && this.app.twitchService.activeChatters) {
            this.app.twitchService.activeChatters.add(usuario.toLowerCase());
        }

        const tags = { 
            'display-name': usuario, 
            username: usuario.toLowerCase(), // Añadido para compatibilidad correcta de tags
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

    _testLevelUp(eventData = {}) {
        const data = {
            username: eventData.username || 'TestUser',
            newLevel: eventData.level || eventData.newLevel || 10,
            title: eventData.title || 'DEBUG RANK',
            isPresent: true // Forzar presencia para que pase los filtros de NotificationManager
        };
        
        console.log('🎬 DevTools: Ejecutando Test LevelUp', data);
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
            alert('❌ Error al exportar los datos: ' + e.message);
        }
    }

    _setTestStreak(username, days) {
        if (!this.xpService) return;
        // getUserData espera (username)
        const userData = this.xpService.getUserData(username);
        if (!userData) return;
        
        userData.streakDays = parseInt(days);
        userData.lastStreakDate = new Date().toISOString().split('T')[0];
        this.xpService.stateManager.markDirty(username);
        console.log(`🔥 Streak set for ${username}: ${days} days`);
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
        // Pasar: username, achievement (userId ya no se usa como key principal)
        this.achievementService.emitAchievementUnlocked('TestUser', random);
    }

    _testPrediction(username, isWinner) {
        if (!this.notificationManager) return;
        this.notificationManager.showPredictionResult({
            username,
            xp: isWinner ? 200 : 30,
            isWinner
        });
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
        this._boundPostMessageListener = (event) => {
            const data = event.data;
            if (!data || !data.type) return;

            if (data.type === 'TEST_LEVEL_UP') {
                this._testLevelUp(data);
            }
        };
        window.addEventListener('message', this._boundPostMessageListener);
    }

    /**
     * Limpia recursos y detiene intervalos
     */
    destroy() {
        if (this.quotaInterval) {
            clearInterval(this.quotaInterval);
            this.quotaInterval = null;
        }

        if (this._boundPostMessageListener) {
            window.removeEventListener('message', this._boundPostMessageListener);
            this._boundPostMessageListener = null;
        }

        // Limpiar objeto global
        if (window.WidgetDebug) {
            delete window.WidgetDebug;
        }
        
        console.log('🛑 DevTools: Destroyed');
    }
}
