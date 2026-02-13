import FirestoreService from './FirestoreService.js';
import Logger from '../utils/Logger.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

/**
 * UserStateManager - Gestión de Estado (Username Key)
 * 
 * - La "User Identity" es el username en minúsculas.
 * - Mantiene los usuarios activos en RAM (`this.users`).
 * - Coordina la carga y guardado con Firestore.
 */
export default class UserStateManager {
    constructor(config) {
        this.config = config;
        this.firestore = new FirestoreService(config);
        
        // Memoria RAM: Map<username, UserData>
        this.users = new Map();
        
        // Debounce Timers: Map<username, timerId>
        this.saveTimers = new Map();

        // Bloqueo de carga concurrente: Map<username, Promise>
        this.loadingPromises = new Map();

        // Suscripciones reales a Firestore: Map<username, unsubscribeFn>
        this.subscriptions = new Map();

        // Acumulador de incrementos pendientes: Map<username, {xp: 0, "stats.messages": 0, ...}>
        this.pendingIncrements = new Map();
    }

    async init() {
        console.group('🚀 UserStateManager: Init');
        try {
            // Pasamos la config global por si acaso
            await this.firestore.configure(this.config.FIREBASE_CONFIG || this.config.FIREBASE);
            Logger.info('UserStateManager', '✅ Sistema listo.');
        } catch (e) {
            Logger.error('UserStateManager', '❌ Error en init:', e);
        }
        console.groupEnd();
    }

    /**
     * Garantiza que el usuario esté en memoria y SINCRONIZADO con Firestore.
     * UTILIZA BLOQUEO DE CONCURRENCIA para evitar "Nivel 1" por carga duplicada.
     * UTILIZA SUBSCRIPTIONS para que los datos buenos siempre vengan de la nube.
     */
    async ensureUserLoaded(arg1, arg2) {
        const username = (arg1 && typeof arg1 === 'string' && !arg2) ? arg1 : arg2;
        const userId = (arg1 && arg2) ? arg1 : null;
        
        if (!username) return false;
        const key = username.toLowerCase();

        // 1. Si ya tenemos suscripción activa, los datos en RAM son "buenos" (autorefresh)
        if (this.subscriptions.has(key) && this.users.has(key)) {
            return true;
        }

        // 2. Check Bloqueo de Carga (si se está conectando ahora mismo)
        if (this.loadingPromises.has(key)) {
            await this.loadingPromises.get(key);
            return true;
        }

        // 3. Iniciar conexión/carga
        const loadPromise = (async () => {
            try {
                // PRIMERA CARGA: Obtener datos actuales
                const cloudData = await this.firestore.getUser(userId, username);
                let finalData;

                if (cloudData) {
                    finalData = this._sanitize(cloudData, username);
                } else {
                    finalData = this._createNewUser(username);
                }

                this.users.set(key, finalData);

                // OPTIMIZACIÓN LECTURAS: Eliminamos onSnapshot.
                // Al ser un overlay de OBS, el propio sistema es la fuente de verdad en RAM.
                // Esto evita cobrar 1 lectura extra cada vez que el usuario sube de XP.
                if (!this.users.has(key)) {
                    this.users.set(key, finalData);
                }
                
                EventManager.emit(EVENTS.USER.LOADED, { username: key, data: finalData });
                return true;

            } catch (e) {
                Logger.error('UserStateManager', `🔥 ERROR CRÍTICO sincronizando ${key}:`, e);
                throw e; 
            } finally {
                this.loadingPromises.delete(key);
            }
        })();

        this.loadingPromises.set(key, loadPromise);
        return await loadPromise;
    }

    /**
     * Devuelve los datos del usuario síncronamente (debe estar cargado previamente)
     */
    getUser(arg1, arg2) {
        const username = arg2 || arg1;
        if (!username) return null;
        return this.users.get(username.toLowerCase());
    }

    /**
     * Devuelve TODOS los usuarios en memoria (para Rankings)
     */
    getAllUsers() {
        return this.users;
    }

    /**
     * Programa un guardado para el usuario
     * @param {string} username 
     */
    markDirty(username) {
        if (!username) return;
        this._scheduleSave(username.toLowerCase());
    }

    /**
     * Guarda los datos modificados.
     * Soporta firma (id, username, data) y (username, data)
     */
    async saveUserResult(arg1, arg2, arg3) {
        let username, newData;
        
        if (arg3) {
            // (id, username, data) - Estilo ExperienceService
            username = arg2;
            newData = arg3;
        } else {
            // (username, data) - Estilo directo
            username = arg1;
            newData = arg2;
        }

        if (!username) return;
        const key = username.toLowerCase();
        
        let currentData = this.users.get(key);
        if (!currentData) {
            currentData = this._createNewUser(username);
        }

        // Merge in-place para preservar referencias usadas por otros servicios (ej. ExperienceService)
        Object.assign(currentData, newData);
        
        // Protección simple contra degradación de nivel (Sólo advertencia, permitimos corrección)
        if (newData.level && newData.level < currentData.level) {
            if(this.config.DEBUG) Logger.warn('UserStateManager', `⚠️ Nivel bajó de ${currentData.level} a ${newData.level} para ${key}. Manteniendo nivel alto.`);
            currentData.level = Math.max(currentData.level, newData.level || 0);
        }
        
        // El objeto en this.users ya está actualizado por Object.assign

        // Si recibimos incrementos específicos (ej. de ExperienceService), los acumulamos
        if (newData.xpGain || newData.messageGain || newData.watchTimeGain) {
            this._accumulateIncrements(key, newData);
        }

        // Programar Cloud Save
        this._scheduleSave(key);
    }

    _accumulateIncrements(key, newData) {
        if (!this.pendingIncrements.has(key)) {
            this.pendingIncrements.set(key, {});
        }
        const acc = this.pendingIncrements.get(key);
        
        if (newData.xpGain) acc['xp'] = (acc['xp'] || 0) + newData.xpGain;
        if (newData.messageGain) acc['stats.messages'] = (acc['stats.messages'] || 0) + newData.messageGain;
        if (newData.watchTimeGain) acc['stats.watchTime'] = (acc['stats.watchTime'] || 0) + newData.watchTimeGain;

        // Soporte para Heatmap (activityHistory)
        if (newData.todayKey) {
            const hKey = `activityHistory.${newData.todayKey}`;
            if (newData.xpGain) acc[`${hKey}.xp`] = (acc[`${hKey}.xp`] || 0) + newData.xpGain;
            if (newData.messageGain) acc[`${hKey}.messages`] = (acc[`${hKey}.messages`] || 0) + newData.messageGain;
            if (newData.watchTimeGain) acc[`${hKey}.watchTime`] = (acc[`${hKey}.watchTime`] || 0) + newData.watchTimeGain;
        }
    }

    _scheduleSave(key) {
        if (this.saveTimers.has(key)) {
            clearTimeout(this.saveTimers.get(key));
        }

        // MODO LIVE (A): Guardado casi inmediato (100ms debounce)
        // Protege contra doble llamada síncrona pero se siente instantáneo.
        const timer = setTimeout(() => {
            if (this.saveTimers.has(key)) {
                this._performCloudWrite(key);
                this.saveTimers.delete(key);
            }
        }, 100);

        this.saveTimers.set(key, timer);
    }

    async _performCloudWrite(key) {
        const data = this.users.get(key);
        if (!data) return;

        try {
            // OPTIMIZACIÓN: Si tenemos incrementos acumulados, usarlos de forma atómica
            const increments = this.pendingIncrements.get(key);
            let incrementedOnly = false;

            if (increments && Object.keys(increments).length > 0) {
                this.pendingIncrements.delete(key); // Limpiar pendientes antes de enviar
                await this.firestore.updateUserCounters(key, increments);
                
                // CRÍTICO: Si solo hemos incrementado contadores (XP, mensajes), NO necesitamos guardar todo el objeto.
                // Esto ahorra una escritura completa (SetDoc) y evita sobrescribir datos si no es necesario.
                // Solo continuamos si hay cambios estructurales (Nivel, Logros, Nombre).
                incrementedOnly = true;
            }
            
            // Si solo fue un incremento, terminamos aquí. Ahorramos la escritura pesada.
            if (incrementedOnly) {
                if (this.config.DEBUG) Logger.debug('UserStateManager', `⚡ Optimizado: Solo incrementos para ${key}`);
                return;
            }
            
            // Guardar el estado completo solo si hay cambios estructurales (ej. Nivel up, nuevos logros)
            await this.firestore.saveUser(key, data);
        } catch (e) {
            Logger.error('UserStateManager', `❌ Error guardando ${key}`, e);
        }
    }

    _sanitize(data, username) {
        return {
            displayName: data.displayName || username,
            xp: Number(data.xp) || 0,
            level: Number(data.level) || 1,
            stats: data.stats || { messages: 0, watchTime: 0 },
            achievements: Array.isArray(data.achievements) ? data.achievements : [],
            activityHistory: data.activityHistory || {},
            // Preservar cualquier otro campo que venga de la nube
            ...data
        };
    }

    _createNewUser(username) {
        if (this.config.DEBUG) console.warn(`[UserStateManager] ⚠️ CREANDO NUEVO USUARIO (Nivel 1): ${username}`);
        return {
            displayName: username,
            xp: 0,
            level: 1,
            stats: { messages: 0, watchTime: 0 },
            achievements: [],
            activityHistory: {}
        };
    }
    
    /**
     * Procesa inmediatamente todos los guardados pendientes (Batch)
     * Utilizado al cerrar la aplicación o en eventos críticos.
     */
    async saveImmediately() {
        if (this.saveTimers.size === 0) return;
        
        Logger.info('UserStateManager', `💾 Guardando ${this.saveTimers.size} usuarios pendientes...`);
        const promises = [];
        
        for (const [key, timer] of this.saveTimers.entries()) {
            clearTimeout(timer);
            promises.push(this._performCloudWrite(key));
        }
        
        this.saveTimers.clear();
        await Promise.all(promises);
        Logger.info('UserStateManager', '✅ Todos los datos han sido persistidos.');
    }

    // Stub para compatibilidad
    async load() { return true; }
    
    resetAll() { 
        // Cancelar todas las suscripciones activas
        for (const unsub of this.subscriptions.values()) {
            if (typeof unsub === 'function') unsub();
        }
        this.subscriptions.clear();

        // Limpiar timers
        for (const timer of this.saveTimers.values()) {
            clearTimeout(timer);
        }
        this.saveTimers.clear();

        this.users.clear(); 
    }
}
