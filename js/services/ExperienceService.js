import StreakManager from './StreakManager.js';
import LevelCalculator from './LevelCalculator.js';
import XPSourceEvaluator from './XPSourceEvaluator.js';
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
 */
export default class ExperienceService {

    /**
     * Constructor del servicio de experiencia
     * @param {Object} config - Configuración global
     * @param {UserStateManager} stateManager - Gestor de estado de usuarios
     */
    constructor(config, stateManager) {
        this.config = config;
        this.stateManager = stateManager;

        // Registro de mensajes del día actual (para bonus primer mensaje)
        this.dailyFirstMessage = new Map();

        // Registro de usuarios que ya mostraron "Welcome Back" esta sesión
        this.sessionReturningShown = new Set();

        // Configuración de XP (extensible)
        this.xpConfig = this.initXPConfig();
        
        // Inicializar Gestores Especializados
        this.streakManager = new StreakManager(this.xpConfig);
        this.levelCalculator = new LevelCalculator();
        this.xpEvaluator = new XPSourceEvaluator(this.xpConfig);
        
        this.currentDay = this.streakManager.getCurrentDay();
    }

    /**
     * Verifica si un usuario está en la lista negra
     * @private
     * @param {string} username 
     * @returns {boolean}
     */
    _isBlacklisted(username) {
        const lowerUser = username.toLowerCase();
        return (this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(lowerUser)) || 
               lowerUser.startsWith('justinfan');
    }

    /**
     * Aplica actividad (XP, mensajes, tiempo) a un usuario centralizadamente.
     * Gestiona: XP, Nivel, Historial Diario, Persistencia y Eventos.
     * 
     * @private
     * @param {string} username 
     * @param {Object} options 
     * @returns {Object|null} null si está blacklisted, de lo contrario datos del resultado
     */
    _applyActivity(username, { xp = 0, messages = 0, watchTime = 0, passive = false, source = null, suppressEvents = false }) {
        const lowerUser = username.toLowerCase();
        if (this._isBlacklisted(lowerUser)) return null;

        const userData = this.getUserData(lowerUser);
        const previousLevel = userData.level;

        // 1. Actualizar XP y Actividad básica
        userData.xp += xp;
        userData.totalMessages += messages;
        userData.lastActivity = Date.now();
        
        if (watchTime > 0) {
            userData.watchTimeMinutes = (userData.watchTimeMinutes || 0) + watchTime;
        }

        // 2. Actualizar Historial Diario (Heatmap/Stats)
        const today = this.streakManager.getCurrentDay();
        if (!userData.activityHistory) userData.activityHistory = {};
        if (!userData.activityHistory[today]) {
            userData.activityHistory[today] = { messages: 0, xp: 0, watchTime: 0 };
        }
        
        userData.activityHistory[today].messages += messages;
        userData.activityHistory[today].xp += xp;
        userData.activityHistory[today].watchTime = (userData.activityHistory[today].watchTime || 0) + watchTime;

        // 3. Lógica de Niveles
        const newLevel = this.levelCalculator.calculateLevel(userData.xp);
        const leveledUp = newLevel > previousLevel;
        if (leveledUp) {
            userData.level = newLevel;
        }

        // 4. Persistencia
        this.stateManager.markDirty(lowerUser);

        // 5. Notificar Eventos
        if (!suppressEvents) {
            if (xp !== 0) {
                EventManager.emit(EVENTS.USER.XP_GAINED, {
                    username: lowerUser,
                    amount: xp,
                    total: userData.xp,
                    passive: passive || (xp > 0 && messages === 0),
                    source
                });
            }

            if (leveledUp) {
                EventManager.emit(EVENTS.USER.LEVEL_UP, {
                    username: username, // Original casing if possible
                    oldLevel: previousLevel,
                    newLevel,
                    totalXP: userData.xp,
                    title: this.levelCalculator.getLevelTitle(newLevel),
                    timestamp: Date.now()
                });
            }
        }

        return { userData, leveledUp, previousLevel, newLevel };
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
                },
                RETURN_BONUS: {
                    id: 'return_bonus',
                    name: 'Welcome Back bonus',
                    xp: XP.RETURN_BONUS_XP || 30,
                    cooldownMs: 0,
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
     * Carga los datos delegando al stateManager
     * @returns {Promise<void>}
     */
    async loadData() {
        await this.stateManager.load();
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

        // 1. Verificar blacklist
        if (this._isBlacklisted(lowerUser)) {
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
                streakMultiplier: 0,
                isReturning: false,
                daysAway: 0
            };
        }

        // Resetear día si cambió
        this.checkDayReset();

        // Obtener datos del usuario
        let userData = this.getUserData(lowerUser);

        // 2. Detectar usuario que vuelve tras ausencia prolongada
        let isReturning = false;
        let daysAway = 0;
        const thresholdDays = XP.RETURN_THRESHOLD_DAYS || 7;

        if (userData.lastActivity && !this.sessionReturningShown.has(lowerUser)) {
            const msSinceLastActivity = Date.now() - userData.lastActivity;
            daysAway = Math.floor(msSinceLastActivity / (1000 * 60 * 60 * 24));
            if (daysAway >= thresholdDays) {
                isReturning = true;
                this.sessionReturningShown.add(lowerUser);
            }
        }

        // 3. Verificar cooldown global de XP (específico de mensajes)
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
                streakMultiplier: this.streakManager.getStreakMultiplier(userData.streakDays || 0),
                isReturning: false,
                daysAway: 0
            };
        }

        // 4. Lógica de Racha
        const ignoredForBonus = (this.config.XP_IGNORED_USERS_FOR_BONUS || [])
            .map(u => u.toLowerCase())
            .includes(lowerUser);

        let streakResult = {
            streakDays: userData.streakDays || 0,
            lastStreakDate: userData.lastStreakDate,
            bonusAwarded: false
        };

        if (!ignoredForBonus) {
            streakResult = this.streakManager.updateStreak(userData);
        }

        // 5. Evaluar XP base
        const evaluationState = {
            isIgnoredForBonus: ignoredForBonus,
            isFirstMessageOfDay: !this.dailyFirstMessage.has(lowerUser),
            streakBonusAwarded: streakResult.bonusAwarded
        };

        const evaluation = this.xpEvaluator.evaluateMessage(context, evaluationState);
        let totalXP = evaluation.totalXP;
        const xpSources = [...evaluation.sources];

        // 5.5 Bonus de Welcome Back (fuera del multiplicador de racha)
        let returnBonusXP = 0;
        if (isReturning && this.xpConfig.sources.RETURN_BONUS?.enabled) {
            returnBonusXP = this.xpConfig.sources.RETURN_BONUS.xp;
            xpSources.push({ id: 'return_bonus', name: 'Welcome Back', xp: returnBonusXP });
        }

        if (evaluationState.isFirstMessageOfDay && !ignoredForBonus) {
            this.dailyFirstMessage.set(lowerUser, true);
        }

        // 6. Multiplicador de racha
        const streakMultiplier = this.streakManager.getStreakMultiplier(streakResult.streakDays);
        const xpBeforeMultiplier = totalXP;
        totalXP = Math.floor(totalXP * streakMultiplier);

        // Añadir bonus de retorno (no afectado por multiplicador)
        totalXP += returnBonusXP;

        // Límite máximo (con margen para el bonus de retorno)
        totalXP = Math.min(totalXP, (this.xpConfig.settings.maxXPPerMessage * streakMultiplier) + returnBonusXP);

        // 7. Aplicar actividad (Centralizado)
        const result = this._applyActivity(lowerUser, {
            xp: totalXP,
            messages: 1,
            suppressEvents: false
        });

        // Actualizar datos de racha que no están en _applyActivity
        userData.streakDays = streakResult.streakDays;
        userData.lastStreakDate = streakResult.lastStreakDate;
        userData.bestStreak = streakResult.bestStreak || userData.bestStreak || 0;

        if (isReturning && this.config.DEBUG) {
            console.log(`🔄 Welcome Back: ${username} vuelve tras ${daysAway} días (+${returnBonusXP} XP bonus)`);
        }

        return {
            username: lowerUser,
            xpGained: totalXP,
            xpBeforeMultiplier,
            xpSources,
            totalXP: userData.xp,
            xp: userData.xp,
            level: userData.level,
            previousLevel: result.previousLevel,
            leveledUp: result.leveledUp,
            progress: this.levelCalculator.getLevelProgress(userData.xp, userData.level),
            levelProgress: this.levelCalculator.getLevelProgress(userData.xp, userData.level),
            title: this.levelCalculator.getLevelTitle(userData.level),
            levelTitle: this.levelCalculator.getLevelTitle(userData.level),
            streakDays: userData.streakDays || 0,
            streakMultiplier,
            achievements: userData.achievements || [],
            totalMessages: userData.totalMessages,
            isReturning,
            daysAway
        };
    }

    /**
     * Obtiene los datos de un usuario delegando al stateManager
     * @param {string} username - Nombre del usuario (lowercase)
     * @returns {Object}
     */
    getUserData(username) {
        return this.stateManager.getUser(username);
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
            this.stateManager.markDirty(lowerUser);
        }
    }

    /**
     * Añade tiempo de visualización a un usuario y otorga XP pasiva
     * @param {string} username 
     * @param {number} minutes 
     */
    addWatchTime(username, minutes) {
        const lowerUser = username.toLowerCase();
        const xpEarned = Math.floor(minutes * 1.5);

        const result = this._applyActivity(lowerUser, {
            xp: xpEarned,
            watchTime: minutes,
            passive: true
        });

        if (!result) return null;

        return {
            totalTime: result.userData.watchTimeMinutes,
            xpAdded: xpEarned,
            userData: result.userData
        };
    }

    /**
     * Añade XP fija por desbloqueo de logro (No afectado por multiplicadores)
     * @param {string} username 
     * @param {string} rarity - Rarity del logro (common, uncommon, etc.)
     * @param {Object} options - Opciones adicionales (ej. { suppressEvents: boolean })
     * @returns {number} XP ganada
     */
    addAchievementXP(username, rarity, options = {}) {
        const lowerUser = username.toLowerCase();
        const xpToGain = this.xpConfig.achievementRewards[rarity] || 50;

        const result = this._applyActivity(lowerUser, {
            xp: xpToGain,
            passive: true,
            source: 'achievement',
            suppressEvents: options.suppressEvents
        });

        return result ? xpToGain : 0;
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

    getXPLeaderboard(limit = 10) {
        const users = Array.from(this.stateManager.getAllUsers().entries())
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
     * Actualiza las estadísticas de ranking de los usuarios y emite eventos
     * @param {Map} rankingMap - Mapa de username -> rank (desde RankingSystem)
     * @param {boolean} isInitialLoad - Si es la carga inicial (para suprimir notificaciones)
     */
    updateRankingStats(rankingMap, isInitialLoad = false) {
        if (!rankingMap || rankingMap.size === 0) return;

        const today = new Date().toDateString();
        let changesCount = 0;

        // 1. Identificar quién era el Top 1 anterior (según nuestros datos persistidos)
        let previousTop1User = null;
        for (const [username, userData] of this.stateManager.getAllUsers().entries()) {
            if (userData.achievementStats && userData.achievementStats.currentRank === 1) {
                previousTop1User = username;
                break;
            }
        }

        // 2. Iterar sobre todos los usuarios del ranking actual
        rankingMap.forEach((rank, username) => {
            const lowerUser = username.toLowerCase();
            const userData = this.getUserData(lowerUser); // Crea usuario si no existe
            const stats = userData.achievementStats || {};

            const previousRank = stats.currentRank || 999;
            let statsChanged = false;

            // Actualizar ranking actual y mejor ranking
            if (stats.currentRank !== rank) {
                stats.currentRank = rank;
                statsChanged = true;
                
                // Calcular subida
                const climb = previousRank - rank;
                if (climb > 0) {
                    stats.bestDailyClimb = Math.max(stats.bestDailyClimb || 0, climb);
                    stats.bestClimb = Math.max(stats.bestClimb || 0, climb);
                }
            }

            if (rank < (stats.bestRank || 999)) {
                stats.bestRank = rank;
                statsChanged = true;
            }

            // Actualizaciones diarias (Solo una vez al día por usuario)
            if (stats.lastRankUpdateDate !== today) {
                stats.lastRankUpdateDate = today;
                
                if (rank === 1) {
                    stats.daysAsTop1 = (stats.daysAsTop1 || 0) + 1;
                }
                
                if (rank <= 10) {
                    stats.daysInTop10 = (stats.daysInTop10 || 0) + 1;
                }

                if (rank <= 15) {
                    stats.daysInTop15 = (stats.daysInTop15 || 0) + 1;
                }
                
                statsChanged = true;
            }

            // Lógica de "Destronar" al Top 1
            // Si soy el nuevo Top 1, y antes había otro Top 1 distinto a mí
            if (rank === 1 && previousTop1User && previousTop1User !== lowerUser) {
                if (!stats.dethroned) {
                    stats.dethroned = true;
                    statsChanged = true;
                    if (this.config.DEBUG) console.log(`👑 ${lowerUser} destronó a ${previousTop1User}!`);
                }
            }

            // Guardar y notificar si hubo cambios relevantes
            if (statsChanged) {
                userData.achievementStats = stats;
                this.stateManager.markDirty(lowerUser);
                changesCount++;

                // Emitir evento para verificar logros de ranking
                EventManager.emit(EVENTS.USER.RANKING_UPDATED, { 
                    username: lowerUser, 
                    isInitialLoad 
                });
            }
        });

        if (changesCount > 0 && this.config.DEBUG) {
            console.log(`📊 Ranking stats updated for ${changesCount} users`);
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
        const xpPerMinute = 1.5;
        const totalXP = Math.floor(minutes * xpPerMinute);

        chatters.forEach(username => {
            const result = this._applyActivity(username, {
                xp: totalXP,
                watchTime: minutes,
                passive: true
            });

            if (result) updatedCount++;
        });

        if (this.config.DEBUG && updatedCount > 0) {
            console.log(`⏱️ Watch time updated for ${updatedCount} users (+${minutes}m, +${totalXP}xp)`);
        }
    }

    getGlobalStats() {
        let totalXP = 0;
        let totalMessages = 0;
        let highestLevel = 1;
        const users = this.stateManager.getAllUsers();

        users.forEach(data => {
            totalXP += data.xp;
            totalMessages += data.totalMessages;
            if (data.level > highestLevel) highestLevel = data.level;
        });

        return {
            totalUsers: users.size,
            totalXP,
            totalMessages,
            highestLevel,
            averageXP: users.size > 0 ? Math.floor(totalXP / users.size) : 0
        };
    }

    async resetAllData() {
        await this.stateManager.resetAll();
        this.dailyFirstMessage.clear();
        console.log('☢️ SYSTEM PURGE: ALL XP DATA CLEARED');
    }

    getAllDataJSON() {
        const usersData = {};
        this.stateManager.getAllUsers().forEach((data, username) => {
            usersData[username] = data;
        });

        return JSON.stringify({
            users: usersData,
            lastUpdated: new Date().toISOString(),
            version: '1.2'
        }, null, 2);
    }

    // Método eliminado: _mergeInitialSubscribers movido a UserStateManager
}
