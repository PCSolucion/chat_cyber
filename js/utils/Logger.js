import EventManager from './EventEmitter.js';

/**
 * Logger - Servicio centralizado de registro y diagnóstico
 * 
 * Permite gestionar diferentes niveles de log, filtrar por módulos
 * y notificar errores críticos de forma visual.
 */
class Logger {
    constructor() {
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        };
        
        // Configuración por defecto
        this.config = {
            level: 1, // INFO por defecto
            persistErrors: true,
            maxPersistedEntries: 50
        };

        this.moduleColors = {
            'App': '#00f6ff',      // Cyan
            'Twitch': '#9146ff',   // Twitch Purple
            'XP': '#ffd700',       // Gold
            'UI': '#ff00ff',       // Magenta
            'Stats': '#00ff00',    // Green
            'Command': '#ff4500',  // OrangeRed
            'Storage': '#808080'   // Gray
        };
    }

    /**
     * Inicializa el logger con la configuración de la app
     */
    init(appConfig) {
        if (appConfig.DEBUG) {
            this.config.level = this.levels.DEBUG;
        }
        
        if (appConfig.LOG_LEVEL !== undefined) {
            this.config.level = typeof appConfig.LOG_LEVEL === 'string' 
                ? this.levels[appConfig.LOG_LEVEL] 
                : appConfig.LOG_LEVEL;
        }

        this.info('Logger', 'Motor de diagnóstico inicializado', { level: this.config.level });
    }

    /**
     * Log de nivel DEBUG
     */
    debug(module, message, data = null) {
        this._log('DEBUG', module, message, data);
    }

    /**
     * Log de nivel INFO
     */
    info(module, message, data = null) {
        this._log('INFO', module, message, data);
    }

    /**
     * Log de nivel WARN
     */
    warn(module, message, data = null) {
        this._log('WARN', module, message, data);
    }

    /**
     * Log de nivel ERROR
     */
    error(module, message, data = null) {
        this._log('ERROR', module, message, data);
        
        // Emitir evento para notificación visual si es crítico
        EventManager.emit('system:error', { module, message, data });
        
        // Persistir si está habilitado
        if (this.config.persistErrors) {
            this._persistError(module, message, data);
        }
    }

    /**
     * Lógica interna de registro
     * @private
     */
    _log(levelName, module, message, data) {
        const levelValue = this.levels[levelName];
        if (levelValue < this.config.level) return;

        const timestamp = new Date().toLocaleTimeString();
        const color = this.moduleColors[module] || '#ffffff';
        
        const prefix = `%c[${timestamp}] [${levelName}] [${module}]`;
        const style = `color: ${color}; font-weight: bold;`;

        if (data) {
            console.log(prefix, style, message, data);
        } else {
            console.log(prefix, style, message);
        }
    }

    /**
     * Guarda el error en localStorage para inspección posterior
     * @private
     */
    _persistError(module, message, data) {
        try {
            const history = JSON.parse(localStorage.getItem('cyber_error_log') || '[]');
            history.unshift({
                timestamp: new Date().toISOString(),
                module,
                message,
                data: data instanceof Error ? data.message : data
            });

            // Limitar tamaño
            if (history.length > this.config.maxPersistedEntries) {
                history.pop();
            }

            localStorage.setItem('cyber_error_log', JSON.stringify(history));
        } catch (e) {
            // Silencio radio si falla el storage
        }
    }

    /**
     * Obtiene el historial de errores guardados
     */
    getErrorHistory() {
        return JSON.parse(localStorage.getItem('cyber_error_log') || '[]');
    }

    /**
     * Limpia el historial de errores
     */
    clearErrorHistory() {
        localStorage.removeItem('cyber_error_log');
    }
}

// Exportar instancia única (Singleton)
const loggerInstance = new Logger();
export default loggerInstance;
