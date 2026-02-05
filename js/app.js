import CONFIG from './config.js';
import { TIMING } from './constants/AppConstants.js';
import MessageProcessor from './managers/MessageProcessor.js';
import TwitchService from './services/TwitchService.js';
import DevTools from './utils/DevTools.js';
import ConfigValidator from './utils/ConfigValidator.js';
import EventManager from './utils/EventEmitter.js';
import { EVENTS } from './utils/EventTypes.js';
import Logger from './utils/Logger.js';
import { ALL_COMMANDS } from './commands/index.js';
import CommandManager from './managers/CommandManager.js';
import AudioManager from './managers/AudioManager.js';

/**
 * App - Bootstrapper de la Aplicación
 */
class App {
    constructor() {
        // 0. Validar integridad de la configuración
        this.config = ConfigValidator.validate(CONFIG);
        
        // 1. Inicializar Logger
        Logger.init(this.config);
        Logger.info('App', '🚀 Booting Twitch Chat Overlay...');

        // 1. Instanciar Message Processor
        this.processor = null;
        try {
            this.processor = new MessageProcessor(this.config);
            this.processor.init();
        } catch (e) {
            Logger.error('App', 'FATAL: MessageProcessor failed to initialize.', e);
        }

        // Inicializar AudioManager
        this.audioManager = new AudioManager(this.config);
        this.audioManager.init();

        // Inicializar CommandManager después de que processor haya creado los servicios base
        if (this.processor && this.processor.services) {
            this.commandManager = new CommandManager(this.processor.services, this.config);
            this.commandManager.registerAll(ALL_COMMANDS);
        }

        // 2. Instanciar Twitch Service
        this.twitchService = null;
        try {
            this.twitchService = new TwitchService(
                this.config.TWITCH_CHANNEL,
                (tags, msg) => this.onMessageReceived(tags, msg)
            );
        } catch (e) {
            Logger.error('App', 'FATAL: TwitchService creation failed.', e);
        }
    }

    /**
     * Inicialización asíncrona
     */
    async init() {
        this.isStreamOnline = false;
        this.watchTimeInterval = null;

        // Cargar datos del processor
        if (this.processor) {
            try {
                await this.processor.loadAsyncData();
            } catch (e) {
                console.error('⚠️ App Logic load warning:', e);
            }
        }

        // Inyectar herramientas de desarrollo si DEBUG está activo
        if (this.config.DEBUG) {
            const devTools = new DevTools(this);
            devTools.init();
        }

        // Conectar a Twitch
        if (this.twitchService) {
            console.log('📡 Connecting to Twitch...');
            this.twitchService.connect();
        }

        // Iniciar ciclo de actualización de metadatos (Este manejará el WatchTimeTracker)
        this.startStreamCategoryUpdate();
    }

    /**
     * Handler principal de mensajes
     */
    onMessageReceived(tags, message) {
        if (!this.processor) return;
        this.processor.process(tags, message);
    }

    /**
     * Inicia el ciclo de actualización de categoría y estado del stream
     * - OFFLINE: Comprueba cada 1 min para detectar inicio rápido
     * - ONLINE: Comprueba cada 10 min para reducir carga
     */
    startStreamCategoryUpdate() {
        this.categoryTimer = null;

        const updateMetadata = async () => {
            if (!this.twitchService) return;

            // 1. Obtener Categoría y Estado
            const category = await this.twitchService.fetchChannelCategory();
            const isOnline = await this.twitchService.fetchStreamStatus();

            // Detectar cambio de estado
            const statusChanged = isOnline !== this.isStreamOnline;
            this.isStreamOnline = isOnline;

            // EventManager ya notifica a los componentes interesados (Processor, UI, Achievements)
            if (statusChanged) {
                EventManager.emit(EVENTS.STREAM.STATUS_CHANGED, isOnline);
            }

            if (category) {
                EventManager.emit(EVENTS.STREAM.CATEGORY_UPDATED, category);
            }

            // GESTIÓN DINÁMICA DEL WATCH TIME TRACKER
            if (isOnline) {
                if (!this.watchTimeInterval) {
                    console.log('📡 Stream is ONLINE. Starting Watch Time Tracker...');
                    this.startWatchTimeTracker();
                }
            } else {
                if (this.watchTimeInterval) {
                    console.log('📡 Stream is OFFLINE. Stopping Watch Time Tracker...');
                    this.stopWatchTimeTracker();
                }
            }

            // Próximo intervalo
            const nextInterval = isOnline ? TIMING.METADATA_CHECK_ONLINE_MS : TIMING.METADATA_CHECK_OFFLINE_MS;
            if (this.categoryTimer) clearTimeout(this.categoryTimer);
            this.categoryTimer = setTimeout(updateMetadata, nextInterval);
        };

        this.categoryTimer = setTimeout(updateMetadata, 2000);
    }

    /**
     * Inicia el tracker de tiempo de visualización
     */
    startWatchTimeTracker() {
        if (this.watchTimeInterval) return;

        const INTERVAL_MS = TIMING.WATCH_TIME_INTERVAL_MS; // 10 minutos

        const trackTime = async () => {
            if (!this.twitchService || !this.processor || !this.isStreamOnline) return;

            console.log('⏱️ Watch Time Tracker: Ejecutando ciclo...');

            try {
                const chatters = await this.twitchService.fetchChatters();
                if (!chatters || chatters.length === 0) return;

                const xpService = this.processor.services ? this.processor.services.xp : null;
                const sessionStats = this.processor.services ? this.processor.services.sessionStats : null;

                if (xpService) {
                    xpService.addWatchTimeBatch(chatters, 10);
                }
                
                if (sessionStats) {
                    sessionStats.trackSessionWatchTimeBatch(chatters, 10);
                }

                console.log(`✅ Watch Time asignado a ${chatters.length} usuarios.`);
            } catch (error) {
                console.error('❌ Error en Watch Time Tracker:', error);
            }
        };

        this.watchTimeInterval = setInterval(trackTime, INTERVAL_MS);
        
        // Ejecución inicial diferida
        setTimeout(trackTime, TIMING.WATCH_TIME_INITIAL_DELAY_MS);
    }

    /**
     * Detiene el tracker de tiempo
     */
    stopWatchTimeTracker() {
        if (this.watchTimeInterval) {
            clearInterval(this.watchTimeInterval);
            this.watchTimeInterval = null;
        }
    }

    async destroy() {
        console.log('🛑 Shutting down...');
        if (this.categoryTimer) clearTimeout(this.categoryTimer);
        this.stopWatchTimeTracker();
        if (this.processor) await this.processor.destroy();
        if (this.twitchService) this.twitchService.disconnect();
    }
}

// Inicialización Global
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
    window.addEventListener('beforeunload', () => app.destroy());
    
    // Expose app instance for debugging if needed
    window.APP_INSTANCE = app;
});
