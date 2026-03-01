import Logger from './Logger.js';

/**
 * EventEmitter - Sistema de Pub/Sub minimalista para desacoplar componentes
 */
class EventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Se suscribe a un evento
     * @param {string} event Nombre del evento
     * @param {Function} callback Función a ejecutar
     * @returns {Function} Función para desuscribirse
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        
        // Retornar función de limpieza
        return () => this.off(event, callback);
    }

    /**
     * Elimina una suscripción
     */
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    /**
     * Emite un evento con datos
     * @param {string} event Nombre del evento
     * @param {any} data Datos opcionales
     */
    emit(event, data) {
        if (!this.events[event]) return;
        
        // Log en desarrollo para rastrear eventos
        if (window.APP_INSTANCE?.config?.DEBUG) {
            console.debug(`[Event] 📢 ${event}`, data);
        }

        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                Logger.error('EventEmitter', `❌ Error en listener de evento "${event}":`, error);
            }
        });
    }
}

// Exportar una instancia única (Singleton) para toda la app
const eventManager = new EventEmitter();
export default eventManager;
