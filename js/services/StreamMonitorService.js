import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import { TIMING } from '../constants/AppConstants.js';
import Logger from '../utils/Logger.js';

/**
 * StreamMonitorService - Centraliza el monitoreo del estado del stream
 * 
 * Responsabilidades:
 * - Consultar periódicamente si el stream está online y su categoría
 * - Gestionar los intervalos de forma inteligente (más frecuente si está offline)
 * - Emitir eventos globales para que otros servicios reaccionen
 */
export default class StreamMonitorService {
    constructor(config, twitchService) {
        this.config = config;
        this.twitchService = twitchService;
        this.timer = null;
        this.isStreamOnline = false;
        this.currentCategory = null;
    }

    /**
     * Inicia el proceso de monitoreo
     */
    start() {
        if (this.timer) return;
        Logger.info('StreamMonitor', '🚀 Iniciando monitoreo centralizado del stream...');
        this._check();
    }

    /**
     * Detiene el monitoreo
     */
    stop() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    /**
     * Ejecuta una comprobación y programa la siguiente
     * @private
     */
    async _check() {
        try {
            // 1. Obtener estado, categoría y título en paralelo
            const [isOnline, category, title] = await Promise.all([
                this.twitchService.fetchStreamStatus(),
                this.twitchService.fetchChannelCategory(),
                this.twitchService.fetchStreamTitle()
            ]);

            // 2. Detectar cambios y notificar
            if (isOnline !== this.isStreamOnline) {
                this.isStreamOnline = isOnline;
                Logger.info('StreamMonitor', `Estado del stream cambiado: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
                EventManager.emit(EVENTS.STREAM.STATUS_CHANGED, isOnline);
            }

            if (category && category !== this.currentCategory) {
                this.currentCategory = category;
                Logger.info('StreamMonitor', `Nueva categoría detectada: ${category}`);
                EventManager.emit(EVENTS.STREAM.CATEGORY_UPDATED, category);
            }

            if (title && title !== this.currentTitle) {
                this.currentTitle = title;
                EventManager.emit('stream:titleUpdated', title);
            }

            // 3. Programar siguiente check basado en el estado
            const interval = isOnline ? 
                TIMING.METADATA_CHECK_ONLINE_MS : 
                TIMING.METADATA_CHECK_OFFLINE_MS;

            this.timer = setTimeout(() => this._check(), interval);

        } catch (error) {
            Logger.error('StreamMonitor', 'Error en el ciclo de monitoreo:', error);
            // Reintentar tras un delay de seguridad si falla
            this.timer = setTimeout(() => this._check(), TIMING.METADATA_CHECK_OFFLINE_MS);
        }
    }

    /**
     * Forzar una actualización inmediata
     */
    async refresh() {
        if (this.timer) clearTimeout(this.timer);
        await this._check();
    }
}
