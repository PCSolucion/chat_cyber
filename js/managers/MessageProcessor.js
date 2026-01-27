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
class MessageProcessor {
    constructor(config) {
        this.config = config;
        this.services = {};
        this.managers = {};
        this.isInitialized = false;

        // NotificationManager will be initialized in init()
        this.notificationManager = null;
    }

    /**
     * Inicializa todos los servicios dependientes
     * Los errores aquí se capturan para no detener la aplicación
     */
    init() {
        console.log('⚙️ Inicializando procesador de mensajes...');

        // 1. Audio Service
        try {
            this.services.audio = new AudioService(
                this.config.AUDIO_URL,
                this.config.AUDIO_VOLUME
            );
        } catch (e) {
            console.warn('⚠️ Error initializing AudioService:', e);
        }

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

                this.services.xp = new ExperienceService(
                    this.config,
                    this.services.gist
                );

                // 4b. Achievement Service (depende de XP Service)
                this.services.achievements = new AchievementService(
                    this.config,
                    this.services.xp
                );

                // Suscribirse a eventos de logro desbloqueado
                // (Se conectará al NotificationManager después de su inicialización)
                this.services.achievements.onAchievementUnlocked((eventData) => {
                    if (this.notificationManager) {
                        this.notificationManager.showAchievement(eventData);
                    }
                });

                this.managers.xpDisplay = new XPDisplayManager(
                    this.config,
                    this.services.xp,
                    this.services.achievements
                );

                // Suscribirse a eventos de Level Up para mostrar animación y sonido
                this.services.xp.onLevelUp((eventData) => {
                    if (this.managers.xpDisplay) {
                        this.managers.xpDisplay.showLevelUp(eventData);
                    }
                });
            } catch (e) {
                console.error('⚠️ XP System initialization failed:', e);
            }
        }

        // 5. Third Party Emote Service (7TV, BTTV, FFZ)
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

            if (this.config.DEBUG) {
                console.log('📨 Processor handling:', username);
            }

            // ============================================
            // SISTEMA DE COMANDOS (!logros, !nivel)
            // ============================================
            if (this._handleCommands(message, username)) {
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
                        emoteNames.push({ name: emoteName, provider: 'twitch', url: null });
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
                this.managers.ui.displayMessage(
                    username,
                    message,
                    emotes
                );
            }

            // Proceso Audio
            if (this.services.audio) {
                this.services.audio.play();
            }

            // Trackear estadísticas de sesión (incluyendo nombres de emotes)
            if (this.services.sessionStats) {
                this.services.sessionStats.trackMessage(username, message, {
                    emoteCount,
                    emoteNames
                });
            }

            // Notificar actividad al Idle Manager
            if (this.managers.idleDisplay) {
                this.managers.idleDisplay.onActivity();
            }

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
            isStreamLive: true,
            isStreamStart: false,
            hasMention: message && message.includes('@'),
            message: message // Pasamos el mensaje crudo para análisis de palabras (ej. "bro")
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

                this.notificationManager.showBroProgress(broCount, nextMilestone);
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
     * Procesa comandos de chat (!comando)
     * @private
     * @returns {boolean} true si el comando fue procesado y debe detener el flujo normal
     */
    _handleCommands(message, username) {
        if (!message.startsWith('!')) return false;

        const command = message.toLowerCase().trim();

        if (['!logros', '!achievements'].includes(command)) {
            return this._handleAchievementsCommand(username);
        }

        if (['!nivel', '!level', '!stats'].includes(command)) {
            return this._handleLevelCommand(username);
        }

        return false;
    }

    /**
     * Maneja el comando !logros
     * @private
     */
    _handleAchievementsCommand(username) {
        if (!this.services.xp || !this.services.achievements || !this.managers.ui) return false;

        const userData = this.services.xp.getUserData(username);
        const unlockedCount = (userData.achievements || []).length;

        // Usar método getTotalAchievements si existe, sino fallback al objeto
        const totalAchievements = this.services.achievements.getTotalAchievements
            ? this.services.achievements.getTotalAchievements()
            : (this.services.achievements.achievements ? Object.keys(this.services.achievements.achievements).length : 0);

        const level = userData.level || 1;
        const title = this.services.xp.getLevelTitle(level);

        if (this.managers.xpDisplay) this.managers.xpDisplay.setVisible(false);

        const systemMsg = `@${username} -> Progreso: ${unlockedCount}/${totalAchievements} Logros | Nivel ${level} (${title})`;
        this.managers.ui.displayMessage('SYSTEM', systemMsg, {}, 99, 'system');

        return true;
    }

    /**
     * Maneja el comando !nivel
     * @private
     */
    _handleLevelCommand(username) {
        if (!this.services.xp || !this.managers.ui) return false;

        const info = this.services.xp.getUserXPInfo(username);

        if (this.managers.xpDisplay) this.managers.xpDisplay.setVisible(false);

        const systemMsg = `@${username} -> Nivel ${info.level} | ${info.title} | XP: ${Math.floor(info.progress.xpInCurrentLevel)}/${info.progress.xpNeededForNext}`;
        this.managers.ui.displayMessage('SYSTEM', systemMsg, {}, 99, 'system');

        return true;
    }

    /**
     * Actualiza el estado del stream (Delegado desde App)
     */
    updateStreamStatus(isOnline) {
        if (this.services.sessionStats) {
            this.services.sessionStats.setStreamStatus(isOnline);
        }
    }

    async save() {
        if (this.services.xp) {
            console.log('💾 Saving XP data...');
            await this.services.xp.saveData(true);
        }
        if (this.services.audio) {
            this.services.audio.stop();
        }
    }

    // Getters para testing access
    getService(name) { return this.services[name]; }
    getManager(name) { return this.managers[name]; }
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageProcessor;
}
