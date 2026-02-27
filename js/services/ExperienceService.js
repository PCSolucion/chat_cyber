import StreakManager from './StreakManager.js';
import LevelCalculator from './LevelCalculator.js';
import XPSourceEvaluator from './XPSourceEvaluator.js';
import Logger from '../utils/Logger.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import { TIMING } from '../constants/AppConstants.js';
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
     * @param {LevelCalculator} [levelCalculator] - Calculadora de niveles (opcional)
     */
    constructor(config, stateManager, levelCalculator = null) {
        this.config = config;
        this.stateManager = stateManager;

        // Registro de mensajes del día actual (para bonus primer mensaje)
        this.dailyFirstMessage = new Map();

        // Configuración de XP (Cargada desde constantes centralizadas)
        this.xpConfig = XP_CONFIG;
        
        // Inicializar Gestores Especializados
        this.streakManager = new StreakManager(this.xpConfig);
        this.xpEvaluator = new XPSourceEvaluator(this.xpConfig);
        this.levelCalculator = levelCalculator || new LevelCalculator();

        this.currentDay = this.streakManager.getCurrentDay();
        this.twitchService = null; // Inyectado dinámicamente
        this.rankingSystem = null; // Inyectado dinámicamente
    }

    /**
     * Inyecta el sistema de ranking para unificación de títulos
     * @param {RankingSystem} rankingSystem
     */
    setRankingSystem(rankingSystem) {
        this.rankingSystem = rankingSystem;
    }

    /**
     * Inyecta el servicio de Twitch para verificación de presencia
     * @param {TwitchService} twitchService
     */
    setTwitchService(twitchService) {
        this.twitchService = twitchService;
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
        if (this._isBlacklisted(username)) return null;

        const userData = this.getUserData(username);
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
            const isPresent = this._isUserPresent(username);
            const isPassive = passive || (xp > 0 && messages === 0);

            if (xp !== 0) {
                Logger.info('XP', `✨ Trayendo XP para ${username}: +${xp} (Total: ${userData.xp}, Source: ${source || 'MSG'}, Present: ${isPresent})`);
                EventManager.emit(EVENTS.USER.XP_GAINED, {
                    username: username, // Mantener caja original para UI
                    amount: xp,
                    total: userData.xp,
                    passive: isPassive,
                    isPresent,
                    source
                });
            }

            if (leveledUp) {
                // [VALIDACIÓN ANTI-BUG] Solo emitir si el nivel realmente es mayor que 1 (evitar spam en carga inicial fallida)
                if (newLevel > 1) {
                    Logger.info('XP', `🎊 LEVEL UP DETECTADO: ${username} (${previousLevel} -> ${newLevel}, Present: ${isPresent})`);
                    EventManager.emit(EVENTS.USER.LEVEL_UP, {
                        username: username, // Original casing if possible
                        oldLevel: previousLevel,
                        newLevel,
                        totalXP: userData.xp,
                        title: this.levelCalculator.getLevelTitle(newLevel),
                        timestamp: Date.now(),
                        passive: isPassive,
                        isPresent,
                        source
                    });
                } else {
                    Logger.warn('XP', `⚠️ Bloqueado Level Up sospechoso a Nivel 1 para ${username}.`);
                }
            }
        }

        // 6. Ranking Global (Gist Edition): No se actualiza dinámicamente desde aquí

        return { userData, leveledUp, previousLevel, newLevel };
    }



    /**
     * Trackea un mensaje y asigna XP correspondiente
     * Punto de entrada principal para actividad
     * 
     * @param {string} username - Nombre del usuario
     * @param {Object} context - Contexto del mensaje
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
        let userData = this.getUserData(username);

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
        const isBot = this._isBlacklisted(lowerUser);

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
        Logger.debug('XP', `🔍 Procesando XP para ${username}: Base=${xpBeforeMultiplier}, Final=${totalXP}, Mult=${streakMultiplier}x`);
        const result = this._applyActivity(username, {
            xp: totalXP,
            messages: 1,
            source: 'MESSAGE', // Identificar explícitamente la fuente
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
            level: userData.level,
            previousLevel: result.previousLevel,
            leveledUp: result.leveledUp,
            progress: this.levelCalculator.getLevelProgress(userData.xp, userData.level),
            title: this.levelCalculator.getLevelTitle(userData.level),
            streakDays: userData.streakDays || 0,
            streakMultiplier,
            achievements: userData.achievements || [],
            totalMessages: userData.totalMessages
        };
    }

    /**
     * Obtiene los datos de un usuario delegando al stateManager
     * @param {string} username - Nombre del usuario
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
    async updateSubscription(username, months) {
        // Asegurar carga antes de modificar para evitar sobrescrituras de nivel 1
        await this.stateManager.ensureUserLoaded(username);
        const userData = this.getUserData(username);
        
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
        
        const xpEarned = this._calculateWatchTimeXP(minutes);

        const result = this._applyActivity(username, {
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
        const xpToGain = this.xpConfig.achievementRewards[rarity] || 50;

        const result = this._applyActivity(username, {
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
     * @param {boolean} isWinner - Si es ganador o no
     * @returns {Object|null}
     */
    awardPredictionXP(username, xp, isWinner = false) {
        if (this._isBlacklisted(username)) return null;

        const userData = this.getUserData(username);
        
        // Actualizar estadísticas de predicción en el objeto de datos
        if (!userData.stats) userData.stats = {};
        userData.stats.prediction_wins = (userData.stats.prediction_wins || 0) + (isWinner ? 1 : 0);
        userData.stats.prediction_participations = (userData.stats.prediction_participations || 0) + 1;

        // Aplicar la actividad de XP
        const result = this._applyActivity(username, {
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
    getUserXPInfo(username) {
        const userData = this.getUserData(username);
        const progress = this.levelCalculator.getLevelProgress(userData.xp, userData.level);
    
        // Obtener título unificado (SSoT: RankingSystem > LevelCalculator)
        let title = this.levelCalculator.getLevelTitle(userData.level);
        if (this.rankingSystem) {
            const roleInfo = this.rankingSystem.getUserRole(username, userData, this.levelCalculator);
            if (roleInfo && roleInfo.rankTitle && roleInfo.rankTitle.title) {
                title = roleInfo.rankTitle.title;
            }
        }

        return {
            username: userData.displayName || username,
            xp: userData.xp,
            level: userData.level,
            title,
            progress,
            streakDays: userData.streakDays || 0,
            streakMultiplier: this.streakManager.getStreakMultiplier(userData.streakDays || 0),
            totalMessages: userData.totalMessages,
            achievements: userData.achievements
        };
    }

    /**
     * Obtiene estadísticas de tiempo de visualización de un usuario
     * @param {string} period - Periodo ('total', 'week', 'month') - Por ahora solo soporta 'total'
     * @returns {number} Minutos visualizados
     */
    getWatchTimeStats(username) {
        const userData = this.getUserData(username);
        if (!userData) return 0;

        // Por ahora retornamos el total. 
        // Implementar lógica de periodos si activityHistory se parsea correctamente.
        return userData.watchTimeMinutes || 0;
    }

    getXPLeaderboard(limit = 10) {
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
     * Añade tiempo de visualización a los usuarios activos (Batch)
     * 
     * @param {Array} chatters - Lista de nombres de usuario
     * @param {number} minutes - Minutos a añadir (default: 1)
     * @param {boolean} onlyLoaded - Si true, SOLO procesa usuarios que YA están en memoria (ahorra lecturas).
     */
    async addWatchTimeBatch(chatters, minutes = 1, onlyLoaded = false) {
        if (!chatters || !Array.isArray(chatters)) return;

        let targetUsers;
        
        if (onlyLoaded) {
            // MODO OPTIMIZADO: Solo usuarios conocidos en RAM (Activos recientemente)
            targetUsers = chatters.filter(username => {
                const loaded = this.stateManager.hasUser(username);
                return loaded;
            });
        } else {
            // MODO COMPLETO (Legacy): Intenta cargar a todos sin abortar el lote si uno falla
            targetUsers = [...chatters];
            // Pre-cargar en paralelo encapsulando errores en cada promesa
            await Promise.all(targetUsers.map(username => 
                this.stateManager.ensureUserLoaded(username).catch(err => {
                    if (this.config.DEBUG) console.warn(`⚠️ Omitiendo ${username} por error de carga en WatchTime:`, err);
                })
            ));
        }

        if (targetUsers.length === 0) return;

        let updatedCount = 0;
        const totalXP = this._calculateWatchTimeXP(minutes);

        targetUsers.forEach(username => {
            // Verificar si la carga falló (en tal caso el catch devolvió o se saltó, no está en memoria)
            if (!this.stateManager.hasUser(username)) return;

            // Al estar ya validado que están en RAM, procedemos
            const result = this._applyActivity(username, {
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

    /**
     * Verifica si un usuario está presente en el stream (vía TwitchService)
     * @private
     */
    _isUserPresent(username) {
        if (!this.twitchService || !username) return false;
        const key = username.toLowerCase();
        
        // 1. Verificar en el set de chatters activos de Twitch
        if (this.twitchService.activeChatters && this.twitchService.activeChatters.has(key)) {
            return true;
        }
        
        // 2. Fallback: Si no hay TwitchService o Set vacío, consideramos que no está presente
        // pero permitimos que los mensajes pasen (UIRendererMiddleware maneja el resto)
        return false;
    }


}
