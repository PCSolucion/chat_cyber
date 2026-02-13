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
        
        // DETECCIÓN DE MODO TEST (Panel de Pruebas Offline)
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'test') {
            console.warn('🧪 MODO TEST ACTIVO: Firestore DESACTIVADO (Solo IndexedDB/Local)');
            this.config.TEST_MODE = true;
            this.config.FIREBASE = null; // Anular config de Firebase para asegurar desconexión
        }

        // 1. Inicializar Logger
        Logger.init(this.config);
        Logger.info('App', '🚀 Booting Twitch Chat Overlay...');

        // 1. Instanciar Message Processor (Sin inicializar aún)
        this.processor = null;
        try {
            this.processor = new MessageProcessor(this.config);
        } catch (e) {
            Logger.error('App', 'FATAL: MessageProcessor creation failed.', e);
        }

        // Inicializar AudioManager
        this.audioManager = new AudioManager(this.config);
        this.audioManager.init();

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

        // 1. Inicializar Processor asíncronamente (incluye StorageManager)
        if (this.processor) {
            try {
                await this.processor.init();
                
                // Inicializar CommandManager después de que processor haya creado los servicios base
                if (this.processor.services) {
                    this.commandManager = new CommandManager(this.processor.services, this.config);
                    this.commandManager.registerAll(ALL_COMMANDS);
                }

                // Cargar datos del processor (XP, Rankings, etc.)
                await this.processor.loadAsyncData();
            } catch (e) {
                Logger.error('App', 'Error during Processor initialization:', e);
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

        // Notificar que el widget está listo (para Test Panel)
        window.dispatchEvent(new CustomEvent('widget-ready'));
        console.log('✅ Widget Initialization Complete');
    }



    /**
     * Handler principal de mensajes
     */
    onMessageReceived(tags, message) {
        const username = tags['display-name'] || tags.username;
        if (!username) {
             console.error('[App] ❌ FATAL: Mensaje recibido sin usuario:', tags);
             return;
        }

        console.log(`[App DEBUG] 📨 PROCESANDO: '${username}' (Raw: ${tags.username})`);
        
        // [DEBUG] Comando de emergencia para probar Firestore directamente
        if (message.startsWith('!debugfire')) {
            console.log('🔥 EJECUTANDO DEBUG FIRESTORE MANUAL');
            const targetUser = message.split(' ')[1] || username;
            
            if (this.processor && this.processor.services && this.processor.services.stateManager) {
                const firestore = this.processor.services.stateManager.firestore;
                if (firestore) {
                    firestore.getUser(targetUser).then(u => {
                        console.log('🔥 [RESULTADO DEBUG] Usuario:', u);
                        console.log('LEVEL:', u ? u.level : 'NULL');
                    }).catch(e => console.error('🔥 [ERROR DEBUG]', e));
                } else {
                    console.error('🔥 Firestore Service no disponible');
                }
            }
            return;
        }

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
