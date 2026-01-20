/**
 * App - Bootstrapper de la Aplicación
 * 
 * Responsabilidades:
 * - Asegurar la conexión con Twitch (Prioridad 1)
 * - Inicializar el MessageProcessor (Lógica de Negocio)
 * - Manejar el ciclo de vida de la página
 * 
 * @class App
 */
class App {
    constructor() {
        this.config = CONFIG;
        console.log('🚀 Booting Twitch Chat Overlay...');

        // 1. Instanciar Message Processor (Lógica de Negocio)
        // Se envuelve en try-catch para que un error de lógica no impida la conexión
        this.processor = null;
        try {
            this.processor = new MessageProcessor(this.config);
            this.processor.init();
        } catch (e) {
            console.error('❌ FATAL: MessageProcessor failed to initialize. Utilities may be broken.', e);
        }

        // 2. Instanciar Twitch Service (Conexión)
        // Se hace por separado para garantizar la conexión
        this.twitchService = null;
        try {
            this.twitchService = new TwitchService(
                this.config.TWITCH_CHANNEL,
                (tags, msg) => this.onMessageReceived(tags, msg)
            );
        } catch (e) {
            console.error('❌ FATAL: TwitchService creation failed.', e);
        }
    }

    /**
     * Inicialización asíncrona
     */
    async init() {
        // Cargar datos del processor (Rankings, XP, etc)
        if (this.processor) {
            try {
                const stats = await this.processor.loadAsyncData();
                console.log('✅ App Logic Loaded:', stats);
            } catch (e) {
                console.error('⚠️ App Logic load warning:', e);
            }
        }

        // Conectar a Twitch
        if (this.twitchService) {
            console.log('📡 Connecting to Twitch...');
            try {
                this.twitchService.connect();
            } catch (e) {
                console.error('❌ Connection failed:', e);
            }
        }

        // Exponer herramientas de testing
        this.exposeTestingFunctions();

        // Iniciar actualización de categoría
        this.startStreamCategoryUpdate();
    }

    /**
     * Handler principal de mensajes
     * Recibe del TwitchService y delega al Processor
     */
    onMessageReceived(tags, message) {
        if (!this.processor) {
            console.warn('⚠️ Message received but Processor is dead.');
            return;
        }

        // Delegar al processor
        this.processor.process(tags, message);
    }

    /**
     * Herramientas de Testing para consola
     */
    /**
     * Herramientas de Testing para consola
     */
    exposeTestingFunctions() {
        window.simularMensaje = (usuario, mensaje) => {
            console.log('🧪 Simulando:', usuario);
            const tags = { 'display-name': usuario, emotes: {} };
            this.onMessageReceived(tags, mensaje);
        };

        window.reloadRankings = async () => {
            if (this.processor) await this.processor.loadAsyncData();
        };

        // Exponer helpers de XP si existen y están activos
        if (this.processor && this.processor.getService('xp')) {
            window.getXPStats = () => this.processor.getService('xp').getGlobalStats();

            // LISTEN FOR POST MESSAGES (Cross-Origin safe for local testing)
            window.addEventListener('message', (event) => {
                const data = event.data;
                if (!data || !data.type) return;

                console.log('📨 Message received via postMessage:', data);

                if (data.type === 'TEST_LEVEL_UP') {
                    const xpDisplay = this.processor.getManager('xpDisplay');
                    if (xpDisplay) {
                        xpDisplay.showLevelUp({
                            username: data.username || 'Test',
                            newLevel: data.level || 10,
                            title: data.title || 'TEST RANK'
                        });
                    }
                }
            });

            window.testLevelUp = (lvl) => {
                const xpDisplay = this.processor.getManager('xpDisplay');
                if (xpDisplay) {
                    xpDisplay.showLevelUp({
                        username: 'Test',
                        newLevel: lvl,
                        title: 'TEST RANK'
                    });
                }
            };

            // GESTIÓN DE DATOS XP
            window.resetAllXP = async () => {
                if (confirm('⚠️ PELIGRO: ¿ESTÁS SEGURO?\n\nEsto BORRARÁ PERMANENTEMENTE todos los niveles y XP de TODOS los usuarios.\nEsta acción no se puede deshacer.')) {
                    console.log('☢️ Iniciando reseteo de XP...');
                    await this.processor.getService('xp').resetAllData();
                    alert('✅ Todos los datos de XP han sido eliminados.');
                }
            };

            window.exportXPData = () => {
                try {
                    const data = this.processor.getService('xp').getAllDataJSON();
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
                    alert('Error al exportar. Revisa la consola.');
                }
            };

            // TEST STREAK HELPER
            window.setTestStreak = (username, days) => {
                const xpService = this.processor.getService('xp');
                if (xpService) {
                    const userData = xpService.getUserData(username);
                    userData.streakDays = days; // Force update
                    // IMPORTANT: Set date to today so it doesn't reset to 1 on next processing
                    userData.lastStreakDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

                    // Save not strictly necessary for ephemeral test but good practice
                    xpService.usersXP.set(username.toLowerCase(), userData);
                    console.log(`🔥 Streak set for ${username}: ${days} days`);
                }
            };

            // TEST GIST CONNECTION
            window.testGistConnection = async () => {
                const gistService = this.processor.getService('gist');
                if (!gistService) {
                    alert('❌ Servicio Gist no inicializado');
                    return;
                }

                if (!gistService.isConfigured) {
                    alert('⚠️ Gist no configurado en config.js (Faltan ID o Token)');
                    return;
                }

                console.log('📡 Verificando conexión Gist...');
                const success = await gistService.testConnection();
                if (success) {
                    alert('✅ CONEXIÓN EXITOSA: El sistema puede leer y escribir en el Gist.');
                } else {
                    alert('❌ ERROR DE CONEXIÓN: Verifica tu Token y ID en config.js. Revisa la consola para más detalles.');
                }
            };

            // TEST ACHIEVEMENT NOTIFICATION
            window.testAchievement = () => {
                const achievementService = this.processor.getService('achievements');
                if (!achievementService) {
                    alert('❌ Servicio de Logros no inicializado');
                    return;
                }

                // Lista de logros de prueba con diferentes rarezas
                const testAchievements = [
                    { id: 'test_common', name: 'First Words', description: 'Tu primer mensaje en el chat', condition: '1 mensaje', rarity: 'common', icon: '💬' },
                    { id: 'test_uncommon', name: 'Motormouth', description: 'Hablas más que un fixer', condition: '50 mensajes', rarity: 'uncommon', icon: '🎙️' },
                    { id: 'test_rare', name: 'Voice of Night City', description: 'Tu voz resuena en las calles', condition: '1000 mensajes', rarity: 'rare', icon: '🌃' },
                    { id: 'test_epic', name: 'Chrome Tongue', description: 'Lengua mejorada cyberware', condition: '5000 mensajes', rarity: 'epic', icon: '🦾' },
                    { id: 'test_legendary', name: 'Netrunner Comms', description: 'Comunicaciones de élite', condition: '25000 mensajes', rarity: 'legendary', icon: '🧠' }
                ];

                // Elegir uno aleatorio
                const randomAchievement = testAchievements[Math.floor(Math.random() * testAchievements.length)];

                // Emitir el evento como si fuera un logro real
                achievementService.emitAchievementUnlocked('TestUser', randomAchievement);
                console.log(`🏆 TEST: Mostrando logro "${randomAchievement.name}" (${randomAchievement.rarity})`);
            };

            // TEST IDLE MODE (Forzar entrada en modo idle)
            window.testIdleMode = () => {
                const idleManager = this.processor.getManager('idleDisplay');
                if (!idleManager) {
                    alert('❌ Idle Display Manager no inicializado');
                    return;
                }

                // Forzar entrada en modo idle
                idleManager._enterIdleMode();
                console.log('📊 TEST: Forzando modo idle');
            };

            // SHOW EMOTE STATS
            window.showEmoteStats = () => {
                const emoteService = this.processor.getService('thirdPartyEmotes');
                if (!emoteService) {
                    alert('❌ Third Party Emotes no inicializado o no habilitado');
                    return;
                }

                const stats = emoteService.getStats();
                const emotes = emoteService.listEmotes(20);

                console.log('🎭 Third Party Emotes Stats:', stats);
                console.log('🎭 Sample emotes:', emotes);

                alert(`🎭 Third Party Emotes Stats:
                    
Total: ${stats.total} emotes
7TV: ${stats.byProvider['7tv']}
BTTV: ${stats.byProvider['bttv']}
FFZ: ${stats.byProvider['ffz']}
Animated: ${stats.animated}

Sample emotes: ${emotes.slice(0, 10).join(', ')}...

(Ver consola para más detalles)`);
            };

            // TEST EMOTE MESSAGE (Simular mensaje con emotes de terceros)
            window.testEmoteMessage = () => {
                const emoteService = this.processor.getService('thirdPartyEmotes');
                if (!emoteService || !emoteService.isLoaded) {
                    alert('❌ Third Party Emotes no cargados aún. Espera unos segundos.');
                    return;
                }

                // Obtener algunos emotes disponibles
                const availableEmotes = emoteService.listEmotes(5);
                if (availableEmotes.length === 0) {
                    alert('❌ No hay emotes de terceros disponibles');
                    return;
                }

                // Crear mensaje con emotes
                const testMessage = `Hola chat! ${availableEmotes[0]} Grande el stream ${availableEmotes[1] || ''} ${availableEmotes[2] || ''}`.trim();

                window.simularMensaje('EmoteTester', testMessage);
                console.log(`🎭 TEST: Mensaje con emotes: "${testMessage}"`);
            };

        }
    }

    /**
     * Inicia el ciclo de actualización de categoría del stream
     * Se actualiza cada 5 minutos
     */
    startStreamCategoryUpdate() {
        const updateCategory = async () => {
            if (!this.twitchService) return;

            const category = await this.twitchService.fetchChannelCategory();
            // Solo actualizamos si obtuvimos una categoría válida
            if (category && this.processor) {
                const uiManager = this.processor.getManager('ui');
                if (uiManager) {
                    uiManager.updateStreamCategory(category);
                }
            }
        };

        // Primera llamada inmediata (con un pequeño delay para asegurar carga de UI)
        setTimeout(updateCategory, 2000);

        // Actualizar según configuración (default 5 min)
        const interval = this.config.STREAM_CATEGORY_UPDATE_INTERVAL || 300000;
        this.categoryInterval = setInterval(updateCategory, interval);
    }

    async destroy() {
        console.log('🛑 Shutting down...');
        if (this.categoryInterval) clearInterval(this.categoryInterval);
        if (this.processor) await this.processor.destroy();
        if (this.twitchService) this.twitchService.disconnect();
    }
}

// Inicialización Global
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
    window.addEventListener('beforeunload', () => app.destroy());
});
