import Logger from '../../utils/Logger.js';

/**
 * MessageQueueManager - Gestiona la cola de mensajes y prioridades
 */
export default class MessageQueueManager {
    constructor(config) {
        this.config = config;
        this.queue = [];
        this.isProcessing = false;
        
        // Configuración de tiempos
        this.baseDisplayTime = config.MESSAGE_DISPLAY_TIME || 8000;
        this.minDisplayTime = 4000; // Mínimo absoluto en modo turbo
        this.maxQueueSize = 10;
    }

    /**
     * Añade un mensaje a la cola
     * @param {Object} messageObj - El mensaje y su contexto
     */
    add(messageObj) {
        // Enriquecer el objeto con metadatos de prioridad si no existen
        const enriched = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            addedAt: Date.now(),
            priority: this._calculatePriority(messageObj),
            ...messageObj
        };

        this.queue.push(enriched);
        
        // Ordenar por prioridad (descendente) y luego por llegada (ascendente)
        this.queue.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return a.addedAt - b.addedAt;
        });

        // Limitar tamaño de la cola para evitar lag infinito
        if (this.queue.length > this.maxQueueSize) {
            // Eliminar los de menor prioridad que sean más antiguos
            this.queue.pop();
        }

        Logger.debug('Queue', `Mensaje añadido. Tamaño cola: ${this.queue.length}`);
    }

    /**
     * Calcula la prioridad del mensaje
     * @private
     */
    _calculatePriority(msg) {
        let p = 1; // Prioridad base
        
        // Si tiene logros o level up, prioridad máxima
        if (msg.xpResult?.leveledUp || (msg.xpResult?.achievements && msg.xpResult.achievements.length > 0)) {
            p = 10;
        } else if (msg.subscriberInfo?.isSubscriber) {
            p = 5;
        }

        return p;
    }

    /**
     * Obtiene el siguiente mensaje
     */
    getNext() {
        return this.queue.shift();
    }

    /**
     * Calcula cuánto tiempo debe estar en pantalla el mensaje actual
     * basándose en la carga de la cola (Modo Turbo)
     */
    calculateDisplayTime(messageObj) {
        // Si la cola está muy llena, reducimos el tiempo
        const loadFactor = Math.min(1, this.queue.length / 5); // 0 a 1
        const reduction = (this.baseDisplayTime - this.minDisplayTime) * loadFactor;
        
        let time = this.baseDisplayTime - reduction;

        // Bonus por prioridad
        if (messageObj.priority >= 10) time += 2000;
        
        return Math.max(this.minDisplayTime, time);
    }

    get length() {
        return this.queue.length;
    }

    isEmpty() {
        return this.queue.length === 0;
    }

    clear() {
        this.queue = [];
    }
}
