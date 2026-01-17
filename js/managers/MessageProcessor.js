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
    }

    /**
     * Inicializa todos los servicios dependientes
     * Los errores aquí se capturan para no detener la aplicación
     */
    init() {
        console.log('⚙️ Inicializando procesador de mensajes...');

        // 1. Data Service
        try {
            this.services.data = new DataService(
                this.config,
                typeof teams !== 'undefined' ? teams : {},
                typeof userNumbers !== 'undefined' ? userNumbers : {},
                typeof userTeams !== 'undefined' ? userTeams : {}
            );
        } catch (e) {
            console.error('❌ Error initializing DataService:', e);
        }

        // 2. Audio Service
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
                this.services.achievements.onAchievementUnlocked((eventData) => {
                    this._showAchievementNotification(eventData);
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

        // 5. UI Manager
        try {
            this.managers.ui = new UIManager(
                this.config,
                this.services.ranking,
                this.services.xp
            );
        } catch (e) {
            console.error('❌ CRITICAL: UIManager initialization failed:', e);
        }

        this.isInitialized = true;
    }

    /**
     * Carga datos asíncronos (Rankings, XP)
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

        return {
            rankedUsers: this.services.ranking ? this.services.ranking.getTotalRankedUsers() : 0,
            xpEnabled: !!this.services.xp
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

            // Datos auxiliares
            let userNumber = 0;
            let team = null;
            if (this.services.data) {
                userNumber = this.services.data.getUserNumber(username);
                team = this.services.data.getUserTeam(username);
            }

            // Proceso XP (Aislado)
            if (this.services.xp) {
                try {
                    this._processXP(username, message, emotes);
                } catch (e) {
                    console.error('⚠️ XP Processing error:', e);
                }
            }

            // Proceso UI
            if (this.managers.ui) {
                this.managers.ui.displayMessage(
                    username,
                    message,
                    emotes,
                    userNumber,
                    team
                );
            }

            // Proceso Audio
            if (this.services.audio) {
                this.services.audio.play();
            }

        } catch (e) {
            console.error('❌ Error processing message:', e);
        }
    }

    /**
     * Lógica interna de XP
     * @private
     */
    _processXP(username, message, emotes) {
        let emoteCount = 0;
        if (emotes) {
            Object.values(emotes).forEach(positions => {
                emoteCount += positions.length;
            });
        }

        const xpContext = {
            hasEmotes: emoteCount > 0,
            emoteCount: emoteCount,
            isStreamLive: true,
            isStreamStart: false,
            hasMention: message && message.includes('@')
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

            // Inyectar la lista actualizada de logros en xpResult
            const latestData = this.services.xp.getUserData(username);
            xpResult.achievements = latestData.achievements || [];
        }

        if (this.managers.xpDisplay) {
            this.managers.xpDisplay.updateXPDisplay(username, xpResult);
        }
    }
    /**
     * Cola de notificaciones de logros
     * Para evitar que aparezcan muchos a la vez
     */
    _achievementQueue = [];
    _isShowingAchievement = false;

    /**
     * Añade un logro a la cola de notificaciones
     * @private
     * @param {Object} eventData - Datos del evento
     */
    _showAchievementNotification(eventData) {
        // Limitar cola a 5 logros máximo
        if (this._achievementQueue.length >= 5) {
            if (this.config.DEBUG) {
                console.log(`🏆 Cola llena, logro descartado: ${eventData.achievement.name}`);
            }
            return;
        }

        this._achievementQueue.push(eventData);
        this._processAchievementQueue();
    }

    /**
     * Procesa la cola de logros uno a uno
     * @private
     */
    _processAchievementQueue() {
        if (this._isShowingAchievement || this._achievementQueue.length === 0) {
            return;
        }

        this._isShowingAchievement = true;
        const eventData = this._achievementQueue.shift();

        this._displayAchievementNotification(eventData);

        // Esperar a que termine la animación (7s visible + 0.5s fade out)
        setTimeout(() => {
            this._isShowingAchievement = false;
            this._processAchievementQueue();
        }, 7500);
    }

    /**
     * Muestra físicamente la notificación de logro
     * @private
     * @param {Object} eventData - Datos del evento
     */
    _displayAchievementNotification(eventData) {
        const { username, achievement } = eventData;
        const container = document.getElementById('achievement-notifications');

        if (!container) {
            console.warn('Achievement notifications container not found');
            return;
        }

        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.setAttribute('data-rarity', achievement.rarity);

        notification.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-content">
                <div class="achievement-label">🏆 LOGRO DESBLOQUEADO</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
            <div class="achievement-timer"></div>
        `;

        // Añadir al container
        container.appendChild(notification);

        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Remover después de 7 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            notification.classList.add('hiding');

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 7000);

        // Reproducir sonido de logro con 2 segundos de retraso
        // Para evitar solapamiento con el sonido del mensaje
        setTimeout(() => {
            try {
                const audio = new Audio('logro.mp3'); // Asegúrate de tener este archivo
                audio.volume = this.config.AUDIO_VOLUME || 0.5;
                audio.play().catch(e => {
                    if (this.config.DEBUG) console.warn('Audio logro.mp3 no encontrado o bloqueado', e);
                });
            } catch (e) {
                console.warn('Error audio:', e);
            }
        }, 2000);

        // Log para debug
        if (this.config.DEBUG) {
            console.log(`🏆 Achievement notification shown: ${username} -> ${achievement.name}`);
        }
    }

    /**
     * Limpieza al cerrar
     */
    async destroy() {
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
