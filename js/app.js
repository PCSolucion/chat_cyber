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
import StreamMonitorService from './services/StreamMonitorService.js';

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

        // 3. Inicializar Monitor de Stream
        if (this.twitchService) {
            this.streamMonitor = new StreamMonitorService(this.config, this.twitchService);
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
            
            // Inyectar TwitchService en el processor para WatchTimeService
            if (this.processor) {
                this.processor.setTwitchService(this.twitchService);
            }

            this.twitchService.connect();
        }

        // Iniciar ciclo de monitoreo centralizado
        if (this.streamMonitor) {
            this.streamMonitor.start();
        }
    }



    /**
     * Handler principal de mensajes
     */
    onMessageReceived(tags, message) {
        if (!this.processor) return;
        this.processor.process(tags, message);
    }




    async destroy() {
        console.log('🛑 Shutting down...');
        if (this.streamMonitor) this.streamMonitor.stop();
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
