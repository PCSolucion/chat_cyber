/**
 * PersistenceManager - Gestor de persistencia con control de flujo
 * 
 * Responsabilidades:
 * - Gestionar el guardado de datos con técnicas de debounce
 * - Controlar la concurrencia para evitar colisiones de escritura (Race conditions)
 * - Manejar colas de guardado (Queued saves)
 * - Proveer mecanismos de reintento básicos
 */
export default class PersistenceManager {
    /**
     * @param {Object} options 
     * @param {Function} options.saveCallback - Función asíncrona que realiza el guardado real
     * @param {number} options.debounceMs - Tiempo de espera antes de ejecutar el guardado
     * @param {boolean} options.debug - Activar logs de depuración
     */
    constructor(options = {}) {
        this.saveCallback = options.saveCallback;
        this.debounceMs = options.debounceMs || 5000;
        this.debug = options.debug || false;

        this.pendingChanges = new Set();
        this.saveTimeout = null;
        this.isSaving = false;
        this.queuedSave = false;
    }

    /**
     * Marca un elemento como modificado y programa un guardado
     * @param {string} identifier - Opcional, identificador del cambio (ej: username)
     */
    markDirty(identifier = null) {
        if (identifier) {
            this.pendingChanges.add(identifier);
        }
        this.scheduleSave();
    }

    /**
     * Programa el guardado con debounce
     */
    scheduleSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Añadir un pequeño jitter (0-1s) para evitar que múltiples instancias
        // intenten guardar exactamente al mismo tiempo después de un evento
        const jitter = Math.random() * 1000;
        
        this.saveTimeout = setTimeout(() => {
            this.saveTimeout = null;
            this.saveImmediately();
        }, this.debounceMs + jitter);
    }

    /**
     * Ejecuta el guardado de forma inmediata (saltando el debounce)
     * @returns {Promise<void>}
     */
    async saveImmediately() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        return await this._performSave();
    }

    /**
     * Lógica interna de guardado con control de concurrencia
     * @private
     */
    async _performSave() {
        // 1. Si no hay cambios y no hay nada en cola, cancelar
        if (this.pendingChanges.size === 0 && !this.queuedSave) {
            return;
        }

        // 2. Si ya se está guardando, encolar para después
        if (this.isSaving) {
            if (this.debug) console.log('⏳ PersistenceManager: Guardado en curso, encolando...');
            this.queuedSave = true;
            return;
        }

        // 3. Bloquear y preparar snapshot de cambios
        this.isSaving = true;
        this.queuedSave = false;
        
        const changesSnapshot = new Set(this.pendingChanges);
        this.pendingChanges.clear();

        try {
            if (this.debug) console.log('💾 PersistenceManager: Iniciando guardado...');
            
            // Ejecutar la función de guardado real provista por el servicio
            await this.saveCallback();

            if (this.debug) console.log('✅ PersistenceManager: Datos guardados con éxito');

        } catch (error) {
            if (this.debug) console.error('❌ PersistenceManager: Error al guardar:', error);
            
            // Reincorporar cambios que fallaron para el siguiente intento
            changesSnapshot.forEach(item => this.pendingChanges.add(item));
            
            // Si el error es crítico, podríamos lanzar evento o manejar reintentos aquí
            throw error; 
        } finally {
            this.isSaving = false;

            // 4. Si hubo peticiones mientras guardábamos, ejecutar la cola
            if (this.queuedSave || this.pendingChanges.size > 0) {
                if (this.debug) console.log('🔄 PersistenceManager: Procesando cola pendiente...');
                this._performSave(); 
            }
        }
    }

    /**
     * Estado actual del gestor
     */
    getStatus() {
        return {
            isSaving: this.isSaving,
            hasPendingChanges: this.pendingChanges.size > 0,
            pendingCount: this.pendingChanges.size,
            isQueued: this.queuedSave
        };
    }
}
