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
        
        // Calculamos cuántos minutos representa cada ciclo para los servicios (ej: 30m)
        this.minutesPerCycle = Math.floor(this.intervalMs / 60000);

        // Memoria para validar persistencia (Minuto 0 vs Minuto 30)
        this.lastChattersList = null;
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
    async start() {
        if (this.watchTimeInterval) return;
        
        Logger.info('WatchTime', '🚀 Iniciando tracker de tiempo de visualización...');
        
        // Captura inicial (Minuto 0) para tener una base de comparación
        if (this.twitchService && this.isStreamOnline) {
            try {
                this.lastChattersList = await this.twitchService.fetchChatters();
                Logger.info('WatchTime', `📋 Captura inicial realizada: ${this.lastChattersList.length} usuarios en espera.`);
            } catch (err) {
                Logger.error('WatchTime', 'Error en captura inicial:', err);
            }
        }

        // Programar ciclo recurrente
        this.watchTimeInterval = setInterval(() => this._performTrackCycle(), this.intervalMs);
    }

    /**
     * Detiene el ciclo de seguimiento
     */
    stop() {
        if (this.watchTimeInterval) {
            clearInterval(this.watchTimeInterval);
            this.watchTimeInterval = null;
            this.lastChattersList = null; // Limpiar memoria al detener
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
            Logger.info('WatchTime', '⏱️ Ejecutando ciclo de validación de Watch Time...');
            
            const currentChatters = await this.twitchService.fetchChatters();
            
            // Si no hay lista previa (raro, pero posible por errores de red), guardamos la actual y salimos
            if (!this.lastChattersList) {
                this.lastChattersList = currentChatters;
                Logger.info('WatchTime', 'Falta lista previa, guardando captura actual para siguiente ciclo.');
                return;
            }

            // Filtrar usuarios que estaban en el minuto 0 Y siguen en el minuto 30
            // Usamos sets para una intersección rápida O(n)
            const lastSet = new Set(this.lastChattersList.map(u => u.toLowerCase()));
            const persistentChatters = currentChatters.filter(u => lastSet.has(u.toLowerCase()));

            if (persistentChatters.length > 0) {
                // 1. Asignar XP Pasivo en ExperienceService
                if (this.xpService) {
                    await this.xpService.addWatchTimeBatch(persistentChatters, this.minutesPerCycle, false);
                }
                
                // 2. Trackear en estadísticas de sesión
                if (this.sessionStatsService) {
                    this.sessionStatsService.trackSessionWatchTimeBatch(persistentChatters, this.minutesPerCycle);
                }

                Logger.info('WatchTime', `✅ Watch Time otorgado a ${persistentChatters.length}/${currentChatters.length} usuarios persistentes (+${this.minutesPerCycle}m).`);
            } else {
                Logger.info('WatchTime', 'No se detectaron usuarios persistentes en este intervalo.');
            }

            // Actualizar la lista para el siguiente ciclo
            this.lastChattersList = currentChatters;

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
