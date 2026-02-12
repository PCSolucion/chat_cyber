import PersistenceManager from './PersistenceManager.js';
import { XP, TIMING } from '../constants/AppConstants.js';
import { INITIAL_SUBSCRIBERS } from '../data/subscribers.js';

/**
 * UserStateManager - Fuente Única de Verdad para el estado de los usuarios
 * 
 * Responsabilidades:
 * - Mantener el mapa global de datos de usuarios (Persistence Layer)
 * - Gestionar la carga, guardado y sincronización con Firestore
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
        this.fileName = config.XP_DATA_FILENAME || 'xp_data.json';

        // Colección principal de usuarios
        this.users = new Map();

        // Mappings auxiliares
        this.nameMap = new Map(); // lowercaseUsername -> userId
        this.isLoaded = false;

        // Configuración de persistencia
        this.persistence = new PersistenceManager({
            saveCallback: (dirtyKeys) => this._performSaveTask(dirtyKeys),
            debounceMs: XP.SAVE_DEBOUNCE_MS || 120000,
            debug: this.config.DEBUG
        });

        // Caché de ranking resumido (Top 50)
        this.leaderboard = [];
        this.lastSystemUpdate = 0; // Para throttling de stats globales

        // Estadísticas globales de la comunidad
        this.communityStats = {
            totalXP: 0,
            totalMessages: 0,
            totalUsers: 0,
            averageLevel: 1,
            lastCalculated: null
        };

        // Tracker de sincronización para evitar datos anticuados (On-Demand)
        this.userLoadTimestamps = new Map(); // id -> timestamp

        // BROADCAST CHANNEL: Sincronización entre pestañas (OBS <-> Panel)
        this.channel = new BroadcastChannel('chat_twitch_sync');
        this.channel.onmessage = (event) => this._handleSyncMessage(event);

        // Seguridad: En modo test, deshabilitar la EMISIÓN de mensajes para no contaminar al widget real
        if (this.config.TEST_MODE) {
             // Sobrescribir postMessage con un stub vacío
             this.channel.postMessage = () => { /* Bloqueado en Modo Test */ };
             console.log('🔒 UserStateManager: BroadcastChannel saliente BLOQUEADO (Modo Test)');
        }

        // MEMORY EVICTION: Limpieza de usuarios inactivos en RAM
        this.lastAccessMap = new Map(); // id -> timestamp
        
        // Iniciar ciclo de limpieza (cada 30 min)
        setInterval(() => this._evictInactiveUsers(), 1800000);
    }

    /**
     * Carga inicial de datos desde Firestore
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
                    Object.entries(usersToLoad).forEach(([id, userData]) => {
                        // Evitar cargar basura
                        if (userData && (userData.xp !== undefined || userData.level !== undefined)) {
                            const sanitized = this._sanitizeUserData(userData);
                            this.users.set(id, sanitized);
                            
                            // Poblar nameMap para búsquedas por nombre (UI/Legacy)
                            if (sanitized.displayName) {
                                this.nameMap.set(sanitized.displayName.toLowerCase(), id);
                            } else if (isNaN(id)) {
                                // Es un ID de estilo antiguo (nombre de usuario)
                                this.nameMap.set(id.toLowerCase(), id);
                            }
                        }
                    });
                }
 else {
                    console.warn('⚠️ La estructura de datos recibida no es un objeto válido de usuarios:', usersToLoad);
                }
            } else {
                console.warn('⚠️ No se recibieron datos de ningún proveedor de almacenamiento.');
            }

            this.isLoaded = true;
            console.log(`✅ Usuarios procesados y listos: ${this.users.size}`);
            
            // Si venimos de una migración legacy, forzamos un guardado inmediato 
            // para que el usuario pueda ver las nuevas colecciones en su consola de Firebase.
            if (data && data.version === '1.2-migrated') {
                console.info('🚀 UserStateManager: Ejecutando guardado post-migración...');
                // Forzamos el guardado incluso si no hay 'dirtyKeys' porque es una migración masiva
                await this.saveImmediately(true);
            }

            console.groupEnd();
            
            // Integrar datos iniciales (subs importados)
            try {
                this._mergeInitialSubscribers();
            } catch(e) {
                console.warn('⚠️ Error fusionando suscriptores iniciales:', e);
            }

            // Cargar Leaderboard (Ranking resumido) para respuesta inmediata
            try {
                const lbData = await this.storage.load('leaderboard.json');
                if (lbData && lbData.topUsers) {
                    this.leaderboard = lbData.topUsers;
                    console.log(`🏆 Leaderboard cargado: ${this.leaderboard.length} usuarios en el Top`);
                }

                // Cargar Snapshot de Comunidad
                const commData = await this.storage.load('community_snapshot.json');
                if (commData) {
                    this.communityStats = { ...this.communityStats, ...commData };
                    console.log(`🌐 Stats de Comunidad cargadas: ${this.communityStats.totalXP} XP global`);
                }

                // INICIALIZACIÓN PROACTIVA: Si tenemos usuarios pero no documentos de sistema
                // generamos la primera versión ahora mismo para que aparezcan en Firestore.
                if (this.users.size > 0 && (this.leaderboard.length === 0 || !this.communityStats.lastCalculated)) {
                    console.info('🛠️ UserStateManager: Documentos de sistema no encontrados. Generando iniciales...');
                    // Esperamos a que ambos se creen para asegurar que aparecen en la consola
                    await this._updateLeaderboard();
                    await this._updateCommunityStats();
                }
            } catch (e) {
                console.warn('⚠️ No se pudieron cargar o inicializar datos globales:', e);
            }
            
            return true;
        } catch (error) {
            console.error('❌ UserStateManager: Error crítico cargando datos:', error);
            console.groupEnd();
            this.isLoaded = true;
            this._mergeInitialSubscribers();
        }
    }

    /**
     * Asegura que un usuario esté cargado en memoria.
     * Si no está, lo intenta cargar desde el storage de forma asíncrona.
     * @param {string} userId - ID de Twitch
     * @param {string} username - Nombre de usuario
     */
    async ensureUserLoaded(userId, username) {
        if (!userId && !username) return false;

        const strId = userId ? String(userId) : null;
        const lowerName = username ? username.toLowerCase() : null;
        const now = Date.now();
        const refreshInterval = TIMING.USER_REFRESH_INTERVAL_MS || 86400000;

        // 1. Ya está en memoria
        if ((strId && this.users.has(strId)) || (lowerName && this.nameMap.has(lowerName))) {
            const id = strId || this.nameMap.get(lowerName);
            const lastLoad = this.userLoadTimestamps.get(id) || 0;
            
            // Si el dato es fresco (menos de 24h), no hacemos nada
            if (now - lastLoad < refreshInterval) {
                return true;
            }
            // Si es antiguo (> 24h), continuamos para re-cargar del servidor
            Logger.debug('UserStateManager', `🔄 Refrescando datos de ${username} (Cache > 24h)`);
        }

        // 2. No está en memoria o es antiguo, cargar desde Firestore
        const idToLoad = strId || lowerName;
        try {
            const userData = await this.storage.loadUser(idToLoad);
            if (userData) {
                const sanitized = this._sanitizeUserData(userData);
                const finalId = strId || idToLoad;
                
                this.users.set(finalId, sanitized);
                this.userLoadTimestamps.set(finalId, now);
                this.lastAccessMap.set(finalId, now); // Para evitar eviction inmediato
                
                if (sanitized.displayName) {
                    this.nameMap.set(sanitized.displayName.toLowerCase(), finalId);
                }
                return true;
            }
        } catch (e) {
            console.warn(`UserStateManager: Usuario ${idToLoad} no encontrado en remoto o error.`);
        }

        return false;
    }

    /**
     * Obtiene los datos de un usuario por ID de Twitch.
     * Implementa 'Lazy Migration' para transferir datos de nombres de usuario antiguos a IDs numéricos.
     * 
     * @param {string} userId - ID numérico de Twitch
     * @param {string} username - Nombre de usuario actual
     */
    getUser(userId, username) {
        if (!userId) {
            // Fallback para sistemas que aún no pasan el ID (ej: bots o comandos manuales)
            // Intentamos buscar por nombre
            const existingId = this.nameMap.get(username.toLowerCase());
            if (existingId) return this.users.get(existingId);
            
            // Si no existe, usamos el username como ID temporal (Legacy compatible)
            userId = username.toLowerCase();
        }

        const strId = String(userId);
        const lowerName = username ? username.toLowerCase() : null;

        // 1. Caso Ideal: El usuario ya está indexado por su ID numérico
        if (this.users.has(strId)) {
            // Actualizar timestamp de acceso (Eviction)
            this.lastAccessMap.set(strId, Date.now());
            
            const data = this.users.get(strId);
            // Actualizar nombre visible por si cambió en Twitch (Solo si tenemos un nombre válido)
            if (username && lowerName) {
                data.displayName = username; 
                this.nameMap.set(lowerName, strId);
            }
            return data;
        }

        // 2. MIGRACIÓN PEREZOSA: Buscar si existe un documento antiguo con el nombre de usuario
        if (lowerName && this.nameMap.has(lowerName)) {
            const oldId = this.nameMap.get(lowerName);
            if (isNaN(oldId) || oldId === lowerName) {
                // Encontramos datos bajo el nombre del usuario (Estilo antiguo)
                console.info(`🔄 Migrando usuario ${username} de ID '${oldId}' a ID numérico '${strId}'`);
                const data = this.users.get(oldId);
                
                // Mover datos a la nueva clave numérica
                data.displayName = username;
                this.users.set(strId, data);
                this.users.delete(oldId);
                
                // Actualizar mapeos
                this.nameMap.set(lowerName, strId);
                
                // Marcar como "sucio" para que se guarde el nuevo ID en Firestore
                this.markDirty(strId);
                return data;
            }
        }

        // 3. Usuario totalmente nuevo
        const newUser = {
            displayName: username,
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
        };

        this.users.set(strId, newUser);
        this.nameMap.set(lowerName, strId);
        return newUser;
    }

    /**
     * Marca a un usuario como modificado usando su ID
     * @param {string} userIdOrName 
     */
    markDirty(userIdOrName) {
        const id = String(userIdOrName).toLowerCase();
        // Si nos pasan un nombre, intentamos resolver el ID real
        const finalId = this.users.has(id) ? id : (this.nameMap.get(id) || id);

        // Actualizar acceso para Eviction System
        this.lastAccessMap.set(finalId, Date.now());

        // Emitir cambio a otras pestañas
        const userData = this.users.get(finalId);
        if (userData) {
            this.channel.postMessage({
                type: 'USER_UPDATE',
                id: finalId,
                data: userData,
                timestamp: Date.now()
            });
        }
        
        this.persistence.markDirty(finalId);
    }

    /**
     * Maneja mensajes de sincronización de otras pestañas
     * @private
     */
    _handleSyncMessage(event) {
        const { type, id, data, timestamp } = event.data;
        if (type === 'USER_UPDATE' && id && data) {
            // Si la otra pestaña tiene datos más recientes, actualizamos la memoria local
            const localData = this.users.get(id);
            // Solo actualizamos si no tenemos el dato o si el dato remoto es más nuevo
            // (Usamos timestamp del evento como proxy de versión)
            if (!localData || !localData.lastUpdated || localData.lastUpdated < timestamp) {
                // Actualizamos en memoria
                this.users.set(id, data);
                if (data.displayName) {
                    this.nameMap.set(data.displayName.toLowerCase(), id);
                }
                // Actualizamos timestamp de acceso local también para que no se borre
                this.lastAccessMap.set(id, Date.now());
                this.userLoadTimestamps.set(id, Date.now()); // Lo tratamos como recién cargado
            }
        }
    }

    /**
     * Limpia usuarios inactivos de la memoria RAM (pero siguen en disco IndexedDB)
     * @private
     */
    _evictInactiveUsers() {
        const now = Date.now();
        const EVICTION_THRESHOLD = 3600000; // 1 hora de inactividad
        let evictedCount = 0;

        // Solo limpiamos si hay bastantes usuarios en memoria (> 200) para no perder tiempo
        if (this.users.size < 200) return;

        // Iterar sobre lastAccessMap para encontrar candidatos
        for (const [id, lastAccess] of this.lastAccessMap.entries()) {
            if (now - lastAccess > EVICTION_THRESHOLD) {
                // CRÍTICO: Verificar que NO tenga cambios pendientes de guardar
                if (!this.persistence.dirtyKeys.has(id)) {
                    // Borrar de memoria principal
                    this.users.delete(id);
                    // Borrar de mapeos auxiliares
                    this.lastAccessMap.delete(id);
                    this.userLoadTimestamps.delete(id); 
                    
                    // Nota: No limpiamos nameMap porque es ligero y útil para resoluciones rápidas
                    evictedCount++;
                }
            }
        }

        if (evictedCount > 0 && this.config.DEBUG) {
            console.debug(`🧹 UserStateManager: Liberados ${evictedCount} usuarios inactivos de la RAM.`);
        }
    }

    /**
     * Obtiene un usuario por nombre (Helper para búsquedas)
     */
    getUserByName(username) {
        const id = this.nameMap.get(username.toLowerCase());
        return id ? this.users.get(id) : null;
    }

    /**
     * Obtiene el mapa completo de usuarios (solo lectura recomendada)
     */
    getAllUsers() {
        return this.users;
    }

    /**
     * Sanitiza y valida los datos de un usuario para garantizar el esquema correcto.
     * Repara campos faltantes o tipos de datos incorrectos (Sanity Check).
     * @private
     */
    _sanitizeUserData(data) {
        if (!data || typeof data !== 'object') return this.getUser('default_new_user');

        // 1. Asegurar tipos numéricos básicos
        const xp = Math.max(0, parseInt(data.xp) || 0);
        const level = Math.max(1, parseInt(data.level) || 1);
        const totalMessages = Math.max(0, parseInt(data.totalMessages) || 0);
        const watchTimeMinutes = Math.max(0, parseInt(data.watchTimeMinutes) || 0);
        const subMonths = Math.max(0, parseInt(data.subMonths) || 0);
        const streakDays = Math.max(0, parseInt(data.streakDays) || 0);
        const bestStreak = Math.max(streakDays, parseInt(data.bestStreak) || 0);

        // 2. Limpiar y deduplicar logros
        let achievements = Array.isArray(data.achievements) ? data.achievements : [];
        if (achievements.length > 0) {
            const achSet = new Set();
            achievements = achievements.filter(ach => {
                const id = typeof ach === 'string' ? ach : (ach && ach.id);
                if (id && !achSet.has(id)) {
                    achSet.add(id);
                    return true;
                }
                return false;
            });
        }

        // 3. Validar objetos anidados
        const achievementStats = (data.achievementStats && typeof data.achievementStats === 'object') ? data.achievementStats : {};
        const activityHistory = (data.activityHistory && typeof data.activityHistory === 'object') ? data.activityHistory : {};

        // 4. Retornar objeto garantizado (Estructura de Night City)
        return {
            displayName: data.displayName || null, // Guardamos el nombre para visualización
            xp,
            level,
            totalMessages,
            watchTimeMinutes,
            subMonths,
            streakDays,
            bestStreak,
            lastActivity: data.lastActivity || null,
            lastStreakDate: data.lastStreakDate || null,
            achievements,
            achievementStats,
            activityHistory
        };
    }

    /**
     * Tarea de guardado (Estrategia Fetch-before-write)
     * @param {Set} dirtyKeys - Conjunto de usuarios que han cambiado
     * @private
     */
    async _performSaveTask(dirtyKeys = null) {
        try {
            // Caso especial: Si viene de PersistenceManager como un Set vacío, no hay nada que hacer
            if (dirtyKeys instanceof Set && dirtyKeys.size === 0) {
                return;
            }

            // 1. Preparar snapshot (Optimizado)
            const usersSnapshot = {};
            
            // Si hay dirtyKeys específicos, solo esos. 
            // Si es null, es un guardado forzado/migración (todos).
            if (dirtyKeys && dirtyKeys.size > 0) {
                dirtyKeys.forEach(id => {
                    const data = this.users.get(id);
                    if (data) {
                        usersSnapshot[id] = this._sanitizeUserData(data);
                    }
                });
            } else {
                this.users.forEach((data, id) => {
                    usersSnapshot[id] = this._sanitizeUserData(data);
                });
            }

            const count = Object.keys(usersSnapshot).length;
            if (count > 0) {
                console.log(`💾 UserStateManager: Guardando snapshot de ${count} usuarios...`);
                await this.storage.save(this.fileName, {
                    users: usersSnapshot,
                    lastUpdated: new Date().toISOString(),
                    version: '1.2'
                }, dirtyKeys);

                // ACTUALIZACIÓN DE LEADERBOARD Y STATS (Con Throttling de 12 horas)
                const now = Date.now();
                const interval = TIMING.SYSTEM_UPDATE_INTERVAL_MS || 43200000;
                if (now - this.lastSystemUpdate > interval || dirtyKeys === null) {
                    await this._updateLeaderboard();
                    await this._updateCommunityStats();
                    this.lastSystemUpdate = now;
                }
            }

        } catch (error) {
            console.error('❌ UserStateManager: Fallo en ciclo de persistencia:', error);
            throw error;
        }
    }

    /**
     * Calcula y guarda el Top 50 en un documento independiente
     * @private
     */
    async _updateLeaderboard() {
        try {
            // 1. Calcular el Top 50 desde la memoria actual (Limpiando undefineds)
            const top50 = Array.from(this.users.entries())
                .map(([id, data]) => ({
                    id,
                    username: data.displayName || id,
                    xp: data.xp || 0,
                    level: data.level || 1
                }))
                .sort((a, b) => {
                    const levelDiff = (b.level || 0) - (a.level || 0);
                    if (levelDiff !== 0) return levelDiff;
                    return (b.xp || 0) - (a.xp || 0);
                })
                .slice(0, 50);

            this.leaderboard = top50;

            // 2. Guardar en Firestore como documento único
            const success = await this.storage.save('leaderboard.json', {
                topUsers: top50,
                count: this.users.size
            });

            if (success && this.config.DEBUG) console.log('🏆 Leaderboard (Top 50) actualizado con éxito');
        } catch (error) {
            console.error('❌ Error actualizando leaderboard:', error);
        }
    }

    /**
     * Calcula y guarda las estadísticas globales de la comunidad
     * @private
     */
    async _updateCommunityStats() {
        try {
            let totalXP = 0;
            let totalMessages = 0;
            let sumLevels = 0;
            const count = this.users.size;

            this.users.forEach(u => {
                totalXP += (u.xp || 0);
                totalMessages += (u.totalMessages || 0);
                sumLevels += (u.level || 1);
            });

            const stats = {
                totalXP,
                totalMessages,
                totalUsers: count,
                averageLevel: count > 0 ? Math.round((sumLevels / count) * 10) / 10 : 1,
                lastCalculated: new Date().toISOString()
            };

            this.communityStats = stats;

            // Guardar en Firestore como snapshot de sistema
            await this.storage.save('community_snapshot.json', stats);

            if (this.config.DEBUG) console.log('🌐 Snapshot de comunidad actualizado en Firestore');
        } catch (error) {
            console.error('❌ Error actualizando community stats:', error);
        }
    }

    /**
     * Fusiona cambios remotos sin perder progreso local nuevo
     * @private
     */
    _mergeRemoteChanges(remoteUsers) {
        Object.entries(remoteUsers).forEach(([id, remoteData]) => {
            const localData = this.users.get(id);

            if (!localData) {
                this.users.set(id, remoteData);
                // Si es un ID numérico, intentar registrarlo en el nameMap si tiene displayName
                if (!isNaN(id) && remoteData.displayName) {
                    this.nameMap.set(remoteData.displayName.toLowerCase(), id);
                }
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
                
                this.users.set(id, localData);
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
            if (!username) return; // Validación básica
            
            // getUser maneja internamente la lógica de ID.
            // Al ser una importación inicial estática, asumimos que el username 
            // es lo suficientemente bueno para buscar/crear el registro.
            const userData = this.getUser(null, username); 
            
            if (userData && (!userData.subMonths || userData.subMonths < months)) {
                userData.subMonths = months;
                this.markDirty(username);
            }
        });
    }

    /**
     * Fuerza el guardado inmediato de los datos
     * @param {boolean} force - Forzar el guardado aunque no haya cambios pendientes
     */
    async saveImmediately(force = false) {
        await this.persistence.saveImmediately(force);
    }

    /**
     * Reset total (Uso administrativo)
     */
    async resetAll() {
        this.users.clear();
        await this.saveImmediately();
        console.warn('⚠️ UserStateManager: Base de datos reseteada');
    }

    async resetAll() {
        this.users.clear();
        await this.saveImmediately();
        console.warn('⚠️ UserStateManager: Base de datos reseteada');
    }
}
