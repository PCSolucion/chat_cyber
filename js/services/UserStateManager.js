import PersistenceManager from './PersistenceManager.js';
import { XP } from '../constants/AppConstants.js';
import { INITIAL_SUBSCRIBERS } from '../data/subscribers.js';

/**
 * UserStateManager - Fuente Única de Verdad para el estado de los usuarios
 * 
 * Responsabilidades:
 * - Mantener el mapa global de datos de usuarios (Persistence Layer)
 * - Gestionar la carga, guardado y sincronización con GitHub Gist
 * - Implementar el merge inteligente de datos remotos/locales
 * - Centralizar el control de persistencia (markDirty)
 */
export default class UserStateManager {
    /**
     * @param {Object} config - Configuración global
     * @param {StorageManager} storage - Gestor de storage (Strategy)
     */
    constructor(config, storage) {
        this.config = config;
        this.storage = storage;
        this.fileName = config.XP_GIST_FILENAME || 'xp_data.json';

        // Base de datos de usuarios en memoria
        this.users = new Map();
        this.isLoaded = false;

        // Configuración de persistencia
        this.persistence = new PersistenceManager({
            saveCallback: () => this._performSaveTask(),
            debounceMs: XP.SAVE_DEBOUNCE_MS || 5000,
            debug: this.config.DEBUG
        });
    }

    /**
     * Carga inicial de datos desde el Gist
     */
    async load() {
        try {
            console.group('📂 UserStateManager: Iniciando Carga');
            const activeProvider = this.storage.activeProvider ? this.storage.activeProvider.constructor.name : 'NINGUNO';
            console.log(`🔌 Proveedor Activo: ${activeProvider}`);
            console.log(`📄 Recurso solicitado: ${this.fileName}`);

            const data = await this.storage.load(this.fileName);
            console.log('📦 Datos crudos recibidos:', data);

            if (data) {
                // Soporte para estructura plana (sin .users) o envuelta
                const usersToLoad = data.users || data;
                
                if (typeof usersToLoad === 'object' && !Array.isArray(usersToLoad)) {
                    Object.entries(usersToLoad).forEach(([username, userData]) => {
                        // Evitar cargar basura si la estructura es extraña
                        if (userData && (userData.xp !== undefined || userData.level !== undefined)) {
                            this.users.set(username.toLowerCase(), this._sanitizeUserData(userData));
                        }
                    });
                } else {
                    console.warn('⚠️ La estructura de datos recibida no es un objeto válido de usuarios:', usersToLoad);
                }
            } else {
                console.warn('⚠️ No se recibieron datos de ningún proveedor de almacenamiento.');
            }

            this.isLoaded = true;
            console.log(`✅ Usuarios procesados y listos: ${this.users.size}`);
            console.groupEnd();
            
            // Integrar datos iniciales (subs importados)
            this._mergeInitialSubscribers();
            
            return true;
        } catch (error) {
            console.error('❌ UserStateManager: Error crítico cargando datos:', error);
            console.groupEnd();
            this.isLoaded = true;
            this._mergeInitialSubscribers();
            return false;
        }
    }

    /**
     * Obtiene los datos de un usuario (los crea si no existen)
     * @param {string} username 
     */
    getUser(username) {
        const lowerUser = username.toLowerCase();

        if (!this.users.has(lowerUser)) {
            this.users.set(lowerUser, {
                xp: 0,
                level: 1,
                lastActivity: null,
                streakDays: 0,
                bestStreak: 0,
                lastStreakDate: null,
                totalMessages: 0,
                achievements: [],
                achievementStats: {},
                activityHistory: {},
                watchTimeMinutes: 0,
                subMonths: 0
            });
        }

        return this.users.get(lowerUser);
    }

    /**
     * Marca a un usuario como modificado para programar guardado
     * @param {string} username 
     */
    markDirty(username) {
        this.persistence.markDirty(username.toLowerCase());
    }

    /**
     * Obtiene el mapa completo de usuarios (solo lectura recomendada)
     */
    getAllUsers() {
        return this.users;
    }

    /**
     * Sanitiza los datos de un usuario al cargar
     * @private
     */
    _sanitizeUserData(data) {
        // Deduplicar logros si vinieran corruptos
        let achievements = data.achievements || [];
        if (Array.isArray(achievements) && achievements.length > 0) {
            const achMap = new Map();
            achievements.forEach(ach => {
                const id = typeof ach === 'string' ? ach : ach.id;
                if (id && !achMap.has(id)) achMap.set(id, ach);
            });
            achievements = Array.from(achMap.values());
        }

        return {
            xp: data.xp || 0,
            level: data.level || 1,
            lastActivity: data.lastActivity || null,
            streakDays: data.streakDays || 0,
            bestStreak: data.bestStreak || data.streakDays || 0,
            lastStreakDate: data.lastStreakDate || null,
            totalMessages: data.totalMessages || 0,
            achievements: achievements,
            achievementStats: data.achievementStats || {},
            activityHistory: data.activityHistory || {},
            watchTimeMinutes: data.watchTimeMinutes || 0,
            subMonths: data.subMonths || 0
        };
    }

    /**
     * Tarea de guardado (Estrategia Fetch-before-write)
     * @private
     */
    async _performSaveTask() {
        try {
            // 1. Sincronizar con el servidor para no sobreescribir otros cambios (Opcional, pero mantenemos la lógica)
            const remoteData = await this.storage.load(this.fileName);
            
            if (remoteData && remoteData.users) {
                this._mergeRemoteChanges(remoteData.users);
            }

            // 2. Preparar snapshot
            const usersSnapshot = {};
            this.users.forEach((data, username) => {
                usersSnapshot[username] = data;
            });

            // 3. Guardar
            await this.storage.save(this.fileName, {
                users: usersSnapshot,
                lastUpdated: new Date().toISOString(),
                version: '1.1'
            });

        } catch (error) {
            console.error('❌ UserStateManager: Fallo en ciclo de persistencia:', error);
            throw error;
        }
    }

    /**
     * Fusiona cambios remotos sin perder progreso local nuevo
     * @private
     */
    _mergeRemoteChanges(remoteUsers) {
        Object.entries(remoteUsers).forEach(([username, remoteData]) => {
            const lowerUser = username.toLowerCase();
            const localData = this.users.get(lowerUser);

            if (!localData) {
                this.users.set(lowerUser, remoteData);
            } else {
                // Conservar siempre el mayor progreso
                localData.xp = Math.max(localData.xp || 0, remoteData.xp || 0);
                localData.level = Math.max(localData.level || 1, remoteData.level || 1);
                localData.totalMessages = Math.max(localData.totalMessages || 0, remoteData.totalMessages || 0);
                localData.watchTimeMinutes = Math.max(localData.watchTimeMinutes || 0, remoteData.watchTimeMinutes || 0);
                localData.streakDays = Math.max(localData.streakDays || 0, remoteData.streakDays || 0);
                localData.bestStreak = Math.max(localData.bestStreak || 0, remoteData.bestStreak || 0);
                localData.subMonths = Math.max(localData.subMonths || 0, remoteData.subMonths || 0);

                // Mezclar Logros
                const achMap = new Map();
                [...(remoteData.achievements || []), ...(localData.achievements || [])].forEach(ach => {
                    const id = typeof ach === 'string' ? ach : ach.id;
                    if (id && !achMap.has(id)) achMap.set(id, ach);
                });
                localData.achievements = Array.from(achMap.values());

                // Mezclar achievementStats y activityHistory (similar a ExperienceService)
                this._mergeDeep(localData, remoteData, 'achievementStats');
                this._mergeDeep(localData, remoteData, 'activityHistory');

                // Timestamp de actividad más reciente
                const remoteTime = remoteData.lastActivity ? new Date(remoteData.lastActivity).getTime() : 0;
                const localTime = localData.lastActivity ? new Date(localData.lastActivity).getTime() : 0;
                localData.lastActivity = Math.max(localTime, remoteTime);
                
                this.users.set(lowerUser, localData);
            }
        });
    }

    /**
     * Helper para mergear objetos anidados numéricos/simples
     * @private
     */
    _mergeDeep(local, remote, key) {
        if (!remote[key]) return;
        if (!local[key]) local[key] = {};
        
        Object.entries(remote[key]).forEach(([subKey, remoteVal]) => {
            const localVal = local[key][subKey];
            if (typeof remoteVal === 'number') {
                local[key][subKey] = Math.max(localVal || 0, remoteVal);
            } else if (remoteVal && !localVal) {
                local[key][subKey] = remoteVal;
            } else if (key === 'activityHistory' && remoteVal && localVal) {
                // Especial para Heatmaps
                localVal.messages = Math.max(localVal.messages || 0, remoteVal.messages || 0);
                localVal.xp = Math.max(localVal.xp || 0, remoteVal.xp || 0);
                localVal.watchTime = Math.max(localVal.watchTime || 0, remoteVal.watchTime || 0);
            }
        });
    }

    /**
     * Importar datos estáticos de suscriptores
     * @private
     */
    _mergeInitialSubscribers() {
        if (!INITIAL_SUBSCRIBERS) return;

        Object.entries(INITIAL_SUBSCRIBERS).forEach(([username, months]) => {
            const userData = this.getUser(username);
            if (!userData.subMonths || userData.subMonths < months) {
                userData.subMonths = months;
                this.markDirty(username);
            }
        });
    }

    /**
     * Fuerza el guardado inmediato de los datos
     */
    async saveImmediately() {
        await this.persistence.saveImmediately();
    }

    /**
     * Reset total (Uso administrativo)
     */
    async resetAll() {
        this.users.clear();
        await this.saveImmediately();
        console.warn('⚠️ UserStateManager: Base de datos reseteada');
    }
}
