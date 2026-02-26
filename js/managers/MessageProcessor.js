import MessagePipeline from './pipeline/MessagePipeline.js';
import RankingSystem from '../services/RankingSystem.js';
import FirestoreService from '../services/FirestoreService.js';
import StreamHistoryService from '../services/StreamHistoryService.js';
import ExperienceService from '../services/ExperienceService.js';
import AchievementService from '../services/AchievementService.js';
import ThirdPartyEmoteService from '../services/ThirdPartyEmoteService.js';
import SessionStatsService from '../services/SessionStatsService.js';
import WatchTimeService from '../services/WatchTimeService.js';
import UserStateManager from '../services/UserStateManager.js';
import LevelCalculator from '../services/LevelCalculator.js';
import SpamFilterService from '../services/SpamFilterService.js';

// Middlewares
import BlacklistMiddleware from './pipeline/middlewares/BlacklistMiddleware.js';
import LanguageFilterMiddleware from './pipeline/middlewares/LanguageFilterMiddleware.js';
import SpamFilterMiddleware from './pipeline/middlewares/SpamFilterMiddleware.js';
import EmoteParserMiddleware from './pipeline/middlewares/EmoteParserMiddleware.js';
import CommandFilterMiddleware from './pipeline/middlewares/CommandFilterMiddleware.js';
import XPProcessorMiddleware from './pipeline/middlewares/XPProcessorMiddleware.js';
import AchievementMiddleware from './pipeline/middlewares/AchievementMiddleware.js';
import UIRendererMiddleware from './pipeline/middlewares/UIRendererMiddleware.js';
import StatsTrackerMiddleware from './pipeline/middlewares/StatsTrackerMiddleware.js';
import UserLoaderMiddleware from './pipeline/middlewares/UserLoaderMiddleware.js';

// Storage Management (Strategy Pattern)
import StorageManager from './storage/StorageManager.js';
import FirestoreStorageProvider from './storage/FirestoreStorageProvider.js';
import LocalStorageProvider from './storage/LocalStorageProvider.js';

import XPDisplayManager from './XPDisplayManager.js';
import UIManager from './UIManager.js';
import IdleDisplayManager from './IdleDisplayManager.js';
import NotificationManager from './NotificationManager.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import { TIMING } from '../constants/AppConstants.js';
import Logger from '../utils/Logger.js';

/**
 * MessageProcessor - Orquestador central de la lógica de mensajes
 * 
 * REFACTORIZADO: Ahora utiliza un patrón de Pipeline con Middlewares para 
 * procesar los mensajes de forma desacoplada y eficiente.
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

        this.notificationManager = null;
        
        // Nueva tubería de procesamiento
        this.pipeline = new MessagePipeline();

        // Nuevo Gestor de Almacenamiento (Strategy Pattern)
        this.storageManager = new StorageManager();
    }

    /**
     * Inicializa todos los servicios y configura la tubería de mensajes
     */
    async init() {
        Logger.info('App', '⚙️ Inicializando procesador de mensajes...');

        // 1. Inicializar Servicios Base
        await this._initServices();
        
        // 2. Inicializar Managers Base
        this._initManagers();

        // 3. Configurar la Tubería (Middleware Pipeline)
        this._setupPipeline();

        this.isInitialized = true;
    }

    /**
     * Inicialización de servicios (Separado para limpieza)
     * @private
     */
    async _initServices() {
        try {
            this.services.ranking = new RankingSystem(this.config);
            
            // PROTOCOLO "CLOUD ONLY": Solo Firestore
            // Eliminamos LocalStorage para evitar datos corruptos entre pestañas.
            if (!this.config.TEST_MODE) {
                this.services.firestore = new FirestoreService(this.config);
                // CRÍTICO: Esperar a que Firestore esté configurado antes de seguir
                await this.services.firestore.configure(this.config.FIREBASE);
                
                this.storageManager.addProvider(new FirestoreStorageProvider(this.services.firestore));
                Logger.info('App', '☁️ Persistence: CLOUD ONLY MODE (Firestore)');
            } else {
                Logger.warn('App', '🧪 MODO TEST: Usando LocalStorage (Firestore desactivado)');
                this.storageManager.addProvider(new LocalStorageProvider());
            }

            await this.storageManager.init();


            if (this.config.XP_SYSTEM_ENABLED) {
                // Instancia compartida de LevelCalculator (Single Source of Truth)
                const levelCalculator = new LevelCalculator();

                // Nuevo Gestor de Estado Centralizado usando el StorageManager (Strategy)
                this.services.stateManager = new UserStateManager(this.config, this.storageManager);
                await this.services.stateManager.init(); // [FIX] Inicializar para configurar Firestore interno
                
                // Inyectar servicios en RankingSystem
                this.services.ranking.setStateManager(this.services.stateManager);
                this.services.ranking.setLevelCalculator(levelCalculator);

                this.services.streamHistory = new StreamHistoryService(this.config, this.storageManager);
                await this.services.streamHistory.init().catch(e => console.error(e));
                
                // Inyectar stateManager y el calculator compartido
                this.services.xp = new ExperienceService(this.config, this.services.stateManager, levelCalculator);

                this.services.achievements = new AchievementService(this.config, this.services.xp, this.services.stateManager);
            }

            if (this.config.THIRD_PARTY_EMOTES_ENABLED) {
                this.services.thirdPartyEmotes = new ThirdPartyEmoteService(this.config);
            }

            this.services.sessionStats = new SessionStatsService(this.config, this.services.xp, this.services.achievements, this.services.stateManager);
            
            // Inicializar WatchTimeService (Requiere TwitchService inyectado después)
            this.services.watchTime = new WatchTimeService(this.config, this.services.xp, this.services.sessionStats);

            // Anti-Spam Shield (Inyectando config)
            this.services.spamFilter = new SpamFilterService(this.config);
            
            EventManager.on(EVENTS.STREAM.STATUS_CHANGED, (isOnline) => this.updateStreamStatus(isOnline));
        } catch (e) {
            Logger.error('App', 'Error initializing Services:', e);
        }
    }

    /**
     * Inicialización de managers (Separado para limpieza)
     * @private
     */
    _initManagers() {
        try {
            if (this.services.xp) {
                this.managers.xpDisplay = new XPDisplayManager(this.config, this.services.xp, this.services.achievements);
            }

            this.managers.ui = new UIManager(this.config, this.services.ranking, this.services.xp, this.services.thirdPartyEmotes, this.managers.xpDisplay);
            this.managers.idleDisplay = new IdleDisplayManager(this.config, this.services.sessionStats, this.managers.ui);
            this.notificationManager = new NotificationManager(this.config, this.managers.ui);
            this.managers.notification = this.notificationManager;
        } catch (e) {
            Logger.error('App', 'Error initializing Managers:', e);
        }
    }

    /**
     * Configura el orden de procesamiento de los mensajes con los nuevos middlewares independientes
     * @private
     */
    _setupPipeline() {
        // Instanciar middlewares
        const blacklist = new BlacklistMiddleware(this.config);
        const languageFilter = new LanguageFilterMiddleware(this.config);
        const spamFilter = new SpamFilterMiddleware(this.services.spamFilter);
        const emoteParser = new EmoteParserMiddleware(this.services.thirdPartyEmotes);
        const userLoader = new UserLoaderMiddleware(this.services.stateManager);
        const commandFilter = new CommandFilterMiddleware();
        const xpProcessor = new XPProcessorMiddleware(
            this.services.xp, 
            this.managers.xpDisplay,
            () => this.isStreamOnline,
            () => this._checkIsStreamStart()
        );
        const achievementChecker = new AchievementMiddleware(this.services.achievements, this.services.xp);
        const uiRenderer = new UIRendererMiddleware(this.managers.ui, this.services.xp);
        const statsTracker = new StatsTrackerMiddleware(this.services.sessionStats);

        // Configurar la Tubería
        this.pipeline
            .use('Blacklist', blacklist.execute.bind(blacklist))
            .use('LanguageFilter', languageFilter.execute.bind(languageFilter))
            .use('SpamFilter', spamFilter.execute.bind(spamFilter))
            .use('EmoteParser', emoteParser.execute.bind(emoteParser))
            .use('UserLoader', userLoader.execute.bind(userLoader))
            .use('CommandFilter', commandFilter.execute.bind(commandFilter))
            .use('XPProcessor', xpProcessor.execute.bind(xpProcessor))
            .use('AchievementChecker', achievementChecker.execute.bind(achievementChecker))
            .use('UIRenderer', uiRenderer.execute.bind(uiRenderer))
            .use('StatsTracker', statsTracker.execute.bind(statsTracker));
    }

    // =========================================================================
    // MÉTODOS AUXILIARES
    // =========================================================================

    /**
     * Punto de entrada principal para mensajes entrantes
     */
    async process(tags, message) {
        if (!this.isInitialized) return;

        const context = {
            tags,
            message,
            userId: tags['user-id'], // El ID numérico de Twitch
            username: tags['display-name'] || tags.username,
            timestamp: Date.now()
        };

        // Emitir evento global de recibido (para sistemas externos)
        EventManager.emit(EVENTS.CHAT.MESSAGE_RECEIVED, { 
            username: context.username, 
            message, 
            tags 
        });

        // Lanzar la tubería y esperar a que termine (Evitar race conditions)
        await this.pipeline.run(context);
    }



    /**
     * Carga datos asíncronos (Rankings, XP, Emotes de terceros)
     */
    async loadAsyncData() {
        // 1. Cargar datos XP primero (los rankings dependen de esto)
        if (this.services.xp) {
            await this.services.xp.loadData().catch(e => console.error(e));

            if (this.services.firestore?.isConfigured) {
                this.services.firestore.testConnection().then(conn => {
                    Logger.info('XP', conn ? '✅ Firestore connected' : '⚠️ Local mode only');
                });
            }
        }

        // 2. Calcular rankings dinámicos desde los datos cargados
        if (this.services.ranking) {
            await this.services.ranking.loadRankings().catch(e => console.error(e));
            
            // Actualizar estadísticas de ranking en XP service
            if (this.services.xp && this.services.ranking.isLoaded) {
                 this.services.ranking.updateRankingStats(this.services.ranking.userRankings, true);
            }
        }

        if (this.services.thirdPartyEmotes) {
            await this.services.thirdPartyEmotes.loadEmotes().catch(e => console.warn(e));
        }

        if (this.managers.idleDisplay) this.managers.idleDisplay.start();

        return {
            rankedUsers: this.services.ranking?.getTotalRankedUsers() || 0,
            xpEnabled: !!this.services.xp,
            thirdPartyEmotes: this.services.thirdPartyEmotes?.getStats() || null
        };
    }

    updateStreamStatus(isOnline) {
        if (isOnline && !this.isStreamOnline) {
            this.streamStartTime = Date.now();
            Logger.info('Stream', `Online at ${new Date(this.streamStartTime).toLocaleTimeString()}`);
        } else if (!isOnline) {
            this.streamStartTime = null;
        }
        this.isStreamOnline = isOnline;

        // Notificar a WatchTimeService
        if (this.services.watchTime) {
            this.services.watchTime.updateStreamStatus(isOnline);
        }
    }

    _checkIsStreamStart() {
        if (!this.isStreamOnline || !this.streamStartTime) return false;
        return (Date.now() - this.streamStartTime) < TIMING.STREAM_START_WINDOW_MS;
    }

    async destroy() {
        Logger.info('App', '🛑 MessageProcessor: Shutting down...');
        
        // 1. Guardar estado final
        if (this.services.stateManager) await this.services.stateManager.saveImmediately();
        
        // 2. Destruir Managers (Limpiar eventos y UI)
        if (this.managers.xpDisplay) this.managers.xpDisplay.destroy();
        if (this.managers.ui) this.managers.ui.destroy();
        if (this.managers.idleDisplay) this.managers.idleDisplay.stop();
        if (this.notificationManager) this.notificationManager.destroy();

        // 3. Detener Servicios
        if (this.services.sessionStats) this.services.sessionStats.destroy();
        if (this.services.watchTime) this.services.watchTime.stop();
        if (this.services.spamFilter) this.services.spamFilter.destroy();
    }

    getService(name) { return this.services[name]; }
    getManager(name) { return this.managers[name]; }

    /**
     * Inyecta el servicio de Twitch después de la inicialización de la app
     * @param {TwitchService} twitchService 
     */
    setTwitchService(twitchService) {
        this.services.twitch = twitchService;
        if (this.services.xp) {
            this.services.xp.setTwitchService(twitchService);
        }
        if (this.services.watchTime) {
            this.services.watchTime.setTwitchService(twitchService);
        }
    }
}
