import StreakManager from './StreakManager.js';
import LevelCalculator from './LevelCalculator.js';
import XPSourceEvaluator from './XPSourceEvaluator.js';
import PersistenceManager from './PersistenceManager.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import { XP } from '../constants/AppConstants.js';
import { INITIAL_SUBSCRIBERS } from '../data/subscribers.js';

/**
 * ExperienceService - Sistema de Gestión de Experiencia (XP)
 * 
 * Responsabilidades:
 * - Trackear actividad de usuarios y asignar XP
 * - Calcular niveles basados en XP acumulado
 * - Detectar level-ups y emitir eventos
 * - Gestionar fuentes de XP extensibles
 * 
 * @class ExperienceService
 */
export default class ExperienceService {
    /**
     * Constructor del servicio de experiencia
     * @param {Object} config - Configuración global
     * @param {GistStorageService} storageService - Servicio de persistencia
     */
    constructor(config, storageService) {
        this.config = config;
        this.storageService = storageService;

        // Cache local de datos de usuarios
        this.usersXP = new Map();

        // Registro de última actividad por usuario (para cooldowns y bonus)
        this.lastActivity = new Map();

        // Registro de mensajes del día actual (para bonus primer mensaje)
        this.dailyFirstMessage = new Map();

        // Queues y Locks (Ahora gestionados por PersistenceManager)
        this.isLoaded = false;

        // Configuración de XP (extensible)
        this.xpConfig = this.initXPConfig();
        
        // Inicializar Gestores Especializados
        this.streakManager = new StreakManager(this.xpConfig);
        this.levelCalculator = new LevelCalculator();
        this.xpEvaluator = new XPSourceEvaluator(this.xpConfig);
        
        // Gestor de Persistencia
        this.persistence = new PersistenceManager({
            saveCallback: () => this._performSaveTask(),
            debounceMs: this.xpConfig.settings.saveDebounceMs,
            debug: this.config.DEBUG
        });

        this.currentDay = this.streakManager.getCurrentDay();
    }

    /**
     * Inicializa la configuración de fuentes de XP
     * Estructura extensible para añadir nuevas fuentes
     * @returns {Object}
     */
    initXPConfig() {
        return {
            // Fuentes base de XP
            sources: {
                MESSAGE: {
                    id: 'message',
                    name: 'Mensaje enviado',
                    xp: 5,
                    cooldownMs: 0, // Sin cooldown
                    enabled: true
                },
                FIRST_MESSAGE_DAY: {
                    id: 'first_message_day',
                    name: 'Primer mensaje del día',
                    xp: 20,
                    cooldownMs: 0,
                    enabled: true
                },
                STREAM_ACTIVE: {
                    id: 'stream_active',
                    name: 'Mensaje durante stream',
                    xp: 10,
                    cooldownMs: 0,
                    enabled: true
                },
                EMOTE_USED: {
                    id: 'emote_used',
                    name: 'Uso de emote',
                    xp: 2,
                    maxPerMessage: 5, // Máximo 5 emotes dan XP por mensaje
                    cooldownMs: 0,
                    enabled: true
                },
                STREAK_BONUS: {
                    id: 'streak_bonus',
                    name: 'Racha de participación',
                    xp: 50,
                    streakDays: 3, // 3+ días seguidos
                    cooldownMs: 0,
                    enabled: true
                },
                STREAM_START: {
                    id: 'stream_start',
                    name: 'Mensaje al inicio del stream',
                    xp: 25,
                    windowMinutes: 5, // Primeros 5 minutos
                    cooldownMs: 0,
                    enabled: true
                },
                MENTION_USER: {
                    id: 'mention_user',
                    name: 'Mención a otro usuario',
                    xp: 8,
                    cooldownMs: 0,
                    enabled: true
                },
                WATCH_TIME: {
                    id: 'watch_time',
                    name: 'Tiempo de visualización',
                    xp: 10,
                    cooldownMs: 0, // Gestionado por intervalo de 10 min (1 XP/min)
                    enabled: true
                }
            },

            // Configuración global
            settings: {
                minTimeBetweenXP: XP.MIN_TIME_BETWEEN_XP_MS, // 1 segundo mínimo entre ganancias de XP
                saveDebounceMs: XP.SAVE_DEBOUNCE_MS,   // Guardar cada 5 segundos máximo
                maxXPPerMessage: XP.MAX_XP_PER_MESSAGE    // Límite de XP por mensaje individual
            },

            // Multiplicadores de racha (días -> multiplicador)
            streakMultipliers: [
                { minDays: 20, multiplier: 3.0 },   // 20+ días = x3
                { minDays: 10, multiplier: 2.0 },   // 10+ días = x2
                { minDays: 5, multiplier: 1.5 },    // 5+ días = x1.5
                { minDays: 3, multiplier: 1.2 },    // 3+ días = x1.2
                { minDays: 0, multiplier: 1.0 }     // Default = x1
            ],

            // Recompensas fijas por logros
            achievementRewards: XP.ACHIEVEMENT_REWARDS || {
                common: 50,
                uncommon: 75,
                rare: 150,
                epic: 250,
                legendary: 500
            }
        };
    }


    /**
     * Carga los datos de XP desde el storage
     * @returns {Promise<void>}
     */
    async loadData() {
        try {
            const data = await this.storageService.loadXPData();

            if (data && data.users) {
                // Cargar datos de usuarios con sanitización inmediata
                Object.entries(data.users).forEach(([username, userData]) => {
                    // Sanitización de LOGROS (Deduplicar si vinieran corruptos del Gist)
                    let achievements = userData.achievements || [];
                    if (Array.isArray(achievements) && achievements.length > 0) {
                        const achMap = new Map();
                        achievements.forEach(ach => {
                            const id = typeof ach === 'string' ? ach : ach.id;
                            if (id && !achMap.has(id)) achMap.set(id, ach);
                        });
                        achievements = Array.from(achMap.values());
                    }

                    this.usersXP.set(username.toLowerCase(), {
                        xp: userData.xp || 0,
                        level: userData.level || 1,
                        lastActivity: userData.lastActivity || null,
                        streakDays: userData.streakDays || 0,
                        bestStreak: userData.bestStreak || userData.streakDays || 0,
                        lastStreakDate: userData.lastStreakDate || null,
                        totalMessages: userData.totalMessages || 0,
                        achievements: achievements,
                        achievementStats: userData.achievementStats || {},
                        activityHistory: userData.activityHistory || {},
                        watchTimeMinutes: userData.watchTimeMinutes || 0
                    });
                });
            }

            this.isLoaded = true;
            console.log(`✅ XP Data cargado: ${this.usersXP.size} usuarios`);
            
            // Cargar datos importados de sub
            this._mergeInitialSubscribers();

        } catch (error) {
            console.error('❌ Error al cargar XP data:', error);
            this.isLoaded = true; // Continuar sin datos previos
            // Intentar cargar subs incluso si falló la carga remota
            this._mergeInitialSubscribers();
        }
    }

    /**
     * Tarea de guardado real (llamada por PersistenceManager)
     * Implementa estrategia "Fetch-before-write" para integridad de datos
     * @private
     */
    async _performSaveTask() {
        try {
            // 1. Sincronizar primero: Descargar versión más reciente del Gist
            // Esto asegura que no borramos cambios hechos desde otro dispositivo
            const remoteData = await this.storageService.loadXPData(true);
            
            if (remoteData && remoteData.users) {
                this._mergeRemoteChanges(remoteData.users);
                if (this.config.DEBUG) console.log('🔄 ExperienceService: Datos remotos fusionados antes de guardar');
            }

            // 2. Preparar snapshot unificado para subir
            const usersData = {};
            this.usersXP.forEach((data, username) => {
                usersData[username] = data;
            });

            // 3. Guardar en Gist (PATCH simple sin headers de precondición)
            await this.storageService.saveXPData({
                users: usersData,
                lastUpdated: new Date().toISOString(),
                version: '1.0'
            });

        } catch (error) {
            console.error('❌ ExperienceService: Error crítico en ciclo de persistencia:', error);
            throw error;
        }
    }

    /**
     * Fusiona cambios remotos con los locales sin perder progreso nuevo
     * @private
     */
    _mergeRemoteChanges(remoteUsers) {
        Object.entries(remoteUsers).forEach(([username, remoteData]) => {
            const lowerUser = username.toLowerCase();
            const localData = this.usersXP.get(lowerUser);

            if (!localData) {
                // El usuario es nuevo en el remoto, lo añadimos
                this.usersXP.set(lowerUser, remoteData);
            } else {
                // 1. Criterio de Fusión Base: Conservar siempre el mayor progreso
                localData.xp = Math.max(localData.xp || 0, remoteData.xp || 0);
                localData.level = Math.max(localData.level || 1, remoteData.level || 1);
                localData.totalMessages = Math.max(localData.totalMessages || 0, remoteData.totalMessages || 0);
                localData.watchTimeMinutes = Math.max(localData.watchTimeMinutes || 0, remoteData.watchTimeMinutes || 0);
                localData.streakDays = Math.max(localData.streakDays || 0, remoteData.streakDays || 0);
                localData.bestStreak = Math.max(localData.bestStreak || 0, remoteData.bestStreak || 0);
                localData.subMonths = Math.max(localData.subMonths || 0, remoteData.subMonths || 0);

                // 2. Mezclar LOGROS (Deduplicar por ID)
                // Usamos un Map para asegurar que solo hay un objeto por logro ID
                const achMap = new Map();
                const allAchievements = [
                    ...(remoteData.achievements || []),
                    ...(localData.achievements || [])
                ];

                allAchievements.forEach(ach => {
                    const id = typeof ach === 'string' ? ach : ach.id;
                    if (!id) return;
                    
                    // Si ya existe, nos quedamos con el que tenga fecha (prioridad al remoto si ya estaba)
                    if (!achMap.has(id)) {
                        achMap.set(id, ach);
                    }
                });
                localData.achievements = Array.from(achMap.values());

                // 3. Mezclar ACHIEVEMENT STATS (Contadores internos)
                if (remoteData.achievementStats) {
                    if (!localData.achievementStats) localData.achievementStats = {};
                    Object.entries(remoteData.achievementStats).forEach(([key, val]) => {
                        if (typeof val === 'number') {
                            localData.achievementStats[key] = Math.max(localData.achievementStats[key] || 0, val);
                        } else if (val && !localData.achievementStats[key]) {
                            // Para booleanos o arrays (como holidays)
                            localData.achievementStats[key] = val;
                        }
                    });
                }

                // 4. Mezclar ACTIVITY HISTORY (Heatmaps)
                if (remoteData.activityHistory) {
                    if (!localData.activityHistory) localData.activityHistory = {};
                    Object.entries(remoteData.activityHistory).forEach(([date, dayData]) => {
                        if (!localData.activityHistory[date]) {
                            localData.activityHistory[date] = dayData;
                        } else {
                            const localDay = localData.activityHistory[date];
                            localDay.messages = Math.max(localDay.messages || 0, dayData.messages || 0);
                            localDay.xp = Math.max(localDay.xp || 0, dayData.xp || 0);
                            localDay.watchTime = Math.max(localDay.watchTime || 0, dayData.watchTime || 0);
                        }
                    });
                }

                // 5. Actualizar timestamp de actividad al más reciente
                const remoteTime = remoteData.lastActivity ? new Date(remoteData.lastActivity).getTime() : 0;
                const localTime = localData.lastActivity ? new Date(localData.lastActivity).getTime() : 0;
                localData.lastActivity = Math.max(localTime, remoteTime);
                
                this.usersXP.set(lowerUser, localData);
            }
        });
    }

    /**
     * Trackea un mensaje y asigna XP correspondiente
     * Punto de entrada principal para actividad
     * 
     * @param {string} username - Nombre del usuario
     * @param {Object} context - Contexto del mensaje
     * @param {boolean} context.hasEmotes - Si el mensaje tiene emotes
     * @param {number} context.emoteCount - Cantidad de emotes
     * @param {boolean} context.isStreamLive - Si el stream está activo
     * @param {boolean} context.isStreamStart - Si es inicio de stream
     * @param {boolean} context.hasMention - Si menciona a otro usuario
     * @returns {Object} Resultado del tracking
     */
    trackMessage(username, context = {}) {
        const lowerUser = username.toLowerCase();

        // Verificar blacklist global (no trackear nada)
        if ((this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(lowerUser)) || lowerUser.startsWith('justinfan')) {
            return {
                username: lowerUser,
                xpGained: 0,
                xpBeforeMultiplier: 0,
                xpSources: [],
                totalXP: 0,
                level: 1,
                previousLevel: 1,
                leveledUp: false,
                levelProgress: 0,
                levelTitle: 'BLACKLISTED',
                streakDays: 0,
                streakMultiplier: 0
            };
        }

        // Resetear día si cambió
        this.checkDayReset();

        // Obtener o crear datos del usuario
        let userData = this.getUserData(lowerUser);

        // Verificar cooldown global de XP
        const now = Date.now();
        if (userData.lastActivity && (now - userData.lastActivity) < this.xpConfig.settings.minTimeBetweenXP) {
            return {
                username: lowerUser,
                xpGained: 0,
                xpBeforeMultiplier: 0,
                xpSources: [],
                totalXP: userData.xp,
                level: userData.level,
                previousLevel: userData.level,
                leveledUp: false,
                levelProgress: this.levelCalculator.getLevelProgress(userData.xp, userData.level),
                levelTitle: this.levelCalculator.getLevelTitle(userData.level),
                streakDays: userData.streakDays || 0,
                streakMultiplier: this.streakManager.getStreakMultiplier(userData.streakDays || 0)
            };
        }

        const previousLevel = userData.level;

        // Verificar si el usuario está excluido de bonos (bots, admin, etc.)
        const ignoredForBonus = (this.config.XP_IGNORED_USERS_FOR_BONUS || [])
            .map(u => u.toLowerCase())
            .includes(lowerUser);

        // 1. Determinar Racha (Necesario antes de evaluar XP para el multiplicador y el bono)
        let streakResult = {
            streakDays: userData.streakDays || 0,
            lastStreakDate: userData.lastStreakDate,
            bonusAwarded: false
        };

        if (!ignoredForBonus) {
            streakResult = this.streakManager.updateStreak(userData);
        }

        // 2. Evaluar XP ganado de cada fuente usando la Fábrica
        const evaluationState = {
            isIgnoredForBonus: ignoredForBonus,
            isFirstMessageOfDay: !this.dailyFirstMessage.has(lowerUser),
            streakBonusAwarded: streakResult.bonusAwarded
        };

        const evaluation = this.xpEvaluator.evaluateMessage(context, evaluationState);
        let totalXP = evaluation.totalXP;
        const xpSources = evaluation.sources;

        // Registrar primer mensaje del día si fue otorgado
        if (evaluationState.isFirstMessageOfDay && !ignoredForBonus) {
            this.dailyFirstMessage.set(lowerUser, true);
        }

        // 3. Aplicar multiplicador de racha
        const streakMultiplier = this.streakManager.getStreakMultiplier(streakResult.streakDays);
        const xpBeforeMultiplier = totalXP;
        totalXP = Math.floor(totalXP * streakMultiplier);

        // Aplicar límite máximo por mensaje (después del multiplicador)
        totalXP = Math.min(totalXP, this.xpConfig.settings.maxXPPerMessage * streakMultiplier);

        // Actualizar datos del usuario
        userData.xp += totalXP;
        userData.totalMessages += 1;
        userData.lastActivity = Date.now();
        userData.streakDays = streakResult.streakDays;
        userData.lastStreakDate = streakResult.lastStreakDate;
        userData.bestStreak = streakResult.bestStreak || userData.bestStreak || 0;

        // Registrar actividad diaria para heatmap
        const today = this.streakManager.getCurrentDay();
        if (!userData.activityHistory) {
            userData.activityHistory = {};
        }
        if (!userData.activityHistory[today]) {
            userData.activityHistory[today] = { messages: 0, xp: 0 };
        }
        userData.activityHistory[today].messages += 1;
        userData.activityHistory[today].xp += totalXP;

        // Recalcular nivel
        const newLevel = this.levelCalculator.calculateLevel(userData.xp);
        userData.level = newLevel;

        // Guardar datos actualizados vía Gestor de Persistencia
        this.usersXP.set(lowerUser, userData);
        this.persistence.markDirty(lowerUser);

        // Emitir evento de ganancia de XP para sincronizar UI
        EventManager.emit(EVENTS.USER.XP_GAINED, {
            username: lowerUser,
            amount: totalXP,
            total: userData.xp
        });

        // Detectar level-up
        const leveledUp = newLevel > previousLevel;
        if (leveledUp) {
            EventManager.emit(EVENTS.USER.LEVEL_UP, {
                username,
                oldLevel: previousLevel,
                newLevel,
                totalXP: userData.xp,
                title: this.levelCalculator.getLevelTitle(newLevel),
                timestamp: Date.now()
            });
        }

        return {
            username: lowerUser,
            xpGained: totalXP,
            xpBeforeMultiplier,
            xpSources,
            totalXP: userData.xp,
            xp: userData.xp, // Alias para compatibilidad
            level: newLevel,
            previousLevel,
            leveledUp,
            progress: this.levelCalculator.getLevelProgress(userData.xp, newLevel),
            levelProgress: this.levelCalculator.getLevelProgress(userData.xp, newLevel), // Alias
            title: this.levelCalculator.getLevelTitle(newLevel),
            levelTitle: this.levelCalculator.getLevelTitle(newLevel), // Alias
            streakDays: userData.streakDays || 0,
            streakMultiplier,
            achievements: userData.achievements || [],
            totalMessages: userData.totalMessages
        };
    }

    /**
     * Obtiene los datos de un usuario, creando entrada si no existe
     * @param {string} username - Nombre del usuario (lowercase)
     * @returns {Object}
     */
    getUserData(username) {
        const lowerUser = username.toLowerCase();



        if (!this.usersXP.has(lowerUser)) {
            this.usersXP.set(lowerUser, {
                xp: 0,
                level: 1,
                lastActivity: null,
                streakDays: 0,
                bestStreak: 0,
                lastStreakDate: null,
                totalMessages: 0,
                achievements: [],
                achievementStats: {},
                activityHistory: {}, // { "YYYY-MM-DD": { messages: N, xp: N } }
                watchTimeMinutes: 0,
                watchTimeLog: {},
                subMonths: 0 // New field for subscription tracking
            });
        }

        // ================= TEST DATA FOR LIIUKIIN =================
        // Si el usuario es Liiukiin, asegurar que tenga tiempo inicial para pruebas
        if (lowerUser === 'liiukiin') {
            const liiukiinData = this.usersXP.get(lowerUser);
            if (!liiukiinData.watchTimeMinutes || liiukiinData.watchTimeMinutes < 120) {
                liiukiinData.watchTimeMinutes = 120; // 2 horas iniciales
            }
        }
        // ==========================================================

        // Ensure activityHistory and bestStreak exist for older users
        const userData = this.usersXP.get(lowerUser);
        if (!userData.activityHistory) {
            userData.activityHistory = {};
        }
        if (userData.bestStreak === undefined) {
            userData.bestStreak = userData.streakDays || 0;
        }

        return userData;
    }

    /**
     * Actualiza el tiempo de suscripción de un usuario
     * @param {string} username 
     * @param {number} months 
     */
    updateSubscription(username, months) {
        const lowerUser = username.toLowerCase();
        const userData = this.getUserData(lowerUser);

        // Si el valor es nuevo o mayor, actualizar y guardar
        // (A veces la API devuelve 0 o null si es gift sub reciente, pero si tenemos un valor mayor guardado, lo mantenemos)
        if (months > (userData.subMonths || 0)) {
            userData.subMonths = months;
            this.persistence.markDirty(lowerUser);
        }
    }

    /**
     * Añade tiempo de visualización a un usuario y otorga XP pasiva
     * @param {string} username 
     * @param {number} minutes 
     */
    addWatchTime(username, minutes) {
        const lowerUser = username.toLowerCase();

        // Verificar blacklist global
        if ((this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(lowerUser)) || lowerUser.startsWith('justinfan')) {
            return null;
        }

        const userData = this.getUserData(lowerUser);

        // 1. Sumar tiempo
        if (!userData.watchTimeMinutes) userData.watchTimeMinutes = 0;
        userData.watchTimeMinutes += minutes;

        // ACTUALIZAR ÚLTIMA ACTIVIDAD
        // Esto corrige el problema de "datos antiguos" en Face Off para lurkers
        userData.lastActivity = Date.now();

        // 2. Otorgar XP Pasiva (10 XP cada 10 mins)
        // Ratio: 1.0 XP por minuto
        const xpEarned = Math.floor(minutes * 1.0);

        if (xpEarned > 0) {
            userData.xp += xpEarned;

            // Verificar Level Up (sin emitir evento visual completo para no interrumpir)
            const newLevel = this.levelCalculator.calculateLevel(userData.xp);
            if (newLevel > userData.level) {
                userData.level = newLevel;
            }
        }

        // Registrar tiempo visualizado en el historial diario
        const today = this.streakManager.getCurrentDay();
        if (!userData.activityHistory) {
            userData.activityHistory = {};
        }
        if (!userData.activityHistory[today]) {
            userData.activityHistory[today] = { messages: 0, xp: 0, watchTime: 0 };
        }
        if (!userData.activityHistory[today].watchTime) {
            userData.activityHistory[today].watchTime = 0;
        }
        userData.activityHistory[today].watchTime += minutes;
        // También sumar el XP ganado al historial diario
        userData.activityHistory[today].xp = (userData.activityHistory[today].xp || 0) + xpEarned;

        // 4. Guardar vía Gestor de Persistencia
        this.persistence.markDirty(lowerUser);

        // Emitir evento de ganancia de XP (pasiva)
        EventManager.emit(EVENTS.USER.XP_GAINED, {
            username: lowerUser,
            amount: xpEarned,
            total: userData.xp,
            passive: true
        });

        return {
            totalTime: userData.watchTimeMinutes,
            xpAdded: xpEarned,
            userData
        };
    }

    /**
     * Añade XP fija por desbloqueo de logro (No afectado por multiplicadores)
     * @param {string} username 
     * @param {string} rarity - Rarity del logro (common, uncommon, etc.)
     * @returns {number} XP ganada
     */
    addAchievementXP(username, rarity) {
        const lowerUser = username.toLowerCase();
        
        // Verificar blacklist global
        if ((this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(lowerUser)) || lowerUser.startsWith('justinfan')) {
            return 0;
        }

        const userData = this.getUserData(lowerUser);
        const xpToGain = this.xpConfig.achievementRewards[rarity] || 50;

        const previousLevel = userData.level;
        userData.xp += xpToGain;

        // Recalcular nivel
        const newLevel = this.levelCalculator.calculateLevel(userData.xp);
        userData.level = newLevel;

        this.persistence.markDirty(lowerUser);

        // Emitir evento de ganancia de XP (marcado como pasivo/fijo para no aplicar efectos de racha en UI)
        EventManager.emit(EVENTS.USER.XP_GAINED, {
            username: lowerUser,
            amount: xpToGain,
            total: userData.xp,
            passive: true,
            source: 'achievement'
        });

        // Detectar level-up
        if (newLevel > previousLevel) {
            EventManager.emit(EVENTS.USER.LEVEL_UP, {
                username,
                oldLevel: previousLevel,
                newLevel,
                totalXP: userData.xp,
                title: this.levelCalculator.getLevelTitle(newLevel),
                timestamp: Date.now()
            });
        }

        return xpToGain;
    }

    /**
     * Verifica si el día cambió y resetea contadores diarios
     */
    checkDayReset() {
        const today = this.streakManager.getCurrentDay();
        if (today !== this.currentDay) {
            this.currentDay = today;
            this.dailyFirstMessage.clear();
        }
    }

    onLevelUp(callback) {
        return EventManager.on(EVENTS.USER.LEVEL_UP, callback);
    }



    /**
     * Obtiene información completa de XP de un usuario
     * @param {string} username - Nombre del usuario
     * @returns {Object} Información de XP
     */
    getUserXPInfo(username) {
        const userData = this.getUserData(username.toLowerCase());
        const progress = this.levelCalculator.getLevelProgress(userData.xp, userData.level);

        return {
            username: username.toLowerCase(),
            xp: userData.xp,
            level: userData.level,
            title: this.levelCalculator.getLevelTitle(userData.level),
            progress,
            streakDays: userData.streakDays || 0,
            streakMultiplier: this.streakManager.getStreakMultiplier(userData.streakDays || 0),
            totalMessages: userData.totalMessages,
            achievements: userData.achievements
        };
    }

    /**
     * Obtiene estadísticas de tiempo de visualización de un usuario
     * @param {string} username - Nombre del usuario
     * @param {string} period - Periodo ('total', 'week', 'month') - Por ahora solo soporta 'total'
     * @returns {number} Minutos visualizados
     */
    getWatchTimeStats(username, period = 'total') {
        const userData = this.getUserData(username);

        // Por ahora retornamos el total. 
        // Implementar lógica de periodos si activityHistory se parsea correctamente.
        return userData.watchTimeMinutes || 0;
    }

    /**
     * Obtiene el leaderboard de XP
     * @param {number} limit - Cantidad de usuarios a retornar
     * @returns {Array} Lista ordenada de usuarios
     */
    getXPLeaderboard(limit = 10) {
        const users = Array.from(this.usersXP.entries())
            .map(([username, data]) => ({
                username,
                xp: data.xp,
                level: data.level,
                title: this.levelCalculator.getLevelTitle(data.level)
            }))
            .sort((a, b) => b.xp - a.xp)
            .slice(0, limit);

        return users;
    }

    /**
     * Añade una nueva fuente de XP
     * @param {string} id - ID único de la fuente
     * @param {Object} config - Configuración de la fuente
     */
    addXPSource(id, config) {
        this.xpConfig.sources[id.toUpperCase()] = {
            id: id.toLowerCase(),
            name: config.name || id,
            xp: config.xp || 0,
            cooldownMs: config.cooldownMs || 0,
            enabled: config.enabled !== false,
            ...config
        };
    }

    /**
     * Modifica una fuente de XP existente
     * @param {string} id - ID de la fuente
     * @param {Object} changes - Cambios a aplicar
     */
    updateXPSource(id, changes) {
        const key = id.toUpperCase();
        if (this.xpConfig.sources[key]) {
            Object.assign(this.xpConfig.sources[key], changes);
        }
    }

    /**
     * Añade tiempo de visualización a los usuarios activos (Batch)
     * @param {Array} chatters - Lista de nombres de usuario
     * @param {number} minutes - Minutos a añadir (default: 1)
     */
    addWatchTimeBatch(chatters, minutes = 1) {
        if (!chatters || !Array.isArray(chatters)) return;

        let updatedCount = 0;
        const xpPerMinute = 1.0;
        const totalXP = Math.floor(minutes * xpPerMinute);

        chatters.forEach(username => {
            const lowerUser = username.toLowerCase();

            // Ignorar bots blaclisted y justinfan
            if ((this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(lowerUser)) || lowerUser.startsWith('justinfan')) return;

            const userData = this.getUserData(lowerUser);

            // Incrementar tiempo
            userData.watchTimeMinutes = (userData.watchTimeMinutes || 0) + minutes;

            // ACTUALIZAR ÚLTIMA ACTIVIDAD
            userData.lastActivity = Date.now();

            // Otorgar XP Pasiva
            if (totalXP > 0) {
                userData.xp += totalXP;

                // Verificar Level Up silencioso
                const newLevel = this.levelCalculator.calculateLevel(userData.xp);
                if (newLevel > userData.level) {
                   userData.level = newLevel;
                }
            }

            // Registrar en historial diario
            const today = this.streakManager.getCurrentDay();
            if (!userData.activityHistory) userData.activityHistory = {};
            if (!userData.activityHistory[today]) {
                userData.activityHistory[today] = { messages: 0, xp: 0, watchTime: 0 };
            }
            if (!userData.activityHistory[today].watchTime) {
                userData.activityHistory[today].watchTime = 0;
            }
            
            userData.activityHistory[today].watchTime += minutes;
            userData.activityHistory[today].xp = (userData.activityHistory[today].xp || 0) + totalXP;

            this.persistence.markDirty(lowerUser);

            // Emitir evento para actualización de UI
            EventManager.emit(EVENTS.USER.XP_GAINED, {
                username: lowerUser,
                amount: totalXP,
                total: userData.xp,
                passive: true
            });

            updatedCount++;
        });

        if (this.config.DEBUG && updatedCount > 0) {
            console.log(`⏱️ Watch time updated for ${updatedCount} users (+${minutes}m, +${totalXP}xp)`);
        }
    }

    /**
     * Obtiene estadísticas globales
     * @returns {Object}
     */
    getGlobalStats() {
        let totalXP = 0;
        let totalMessages = 0;
        let highestLevel = 1;

        this.usersXP.forEach(data => {
            totalXP += data.xp;
            totalMessages += data.totalMessages;
            if (data.level > highestLevel) highestLevel = data.level;
        });

        return {
            totalUsers: this.usersXP.size,
            totalXP,
            totalMessages,
            highestLevel,
            averageXP: this.usersXP.size > 0 ? Math.floor(totalXP / this.usersXP.size) : 0
        };
    }

    /**
     * Resetea todos los datos de XP (Local y Remoto)
     * ACCIÓN DESTRUCTIVA
     */
    async resetAllData() {
        this.usersXP.clear();
        this.lastActivity.clear();
        this.dailyFirstMessage.clear();

        // Forzar guardado de estado vacío
        await this.persistence.saveImmediately();
        console.log('☢️ SYSTEM PURGE: ALL XP DATA CLEARED');
    }

    /**
     * Devuelve todos los datos como JSON para exportación
     */
    getAllDataJSON() {
        const usersData = {};
        this.usersXP.forEach((data, username) => {
            usersData[username] = data;
        });

        return JSON.stringify({
            users: usersData,
            lastUpdated: new Date().toISOString(),
            version: '1.0'
        }, null, 2);
    }

    /**
     * Fusiona los datos iniciales de suscriptores (Importación CSV)
     * @private
     */
    _mergeInitialSubscribers() {
        if (!INITIAL_SUBSCRIBERS) return;

        let updatedCount = 0;
        Object.entries(INITIAL_SUBSCRIBERS).forEach(([username, months]) => {
            const lowerUser = username.toLowerCase();
            const userData = this.getUserData(lowerUser); // Creates if not exists

            if (!userData.subMonths || userData.subMonths < months) {
                userData.subMonths = months;
                this.persistence.markDirty(lowerUser);
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            console.log(`📥 Importados datos de suscripción para ${updatedCount} usuarios.`);
        }
    }
}
