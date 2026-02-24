import StreakManager from './StreakManager.js';
import LevelCalculator from './LevelCalculator.js';
import XPSourceEvaluator from './XPSourceEvaluator.js';
import Logger from '../utils/Logger.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import { XP, TIMING, QUALITY } from '../constants/AppConstants.js';
import { INITIAL_SUBSCRIBERS } from '../data/subscribers.js';
import XP_CONFIG from '../constants/XPWeights.js';

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

        // Configuración de XP (Cargada desde constantes centralizadas)
        this.xpConfig = XP_CONFIG;
        
        // Inicializar Gestores Especializados
        this.streakManager = new StreakManager(this.xpConfig);
        this.xpEvaluator = new XPSourceEvaluator(this.xpConfig);
        this.levelCalculator = new LevelCalculator();

        this.currentDay = this.streakManager.getCurrentDay();
    }

    /**
     * @deprecated Sistema de leaderboard dinámico deshabilitado
     */
    setLeaderboardService(service) {
        // Obsoleto
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
     * @param {string} userId
     * @param {string} username 
     * @param {Object} options 
     * @returns {Object|null} null si está blacklisted, de lo contrario datos del resultado
     */
    _applyActivity(userId, username, { xp = 0, messages = 0, watchTime = 0, passive = false, source = null, suppressEvents = false }) {
        if (this._isBlacklisted(username)) return null;

        const userData = this.getUserData(userId, username);
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
        // Usamos saveUserResult directamente al StateManager
        // Pasamos los "gains" para que el StateManager pueda usar atomic increments de Firestore
        this.stateManager.saveUserResult(username, { 
            xp: userData.xp, 
            level: userData.level,
            totalMessages: userData.totalMessages,
            watchTimeMinutes: userData.watchTimeMinutes,
            activityHistory: userData.activityHistory,
            lastActivity: userData.lastActivity,
            
            // Metadatos para Incrementos Atómicos
            xpGain: xp,
            messageGain: messages,
            watchTimeGain: watchTime,
            todayKey: today
        });

        // 5. Notificar Eventos
        if (!suppressEvents) {
            if (xp !== 0) {
                EventManager.emit(EVENTS.USER.XP_GAINED, {
                    userId,
                    username: username, // Mantener caja original para UI
                    amount: xp,
                    total: userData.xp,
                    passive: passive || (xp > 0 && messages === 0),
                    source
                });
            }

            if (leveledUp) {
                EventManager.emit(EVENTS.USER.LEVEL_UP, {
                    userId,
                    username: username, // Original casing if possible
                    oldLevel: previousLevel,
                    newLevel,
                    totalXP: userData.xp,
                    title: this.levelCalculator.getLevelTitle(newLevel),
                    timestamp: Date.now()
                });
            }
        }

        // 6. Ranking Global (Gist Edition): No se actualiza dinámicamente desde aquí

        return { userData, leveledUp, previousLevel, newLevel };
    }

    /**
     * @deprecated La configuración ahora se maneja en js/constants/XPWeights.js
     * Se mantiene el método para compatibilidad si otros servicios lo llaman para lectura,
     * pero ahora retorna el objeto centralizado.
     * @returns {Object}
     */
    initXPConfig() {
        return XP_CONFIG;
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
    trackMessage(userId, username, context = {}) {
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
        let userData = this.getUserData(userId, username);

        // 2. [REMOVED] Lógica de Welcome Back

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
                streakMultiplier: this.streakManager.getStreakMultiplier(userData.streakDays || 0)
            };
        }

        // 4. Lógica de Racha
        const isBot = (this.config.BLACKLISTED_USERS || [])
            .map(u => u.toLowerCase())
            .includes(lowerUser);

        let streakResult = {
            streakDays: userData.streakDays || 0,
            lastStreakDate: userData.lastStreakDate,
            bonusAwarded: false
        };

        // Todos los usuarios reales tienen racha, aunque algunos no ganen bonus (evaluador)
        if (!isBot) {
            streakResult = this.streakManager.updateStreak(userData);
        }

        // 5. Evaluar XP base
        const ignoredForBonus = (this.config.XP_IGNORED_USERS_FOR_BONUS || [])
            .map(u => u.toLowerCase())
            .includes(lowerUser);

        const evaluationState = {
            isIgnoredForBonus: ignoredForBonus,
            isFirstMessageOfDay: !this.dailyFirstMessage.has(lowerUser),
            streakBonusAwarded: streakResult.bonusAwarded
        };

        const evaluation = this.xpEvaluator.evaluateMessage(context, evaluationState);
        let totalXP = evaluation.totalXP;
        const xpSources = [...evaluation.sources];

        if (evaluationState.isFirstMessageOfDay && !ignoredForBonus) {
            this.dailyFirstMessage.set(lowerUser, true);
        }

        // Multiplicador de racha
        const streakMultiplier = this.streakManager.getStreakMultiplier(streakResult.streakDays);
        const xpBeforeMultiplier = totalXP;
        totalXP = Math.floor(totalXP * streakMultiplier);

        // Límite máximo
        totalXP = Math.min(totalXP, (this.xpConfig.settings.maxXPPerMessage * streakMultiplier));

        // 7. Aplicar actividad (Centralizado)
        const result = this._applyActivity(userId, username, {
            xp: totalXP,
            messages: 1,
            suppressEvents: false
        });

        // Actualizar datos de racha que no están en _applyActivity
        userData.streakDays = streakResult.streakDays;
        userData.lastStreakDate = streakResult.lastStreakDate;
        userData.bestStreak = streakResult.bestStreak || userData.bestStreak || 0;

        return {
            username: lowerUser,
            xpGained: totalXP,
            xpBeforeMultiplier,
            xpSources,
            totalXP: userData.xp,
            // xp: userData.xp, // Redundante con totalXP
            level: userData.level,
            previousLevel: result.previousLevel,
            leveledUp: result.leveledUp,
            progress: this.levelCalculator.getLevelProgress(userData.xp, userData.level),
            // levelProgress: ... // Redundante con progress
            title: this.levelCalculator.getLevelTitle(userData.level),
            // levelTitle: ... // Redundante con title
            streakDays: userData.streakDays || 0,
            streakMultiplier,
            achievements: userData.achievements || [],
            totalMessages: userData.totalMessages
        };
    }

    /**
     * Obtiene los datos de un usuario delegando al stateManager
     * @param {string} userId
     * @param {string} username - Nombre del usuario
     * @returns {Object}
     */
    getUserData(userId, username) {
        return this.stateManager.getUser(username || userId);
    }

    /**
     * Actualiza el tiempo de suscripción de un usuario
     * @param {string} username 
     * @param {number} months 
     */
    async updateSubscription(username, months) {
        // Asegurar carga antes de modificar para evitar sobrescrituras de nivel 1
        await this.stateManager.ensureUserLoaded(username);
        const userData = this.getUserData(null, username);
        
        // Si el valor es nuevo o mayor, actualizar y guardar
        if (months > (userData.subMonths || 0)) {
            userData.subMonths = months;
            this.stateManager.markDirty(username);
        }
    }

    /**
     * Calcula la XP a otorgar por tiempo de visualización basado en la configuración
     * @private
     * @param {number} minutes 
     * @returns {number}
     */
    _calculateWatchTimeXP(minutes) {
        const minsPerInterval = (TIMING.WATCH_TIME_INTERVAL_MS || 600000) / 60000;
        const xpPerInterval = this.xpConfig.sources.WATCH_TIME.xp || 10;
        const xpPerMinute = xpPerInterval / minsPerInterval;
        return Math.floor(minutes * xpPerMinute);
    }

    /**
     * Añade tiempo de visualización a un usuario y otorga XP pasiva
     * @param {string} username 
     * @param {number} minutes 
     */
    async addWatchTime(username, minutes) {
        // Asegurar carga antes de añadir XP pasiva
        await this.stateManager.ensureUserLoaded(username);
        
        const lowerUser = username.toLowerCase();
        const xpEarned = this._calculateWatchTimeXP(minutes);

        const result = this._applyActivity(null, username, {
            xp: xpEarned,
            watchTime: minutes,
            passive: true,
            source: 'watchtime'
        });

        return result;
    }

    /**
     * Añade XP fija por desbloqueo de logro (No afectado por multiplicadores)
     * @param {string} username 
     * @param {string} rarity - Rarity del logro (common, uncommon, etc.)
     * @param {Object} options - Opciones adicionales (ej. { suppressEvents: boolean })
     * @returns {number} XP ganada
     */
    async addAchievementXP(username, rarity, options = {}) {
        await this.stateManager.ensureUserLoaded(username);
        const lowerUser = username.toLowerCase();
        const xpToGain = this.xpConfig.achievementRewards[rarity] || 50;

        const result = this._applyActivity(null, username, {
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
     * Aplica XP ganado en una predicción y devuelve el resultado completo.
     * @param {string} userId - ID numérico de Twitch
     * @param {string} username - Nombre del usuario
     * @param {number} xp - Cantidad de XP a añadir
     * @param {boolean} isWinner - Si es ganador o no
     * @returns {Object|null}
     */
    awardPredictionXP(userId, username, xp, isWinner = false) {
        if (this._isBlacklisted(username)) return null;

        const userData = this.getUserData(userId, username);
        
        // Actualizar estadísticas de predicción en el objeto de datos
        if (!userData.stats) userData.stats = {};
        userData.stats.prediction_wins = (userData.stats.prediction_wins || 0) + (isWinner ? 1 : 0);
        userData.stats.prediction_participations = (userData.stats.prediction_participations || 0) + 1;

        // Aplicar la actividad de XP
        const result = this._applyActivity(userId, username, {
            xp: xp,
            messages: 0,
            source: 'PREDICTION',
            passive: false // Queremos que cuente como acción propia para el widget
        });

        if (!result) return null;

        // Construir resultado compatible con la UI
        return {
            username: username,
            xpGained: xp,
            totalXP: userData.xp,
            level: userData.level,
            previousLevel: result.previousLevel,
            leveledUp: result.leveledUp,
            levelProgress: this.levelCalculator.getLevelProgress(userData.xp, userData.level),
            levelTitle: this.levelCalculator.getLevelTitle(userData.level),
            isWinner
        };
    }

    /**
     * Obtiene información completa de XP de un usuario
     * @param {string} username - Nombre del usuario
     * @returns {Object} Información de XP
     */
    getUserXPInfo(userId, username) {
        // Soporte para llamadas con un solo argumento (userId as name)
        const finalUsername = username || userId;
        const userData = this.getUserData(userId, username);
        const progress = this.levelCalculator.getLevelProgress(userData.xp, userData.level);
    
        return {
            username: userData.displayName || finalUsername,
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
    getWatchTimeStats(userId, username, period = 'total') {
        const userData = this.getUserData(userId, username);
        if (!userData) return 0;

        // Por ahora retornamos el total. 
        // Implementar lógica de periodos si activityHistory se parsea correctamente.
        return userData.watchTimeMinutes || 0;
    }

    getXPLeaderboard(limit = 10) {
        // 1. Si tenemos LeaderboardService, usar los datos reales del ranking global
        if (this.leaderboardService) {
            return this.leaderboardService.getTopUsers(limit).map(u => ({
                userId: u.username,
                username: u.displayName || u.username,
                xp: u.xp,
                level: u.level,
                messages: u.messages || 0,
                title: this.levelCalculator.getLevelTitle(u.level)
            }));
        }

        // 2. Fallback: Solo usuarios cargados en RAM
        const users = Array.from(this.stateManager.getAllUsers().entries())
            .map(([id, data]) => ({
                userId: id,
                username: data.displayName || id,
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
     * @param {Map} rankingMap - Mapa de username -> rank (desde RankingSystem dinámico)
     * @param {boolean} isInitialLoad - Si es la carga inicial (para suprimir notificaciones)
     */
    async updateRankingStats(rankingMap, isInitialLoad = false) {
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
        // Usamos for...of para permitir operaciones asíncronas (carga bajo demanda de Top Users)
        for (const [idOrName, rank] of rankingMap.entries()) {
            const key = String(idOrName).toLowerCase();
            let userData = this.stateManager.users.get(key);

            // GESTIÓN DE OFFLINE: Si es un usuario Top 20 y no está en RAM, lo cargamos.
            // Esto asegura que sus estadísticas (días en top, best rank) se actualicen aunque no esté en el chat.
            if (!userData && rank <= 20) {
                if (this.config.DEBUG) console.log(`🔄 Pre-cargando Top User offline: ${key} (Rank ${rank})`);
                await this.stateManager.ensureUserLoaded(key);
                userData = this.stateManager.users.get(key);
            }

            if (!userData) continue;

            const lowerUser = (userData.displayName || idOrName).toLowerCase();
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
                this.stateManager.markDirty(idOrName);
                changesCount++;

                // Emitir evento para verificar logros de ranking
                EventManager.emit(EVENTS.USER.RANKING_UPDATED, { 
                    userId: String(idOrName),
                    username: lowerUser, 
                    isInitialLoad 
                });
            }
        } // Cierre del for..of (antes era }); del forEach)

        if (changesCount > 0 && this.config.DEBUG) {
            console.log(`📊 Ranking stats updated for ${changesCount} users`);
        }
    }

    /**
     * Añade tiempo de visualización a los usuarios activos (Batch)
     * 
     * @param {Array} chatters - Lista de nombres de usuario
     * @param {number} minutes - Minutos a añadir (default: 1)
     * @param {boolean} onlyLoaded - Si true, SOLO procesa usuarios que YA están en memoria (ahorra lecturas).
     */
    async addWatchTimeBatch(chatters, minutes = 1, onlyLoaded = false) {
        if (!chatters || !Array.isArray(chatters)) return;

        let targetUsers = [];
        
        if (onlyLoaded) {
            // MODO OPTIMIZADO: Solo usuarios conocidos en RAM (Activos recientemente)
            targetUsers = chatters.filter(username => {
                const loaded = this.stateManager.users.has(username.toLowerCase());
                if (!loaded && this.config.DEBUG) {
                    // console.log(`Skipping WatchTime for lurker/unknown: ${username}`);
                }
                return loaded;
            });
        } else {
            // MODO COMPLETO (Legacy): Intenta cargar a todos (Costoso en lecturas)
            targetUsers = chatters;
            // Pre-argar en paralelo
            await Promise.all(targetUsers.map(username => 
                this.stateManager.ensureUserLoaded(username)
            ));
        }

        if (targetUsers.length === 0) return;

        let updatedCount = 0;
        const totalXP = this._calculateWatchTimeXP(minutes);

        targetUsers.forEach(username => {
            // Ya sabemos que están cargados o se acaban de cargar
            const result = this._applyActivity(null, username, {
                xp: totalXP,
                watchTime: minutes,
                passive: true
            });

            if (result) updatedCount++;
        });
        
        // Forzar guardado inmediato en Firestore para todo el grupo tras el ciclo
        if (this.stateManager && typeof this.stateManager.saveImmediately === 'function') {
            await this.stateManager.saveImmediately();
        }

        if (this.config.DEBUG && updatedCount > 0) {
            console.log(`⏱️ Watch time updated for ${updatedCount}/${chatters.length} users (+${minutes}m, +${totalXP}xp)`);
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
        this.stateManager.getAllUsers().forEach((data, id) => {
            usersData[id] = data;
        });

        return JSON.stringify({
            users: usersData,
            lastUpdated: new Date().toISOString(),
            version: '1.2'
        }, null, 2);
    }

    // Método eliminado: _mergeInitialSubscribers movido a UserStateManager
}
