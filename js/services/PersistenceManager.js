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

        // Añadir un offset aleatorio por sesión (0-2s) para evitar que múltiples 
        // instancias (OBS, Navegador) choquen al guardar al mismo tiempo.
        this.sessionOffset = Math.random() * 2000;

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

        // Usamos el debounce config + el jitter de evento + el offset de esta sesión
        const jitter = Math.random() * 500;
        const totalDelay = this.debounceMs + this.sessionOffset + jitter;
        
        this.saveTimeout = setTimeout(() => {
            this.saveTimeout = null;
            this.saveImmediately();
        }, totalDelay);
    }

    /**
     * Ejecuta el guardado de forma inmediata (saltando el debounce)
     * @param {boolean} force - Si es true, ignora si hay cambios pendientes o no
     * @returns {Promise<void>}
     */
    async saveImmediately(force = false) {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        return await this._performSave(force);
    }

    /**
     * Lógica interna de guardado con control de concurrencia
     * @param {boolean} force - Forzar el guardado
     * @private
     */
    async _performSave(force = false) {
        // 1. Si no hay cambios, no ha habido fallos previos y no es forzado, cancelar
        if (!force && this.pendingChanges.size === 0 && !this.queuedSave) {
            return;
        }

        // 2. Si ya se está guardando, encolar para después
        if (this.isSaving) {
            this.queuedSave = true;
            return;
        }

        this.isSaving = true;
        this.queuedSave = false;
        
        // 3. Capturar cambios actuales (Snapshot)
        // Si no hay cambios pero el guardado es forzado, pasamos null para indicar "guardado completo/migración"
        const changesSnapshot = this.pendingChanges.size > 0 ? new Set(this.pendingChanges) : null;
        this.pendingChanges.clear();

        try {
            if (this.debug) console.log(`💾 PersistenceManager: Iniciando guardado (${changesSnapshot ? changesSnapshot.size : 'Masivo/Completo'})...`);
            
            // Ejecutar la función de guardado real provista por el servicio
            // Ahora pasamos el snapshot de cambios para guardados parciales
            await this.saveCallback(changesSnapshot);

            if (this.debug) console.log('✅ PersistenceManager: Datos guardados con éxito');

        } catch (error) {
            if (this.debug) console.error('❌ PersistenceManager: Error al guardar:', error);
            
            // Reincorporar cambios que fallaron para el siguiente intento
            changesSnapshot.forEach(item => this.pendingChanges.add(item));
        } finally {
            this.isSaving = false;

            // 4. Si hubo peticiones mientras guardábamos, ejecutar la cola
            if (this.queuedSave || this.pendingChanges.size > 0) {
                const retryDelay = this.pendingChanges.size > 0 ? this.debounceMs : 500;
                this.saveTimeout = setTimeout(() => this._performSave(), retryDelay);
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
