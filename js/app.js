import CONFIG from './config.js';
import MessageProcessor from './managers/MessageProcessor.js';
import TwitchService from './services/TwitchService.js';
import DevTools from './utils/DevTools.js';

/**
 * App - Bootstrapper de la Aplicación
 */
class App {
    constructor() {
        this.config = CONFIG;
        console.log('🚀 Booting Twitch Chat Overlay...');

        // 1. Instanciar Message Processor
        this.processor = null;
        try {
            this.processor = new MessageProcessor(this.config);
            this.processor.init();
        } catch (e) {
            console.error('❌ FATAL: MessageProcessor failed to initialize.', e);
        }

        // 2. Instanciar Twitch Service
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

        // Iniciar servicios secundarios
        this.startStreamCategoryUpdate();
        this.startWatchTimeTracker();
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
        // Variable para controlar el timer
        this.categoryTimer = null;

        const updateMetadata = async () => {
            if (!this.twitchService) return;

            // 1. Obtener Categoría (Juego)
            const category = await this.twitchService.fetchChannelCategory();

            // 2. Obtener Estado (Online/Offline)
            const isOnline = await this.twitchService.fetchStreamStatus();

            if (this.processor) {
                const uiManager = this.processor.getManager('ui');
                if (uiManager) {
                    // Actualizar UI
                    if (category) uiManager.updateStreamCategory(category);
                    uiManager.updateSystemStatus(isOnline);
                }

                // Actualizar categoría y estado en AchievementService
                const achievementService = this.processor.getService('achievements');
                if (achievementService) {
                    if (category) achievementService.setStreamCategory(category);
                    achievementService.setStreamStatus(isOnline);
                }

                // Actualizar lógica de sesión
                this.processor.updateStreamStatus(isOnline);
            }

            // Calcular próximo intervalo
            // Offline -> 1 minuto (60000ms)
            // Online -> 10 minutos (600000ms)
            const nextInterval = isOnline ? 600000 : 60000;

            // Programar siguiente ejecución
            if (this.categoryTimer) clearTimeout(this.categoryTimer);
            this.categoryTimer = setTimeout(updateMetadata, nextInterval);
        };

        // Primera llamada inmediata (con un pequeño delay para asegurar carga de UI)
        this.categoryTimer = setTimeout(updateMetadata, 2000);
    }

    /**
     * Inicia el tracker de tiempo de visualización
     * - Obtiene lista de espectadores cada 10 minutos
     * - Asigna 10 minutos de watchtime y 5 XP pasivos
     */
    startWatchTimeTracker() {
        const INTERVAL_MS = 600000; // 10 minutos

        const trackTime = async () => {
            if (!this.twitchService || !this.processor) return;

            // Verificar estado del stream (opcional, pero recomendado solo trackear si está online)
            // Usamos el estado del processor si está disponible
            const isOnline = this.processor.isStreamOnline;
            // Si no tenemos estado fidedigno, asumimos true para pruebas o consultamos servicio
            // Para evitar problemas de CORS/API en local, permitimos trackeo siempre si config lo permite
            // pero idealmente solo si isOnline.

            // if (!isOnline) return; 

            console.log('⏱️ Iniciando ciclo de Watch Time Tracker...');

            try {
                // 1. Obtener lista de chatters
                const chatters = await this.twitchService.fetchChatters();

                if (!chatters || chatters.length === 0) {
                    console.log('⏱️ No se encontraron chatters o API falló silenciosamente.');
                    return;
                }

                console.log(`⏱️ Procesando Watch Time para ${chatters.length} usuarios...`);

                // 2. Procesar usuarios (Batch)
                // Acceso directo a servicios (MessageProcessor no tiene getService)
                const xpService = this.processor.services ? this.processor.services.xp : null;
                const sessionStats = this.processor.services ? this.processor.services.sessionStats : null;

                if (!xpService) return;

                // ACTUALIZACIÓN DE BATCH
                // Usamos 10 minutos hardcoded porque el intervalo es de 10 minutos (INTERVAL_MS)
                xpService.addWatchTimeBatch(chatters, 10);
                
                if (sessionStats) {
                    sessionStats.trackSessionWatchTimeBatch(chatters, 10);
                }

                const processed = chatters.length;

                console.log(`✅ Watch Time asignado a ${processed} usuarios.`);

            } catch (error) {
                console.error('❌ Error en Watch Time Tracker:', error);
            }
        };

        // Iniciar ciclo
        this.watchTimeInterval = setInterval(trackTime, INTERVAL_MS);

        // Ejecución inicial diferida (10s) para dar tiempo a conectar y poblar lista
        setTimeout(trackTime, 10000);
    }

    async destroy() {
        console.log('🛑 Shutting down...');
        if (this.categoryTimer) clearTimeout(this.categoryTimer);
        if (this.categoryInterval) clearInterval(this.categoryInterval);
        if (this.watchTimeInterval) clearInterval(this.watchTimeInterval);
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
