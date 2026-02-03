
import RankingSystem from '../services/RankingSystem.js';
import GistStorageService from '../services/GistStorageService.js';
import StreamHistoryService from '../services/StreamHistoryService.js';
import ExperienceService from '../services/ExperienceService.js';
import AchievementService from '../services/AchievementService.js';
import ThirdPartyEmoteService from '../services/ThirdPartyEmoteService.js';
import SessionStatsService from '../services/SessionStatsService.js';

import XPDisplayManager from './XPDisplayManager.js';
import UIManager from './UIManager.js';
import IdleDisplayManager from './IdleDisplayManager.js';
import NotificationManager from './NotificationManager.js';
import EventManager from '../utils/EventEmitter.js';

/**
 * MessageProcessor - Orquestador central de la lógica de mensajes
 * 
 * Responsabilidades:
 * - Inicializar y coordinar todos los servicios (XP, UI, Audio, Data, Ranking)
 * - Procesar mensajes entrantes y delegar a los subsistemas
 * - Aislar la lógica de negocio de la conexión principal
 * 
 * @class MessageProcessor
 */
export default class MessageProcessor {
    constructor(config) {
        this.config = config;
        this.services = {};
        this.managers = {};
        this.isInitialized = false;
        
        // Estado del stream
        this.isStreamOnline = false;
        this.streamStartTime = null;

        // NotificationManager will be initialized in init()
        this.notificationManager = null;
    }

    /**
     * Inicializa todos los servicios dependientes
     * Los errores aquí se capturan para no detener la aplicación
     */
    init() {
        console.log('⚙️ Inicializando procesador de mensajes...');

        // AudioService removed (Delegated to AudioManager via events)


        // 3. Ranking System
        try {
            this.services.ranking = new RankingSystem(this.config);
        } catch (e) {
            console.error('❌ Error initializing RankingSystem:', e);
        }

        // 4. XP System
        if (this.config.XP_SYSTEM_ENABLED) {
            try {
                this.services.gist = new GistStorageService(this.config);
                this.services.gist.configure(
                    this.config.XP_GIST_ID,
                    this.config.XP_GIST_TOKEN,
                    this.config.XP_GIST_FILENAME
                );

                // 4a. Stream History Service (Depende de Gist)
                try {
                    this.services.streamHistory = new StreamHistoryService(
                        this.config,
                        this.services.gist
                    );
                    this.services.streamHistory.startMonitoring();
                    console.log('📅 Stream History Service initialized');
                } catch (e) {
                    console.warn('⚠️ Stream History Service initialization failed:', e);
                }

                this.services.xp = new ExperienceService(
                    this.config,
                    this.services.gist
                );

                // 4b. Achievement Service
                this.services.achievements = new AchievementService(
                    this.config,
                    this.services.xp
                );

                this.managers.xpDisplay = new XPDisplayManager(
                    this.config,
                    this.services.xp,
                    this.services.achievements
                );
            } catch (e) {
                console.error('⚠️ XP System initialization failed:', e);
            }
        }

        // 5. Third Party Emote Service (7TV, BTTV, FFZ)
        EventManager.on('stream:statusChanged', (isOnline) => this.updateStreamStatus(isOnline));

        // Inicializar antes que UI para inyectar dependencia
        if (this.config.THIRD_PARTY_EMOTES_ENABLED) {
            try {
                this.services.thirdPartyEmotes = new ThirdPartyEmoteService(this.config);
                console.log('🎭 Third Party Emotes service initialized');
            } catch (e) {
                console.warn('⚠️ Third Party Emotes initialization failed:', e);
            }
        }

        // 6. UI Manager
        try {
            this.managers.ui = new UIManager(
                this.config,
                this.services.ranking,
                this.services.xp,
                this.services.thirdPartyEmotes // Inyección de dependencia
            );
        } catch (e) {
            console.error('❌ CRITICAL: UIManager initialization failed:', e);
        }

        // 7. Session Stats Service (Estadísticas en tiempo real)
        try {
            this.services.sessionStats = new SessionStatsService(
                this.config,
                this.services.xp,
                this.services.achievements
            );
            console.log('📊 Session Stats service initialized');
        } catch (e) {
            console.warn('⚠️ Session Stats initialization failed:', e);
        }

        // 8. Idle Display Manager (Muestra stats cuando no hay chat)
        try {
            this.managers.idleDisplay = new IdleDisplayManager(
                this.config,
                this.services.sessionStats,
                this.managers.ui
            );
            console.log('💤 Idle Display Manager initialized');
        } catch (e) {
            console.warn('⚠️ Idle Display Manager initialization failed:', e);
        }

        // 9. Notification Manager (Gestión centralizada de notificaciones)
        try {
            this.notificationManager = new NotificationManager(
                this.config,
                this.managers.ui
            );
            this.managers.notification = this.notificationManager;
            console.log('📢 Notification Manager initialized');
        } catch (e) {
            console.warn('⚠️ Notification Manager initialization failed:', e);
        }

        this.isInitialized = true;
    }

    /**
     * Carga datos asíncronos (Rankings, XP, Emotes de terceros)
     */
    async loadAsyncData() {
        // Cargar Rankings
        if (this.services.ranking) {
            try {
                await this.services.ranking.loadRankings();
            } catch (e) {
                console.error('⚠️ Failed to load rankings:', e);
            }
        }

        // Cargar XP Data
        if (this.services.xp) {
            try {
                await this.services.xp.loadData();
                // Test conexión Gist (opcional, solo log)
                if (this.services.gist && this.services.gist.isConfigured) {
                    this.services.gist.testConnection().then(connected => {
                        if (connected) console.log('✅ XP System: Gist connected');
                        else console.warn('⚠️ XP System: Local mode only');
                    });
                }
            } catch (e) {
                console.error('⚠️ Failed to load XP data:', e);
            }
        }

        // Cargar emotes de terceros (7TV, BTTV, FFZ)
        if (this.services.thirdPartyEmotes) {
            try {
                const emoteStats = await this.services.thirdPartyEmotes.loadEmotes();
                console.log('🎭 Third Party Emotes loaded:', this.services.thirdPartyEmotes.getStats());
            } catch (e) {
                console.warn('⚠️ Failed to load third party emotes:', e);
            }
        }

        // Iniciar Idle Display Manager
        if (this.managers.idleDisplay) {
            this.managers.idleDisplay.start();
        }

        return {
            rankedUsers: this.services.ranking ? this.services.ranking.getTotalRankedUsers() : 0,
            xpEnabled: !!this.services.xp,
            thirdPartyEmotes: this.services.thirdPartyEmotes ? this.services.thirdPartyEmotes.getStats() : null
        };
    }

    /**
     * Procesa un mensaje entrante
     * @param {Object} tags - Twitch tags
     * @param {string} message - Mensaje de texto
     */
    process(tags, message) {
        if (!this.isInitialized) {
            console.warn('MessageProcessor not initialized yet');
            return;
        }

        try {
            const username = tags['display-name'] || tags.username;
            const emotes = tags.emotes;
            const lowerUser = username.toLowerCase();

            // Verificar usuarios bloqueados (BLACKLIST)
            // No procesar nada de estos usuarios: ni UI, ni XP, ni Stats
            if (this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(lowerUser)) {
                return;
            }

            // Emitir evento de mensaje recibido para que otros servicios reaccionen
            EventManager.emit('chat:messageReceived', { username, message, tags });

            // Si es un comando, DETENER procesamiento visual aquí.
            // El CommandManager se encargará de ejecutar la lógica y emitir respuestas de sistema si corresponde.
            if (message.startsWith('!')) {
                // Aún trackeamos actividad técnica (que el usuario está vivo), pero no mostramos el texto basura
                EventManager.emit('user:activity', username);
                return;
            }

            // Calcular emoteCount una sola vez para reutilizar
            let emoteCount = 0;
            let emoteNames = [];

            // Extraer emotes de Twitch
            if (emotes) {
                Object.entries(emotes).forEach(([emoteId, positions]) => {
                    emoteCount += positions.length;
                    // Extraer el nombre del emote del mensaje usando las posiciones
                    if (positions.length > 0) {
                        const pos = positions[0].split('-');
                        const start = parseInt(pos[0]);
                        const end = parseInt(pos[1]);
                        const emoteName = message.substring(start, end + 1);
                        // Generar URL del emote de Twitch
                        const emoteUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0`;
                        emoteNames.push({ name: emoteName, provider: 'twitch', url: emoteUrl });
                    }
                });
            }

            // Extraer emotes de terceros (7TV, BTTV, FFZ)
            if (this.services.thirdPartyEmotes) {
                const words = message.split(/\s+/);
                words.forEach(word => {
                    const emoteData = this.services.thirdPartyEmotes.getEmote(word);
                    if (emoteData) {
                        emoteCount++;
                        emoteNames.push({
                            name: word,
                            provider: emoteData.provider,
                            url: emoteData.url
                        });
                    }
                });
            }

            // Proceso XP (Aislado)
            if (this.services.xp) {
                try {
                    this._processXP(username, message, emoteCount);
                } catch (e) {
                    console.error('⚠️ XP Processing error:', e);
                }
            }

            // Proceso UI
            if (this.managers.ui) {
                // Extract subscriber info
                const isSubscriber = tags.subscriber === true || tags.subscriber === '1';
                const subscriberInfo = {
                    isSubscriber: isSubscriber,
                    badges: tags.badges || {},
                    badgeInfo: tags['badge-info'] || {}
                };

                // Actualizar datos de suscripción si XP está habilitado
                if (isSubscriber && this.services.xp) {
                    try {
                        let months = 0;
                         if (subscriberInfo.badgeInfo && subscriberInfo.badgeInfo.subscriber) {
                            months = parseInt(subscriberInfo.badgeInfo.subscriber);
                        }
                        // Si es sub pero no tenemos meses (ej. badge-info vacío), asumimos al menos 1
                        if (months === 0) months = 1;
                        
                        this.services.xp.updateSubscription(username, months);
                    } catch (e) {
                        console.warn('Error updating subscription info:', e);
                    }
                }

                this.managers.ui.displayMessage(
                    username,
                    message,
                    emotes,
                    subscriberInfo
                );
            }

            // Audio handled by AudioManager via 'chat:messageReceived'


            // Trackear estadísticas de sesión (incluyendo nombres de emotes)
            if (this.services.sessionStats) {
                this.services.sessionStats.trackMessage(username, message, {
                    emoteCount,
                    emoteNames
                });
            }

            // Notificar actividad (vía evento)
            EventManager.emit('user:activity', username);

        } catch (e) {
            console.error('❌ Error processing message:', e);
        }
    }

    /**
     * Lógica interna de XP
     * @private
     * @param {string} username - Nombre del usuario
     * @param {string} message - Mensaje de texto
     * @param {number} emoteCount - Cantidad de emotes (ya calculado en process)
     */
    _processXP(username, message, emoteCount) {
        const xpContext = {
            hasEmotes: emoteCount > 0,
            emoteCount: emoteCount,
            isStreamLive: this.isStreamOnline,
            isStreamStart: this._checkIsStreamStart(),
            hasMention: message && message.includes('@'),
            message: message 
        };

        const xpResult = this.services.xp.trackMessage(username, xpContext);

        // Verificar logros (Antes de actualizar display para que cuente los nuevos)
        if (this.services.achievements) {
            // Añadir flags relevantes para logros
            const achievementContext = {
                ...xpContext,
                isFirstMessageOfDay: xpResult.xpSources && xpResult.xpSources.some(s => s.source === 'FIRST_MESSAGE_DAY'),
                streakMultiplier: xpResult.streakMultiplier || 1
            };
            this.services.achievements.checkAchievements(username, achievementContext);

            // ============================================
            // BRO PROGRESS BAR
            // ============================================
            // Si el mensaje contiene "bro", mostramos el progreso
            if (/\bbro\b/i.test(message) && this.notificationManager) {
                const stats = this.services.achievements.getUserStats(username);
                const broCount = stats.broCount || 0;

                // Hitos definidos en AchievementsData (1, 10, 20, 50, 100)
                const broMilestones = [1, 10, 20, 50, 100];

                // Encontrar el siguiente hito (el primero que sea mayor que el count actual)
                // Si broCount es 10, el siguiente es 20.
                let nextMilestone = broMilestones.find(m => m > broCount);

                // Si está justo en un hito (ej: 10), mostramos ese hito como meta cumplida por un momento
                // O mejor, mostramos el progreso hacia el siguiente.
                // Si broCount == 10, find(m > 10) retorna 20. Muestra 10/20.
                // Si el usuario quiere ver "como va ese logro", y acaba de conseguir el de 10, ver que ya va a por el de 20 es correcto.

                // Fallback para super usuarios
                if (!nextMilestone) {
                    nextMilestone = Math.ceil((broCount + 1) / 100) * 100;
                }

                EventManager.emit('user:broProgress', { current: broCount, max: nextMilestone });
            }

            // Inyectar la lista actualizada de logros en xpResult
            const latestData = this.services.xp.getUserData(username);
            xpResult.achievements = latestData.achievements || [];
        }

        if (this.managers.xpDisplay) {
            this.managers.xpDisplay.setVisible(true); // Asegurar que sea visible para usuarios normales
            this.managers.xpDisplay.updateXPDisplay(username, xpResult);
        }
    }

    // =========================================================================
    // NOTA: La lógica de notificaciones de logros ha sido extraída a 
    // NotificationManager.js para seguir el principio de Single Responsibility.
    // Ver: js/managers/NotificationManager.js
    // =========================================================================

    /**
     * Limpieza al cerrar
     */
    /**
     * Actualiza el estado del stream (Delegado desde App)
     */

    /**
     * Actualiza el estado del stream (Delegado desde App)
     */
    updateStreamStatus(isOnline) {
        // Detectar inicio de stream (offline -> online)
        if (isOnline && !this.isStreamOnline) {
            this.streamStartTime = Date.now();
            console.log('📡 MessageProcessor: Stream detected as ONLINE at', new Date(this.streamStartTime).toLocaleTimeString());
        } else if (!isOnline) {
            this.streamStartTime = null;
        }

        this.isStreamOnline = isOnline;
    }

    /**
     * Verifica si estamos en la ventana de "inicio de stream" (ej. primeros 10 min)
     * @private
     */
    _checkIsStreamStart() {
        if (!this.isStreamOnline || !this.streamStartTime) return false;
        
        const windowMs = 10 * 60 * 1000; // 10 minutos
        return (Date.now() - this.streamStartTime) < windowMs;
    }

    /**
     * Limpieza al cerrar
     */
    async destroy() {
        console.log('🛑 MessageProcessor: Shutting down...');

        // Guardar XP inmedianamente
        if (this.services.xp && this.services.xp.persistence) {
            console.log('💾 Saving XP data immediately...');
            await this.services.xp.persistence.saveImmediately();
        }

        // Limpiar recursos


        if (this.services.sessionStats) {
            this.services.sessionStats.destroy();
        }

        if (this.managers.idleDisplay) {
            this.managers.idleDisplay.stop(); // Asumiendo que tiene stop, si no, verificar
        }
        
        // Desconectar servicios
        if (this.services.streamHistory) {
            // this.services.streamHistory.stop(); // Si existe
        }
    }

    // Getters para testing access
    getService(name) { return this.services[name]; }
    getManager(name) { return this.managers[name]; }
}
