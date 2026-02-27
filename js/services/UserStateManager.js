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

        // Control de cambios estructurales y usuarios nuevos para evitar atomic increments fallidos
        this.pendingStructuralChanges = new Set(); 
        this.newUsers = new Set();
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
    async ensureUserLoaded(username, userId = null) {
        if (!username) return false;
        const key = username.toLowerCase();

        // 1. Si ya tenemos al usuario en memoria, consideramos que está cargado.
        // NOTA: Antes dependía de subscriptions, pero al eliminar onSnapshot para ahorrar lecturas,
        // la memoria RAM (this.users) se convierte en la fuente de verdad.
        if (this.users.has(key)) {
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
                const cloudData = await this.firestore.getUser(username, userId);
                let finalData;

                if (cloudData) {
                    finalData = this._sanitize(cloudData, username);
                } else {
                    finalData = this._createNewUser(username);
                    // IMPORTANTE: Marcar como nuevo para forzar Full Save la primera vez (EVITA ERROR NOT-FOUND)
                    this.newUsers.add(key);
                }

                // OPTIMIZACIÓN LECTURAS: Eliminamos onSnapshot.
                // Al ser un overlay de OBS, el propio sistema es la fuente de verdad en RAM.
                // Esto evita cobrar 1 lectura extra cada vez que el usuario aumenta de XP o cambia de estado.
                this.users.set(key, finalData);
                
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
    getUser(username) {
        if (!username) return null;
        return this.users.get(username.toLowerCase());
    }

    /**
     * Verifica si un usuario está cargado en memoria
     */
    hasUser(username) {
        if (!username) return false;
        return this.users.has(username.toLowerCase());
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
        this.pendingStructuralChanges.add(username.toLowerCase());
        this._scheduleSave(username.toLowerCase());
    }

    /**
     * Guarda los datos modificados.
     * Soporta firma (id, username, data) y (username, data)
     */
    async saveUserResult(username, newData) {
        if (!username || !newData) return;
        const key = username.toLowerCase();
        
        let currentData = this.users.get(key);
        if (!currentData) {
            currentData = this._createNewUser(username);
            this.newUsers.add(key); // Marcar como nuevo si se creó implícitamente
        }

        // DETECCIÓN DE CAMBIOS ESTRUCTURALES (Antes del merge)
        let isStructural = false;
        
        // 1. Cambio de Nivel
        if (newData.level !== undefined && newData.level !== currentData.level) isStructural = true;
        
        // 2. Nuevos Logros (verificamos longitud)
        if (newData.achievements && (!currentData.achievements || newData.achievements.length !== currentData.achievements.length)) isStructural = true;
        
        // 3. Cambio de Nombre Visual
        if (newData.displayName && newData.displayName !== currentData.displayName) isStructural = true;

        if (isStructural) {
            this.pendingStructuralChanges.add(key);
        }

        // [FIX] Guardar nivel anterior ANTES del merge para protección anti-degradación
        const previousLevel = currentData.level;

        // Merge in-place para preservar referencias usadas por otros servicios (ej. ExperienceService)
        Object.assign(currentData, newData);
        
        // Protección contra degradación de nivel (Comparar contra el valor PRE-merge)
        if (newData.level !== undefined && newData.level < previousLevel) {
            if(this.config.DEBUG) Logger.warn('UserStateManager', `⚠️ Nivel bajó de ${previousLevel} a ${newData.level} para ${key}. Manteniendo nivel alto.`);
            currentData.level = previousLevel;
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
        // Inicializar mapa de tiempos de dirty si no existe
        if (!this.firstDirtyTime) this.firstDirtyTime = new Map();

        // 1. Verificamos si ya hay un guardado pendiente
        if (this.saveTimers.has(key)) {
            const firstTime = this.firstDirtyTime.get(key) || Date.now();
            const timeElapsed = Date.now() - firstTime;

            // SAFETY: Si hemos pospuesto el guardado por más de 10 segundos, forzamos EJECUCIÓN INMEDIATA.
            // Esto evita que usuarios muy activos (spam) nunca guarden sus datos por el debounce infinito.
            if (timeElapsed > 10000) {
                if (this.config.DEBUG) Logger.debug('UserStateManager', `🚨 Forzando guardado por timeout de seguridad (${Math.round(timeElapsed/1000)}s) para ${key}`);
                clearTimeout(this.saveTimers.get(key));
                this._performCloudWrite(key);
                this.saveTimers.delete(key);
                this.firstDirtyTime.delete(key);
                return;
            }
            
            // Si no hemos excedido el límite, posponemos el guardado (Debounce clásico)
            clearTimeout(this.saveTimers.get(key));
        } else {
            // Es el primer cambio, registramos tiempo de inicio
            this.firstDirtyTime.set(key, Date.now());
        }

        // 2. Programamos el nuevo intento
        // Aumentamos el debounce de 100ms a 2000ms (2s)
        // Esto reduce drásticamente las escrituras en ráfaga sin afectar la UX (ya que la UI usa RAM).
        const timer = setTimeout(() => {
            if (this.saveTimers.has(key)) {
                this._performCloudWrite(key);
                this.saveTimers.delete(key);
                if(this.firstDirtyTime) this.firstDirtyTime.delete(key);
            }
        }, 2000);

        this.saveTimers.set(key, timer);
    }

    async _performCloudWrite(key) {
        const data = this.users.get(key);
        if (!data) return;

        try {
            // VERIFICACIÓN CRÍTICA:
            // 1. ¿Es un usuario nuevo? (Nunca guardado en DB) -> Forzar Full Save
            // 2. ¿Hay cambios estructurales pendientes? (Nivel, Logros) -> Forzar Full Save
            const isNewUser = this.newUsers.has(key);
            const hasStructuralChanges = this.pendingStructuralChanges.has(key);
            
            if (isNewUser || hasStructuralChanges) {
                // Forzar guardado completo (setDoc)
                // Usamos await PRIMERO para asegurarnos de que la operación tuvo éxito antes de borrar banderas.
                await this.firestore.saveUser(key, data);
                
                // Si llegamos aquí, fue exitoso. Limpiamos:
                this.pendingIncrements.delete(key);
                this.newUsers.delete(key);
                this.pendingStructuralChanges.delete(key);
                
                if (this.config.DEBUG) Logger.debug('UserStateManager', `💾 Full Save forzado para ${key} (Nuevo: ${isNewUser}, Estructural: ${hasStructuralChanges})`);
                return;
            }

            // OPTIMIZACIÓN: Si NO es nuevo y NO hay cambios estructurales, usamos incrementos atómicos
            const increments = this.pendingIncrements.get(key);
            
            if (increments && Object.keys(increments).length > 0) {
                // Intentamos actualizar solo contadores
                await this.firestore.updateUserCounters(key, increments);
                
                // Si llegamos aquí, borramos los pendientes procesados
                this.pendingIncrements.delete(key); 
                
                if (this.config.DEBUG) Logger.debug('UserStateManager', `⚡ Optimizado: Solo incrementos para ${key}`);
                return;
            }
            
            // Si llegamos aquí y no había incrementos ni cambios estructurales (data dirty por otra razón?), guardamos user.
            await this.firestore.saveUser(key, data);

        } catch (e) {
            Logger.error('UserStateManager', `❌ Error guardando ${key}`, e);
            // AL NO BORRAR LAS BANDERAS NII LOS INCREMENTS, 
            // EL SISTEMA REINTENTARÁ AUTOMÁTICAMENTE EN EL SIGUIENTE CICLO.
        }
    }

    _sanitize(data, username) {
        // Asegurar estructura mínima coherente para evitar NaN en contadores
        const stats = {
            messages: 0,
            watchTime: 0,
            prediction_wins: 0,
            prediction_participations: 0,
            ...(data.stats || {})
        };
        
        // [FIX] Detectar y rechazar "total" como displayName (Evitar corrupción de datos)
        const rawDisplayName = data.displayName || username;
        const displayName = (rawDisplayName.toLowerCase() === 'total' && username.toLowerCase() !== 'total') 
            ? username 
            : rawDisplayName;

        return {
            // Preservar cualquier otro campo que venga de la nube primero
            ...data,
            // Sobrescribir con valores normalizados
            displayName: displayName,
            xp: Number(data.xp) || 0,
            level: Number(data.level) || 1,
            stats,
            achievements: Array.isArray(data.achievements) ? data.achievements : [],
            activityHistory: data.activityHistory || {},
            // Normalizar contadores derivados usados por ExperienceService
            totalMessages: Number(
                data.totalMessages ?? stats.messages ?? 0
            ) || 0,
            watchTimeMinutes: Number(
                data.watchTimeMinutes ?? stats.watchTime ?? 0
            ) || 0
        };
    }

    _createNewUser(username) {
        if (this.config.DEBUG) console.warn(`[UserStateManager] ⚠️ CREANDO NUEVO USUARIO (Nivel 1): ${username}`);
        return {
            displayName: username,
            xp: 0,
            level: 1,
            stats: { 
                messages: 0, 
                watchTime: 0,
                prediction_wins: 0,
                prediction_participations: 0 
            },
            // Contadores derivados usados por ExperienceService
            totalMessages: 0,
            watchTimeMinutes: 0,
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

