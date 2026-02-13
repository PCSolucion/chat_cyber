import Logger from '../utils/Logger.js';
import { TIMING } from '../constants/AppConstants.js';

/**
 * WatchTimeService - Gestiona la asignación de XP por tiempo de visualización
 * 
 * Responsabilidades:
 * - Consultar periódicamente la lista de chatters activos de Twitch
 * - Asignar tiempo y XP en batch a ExperienceService
 * - Registrar estadísticas de sesión en SessionStatsService
 * - Iniciar/Detener el rastreo según el estado del stream (Online/Offline)
 */
export default class WatchTimeService {
    /**
     * @param {Object} config - Configuración de la app
     * @param {ExperienceService} xpService - Servicio de XP
     * @param {SessionStatsService} sessionStatsService - Servicio de estadísticas de sesión
     */
    constructor(config, xpService, sessionStatsService) {
        this.config = config;
        this.xpService = xpService;
        this.sessionStatsService = sessionStatsService;
        this.twitchService = null;
        
        this.watchTimeInterval = null;
        this.isStreamOnline = false;
        
        // Configuración de tiempos (10 minutos por defecto definido en AppConstants)
        this.intervalMs = TIMING.WATCH_TIME_INTERVAL_MS || 600000;
        
        // Calculamos cuántos minutos representa cada ciclo para los servicios (ej: 10m)
        this.minutesPerCycle = Math.floor(this.intervalMs / 60000);
    }

    /**
     * Setea el servicio de Twitch (Inyectado después de la creación)
     * @param {TwitchService} twitchService 
     */
    setTwitchService(twitchService) {
        this.twitchService = twitchService;
    }

    /**
     * Inicia el ciclo de seguimiento
     */
    start() {
        if (this.watchTimeInterval) return;
        
        Logger.info('WatchTime', '🚀 Iniciando tracker de tiempo de visualización...');
        
        // Programar ciclo recurrente
        this.watchTimeInterval = setInterval(() => this._performTrackCycle(), this.intervalMs);
        
        // Ejecución inicial con retraso de seguridad (evita ráfagas al arrancar)
        // Eliminamos ejecución inicial inmediata para evitar regalar 30m de XP al segundo 1
        // setTimeout(() => this._performTrackCycle(), TIMING.WATCH_TIME_INITIAL_DELAY_MS);
    }

    /**
     * Detiene el ciclo de seguimiento
     */
    stop() {
        if (this.watchTimeInterval) {
            clearInterval(this.watchTimeInterval);
            this.watchTimeInterval = null;
            Logger.info('WatchTime', '🛑 Tracker de tiempo detenido.');
        }
    }

    /**
     * Ejecuta una comprobación de chatters y asigna XP/Tiempo
     * @private
     */
    async _performTrackCycle() {
        // Solo ejecutar si el stream está online y tenemos el servicio de comunicación con Twitch
        if (!this.twitchService || !this.isStreamOnline) return;

        try {
            Logger.info('WatchTime', '⏱️ Ejecutando ciclo de Watch Time...');
            
            const chatters = await this.twitchService.fetchChatters();
            if (!chatters || chatters.length === 0) {
                Logger.info('WatchTime', 'No se detectaron chatters activos en este ciclo.');
                return;
            }

            // 1. Asignar XP Pasivo en ExperienceService
            if (this.xpService) {
                await this.xpService.addWatchTimeBatch(chatters, this.minutesPerCycle);
            }
            
            // 2. Trackear en estadísticas de sesión en SessionStatsService
            if (this.sessionStatsService) {
                this.sessionStatsService.trackSessionWatchTimeBatch(chatters, this.minutesPerCycle);
            }

            Logger.info('WatchTime', `✅ Watch Time asignado a ${chatters.length} usuarios (+${this.minutesPerCycle}m).`);
        } catch (error) {
            Logger.error('WatchTime', 'Error en el ciclo de Watch Time:', error);
        }
    }

    /**
     * Actualiza el estado del stream para arrancar o parar el tracker dinámicamente
     * @param {boolean} isOnline 
     */
    updateStreamStatus(isOnline) {
        this.isStreamOnline = isOnline;
        if (isOnline) {
            this.start();
        } else {
            this.stop();
        }
    }
}
