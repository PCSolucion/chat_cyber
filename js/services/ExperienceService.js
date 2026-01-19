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
class ExperienceService {
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
        this.currentDay = this.getCurrentDay();

        // Callbacks para eventos de level-up
        this.levelUpCallbacks = [];

        // Flag de inicialización
        this.isLoaded = false;

        // Queue de cambios pendientes (para batch save)
        this.pendingChanges = new Set();
        this.saveTimeout = null;

        // Control de Concurrencia (Cola de Guardado)
        this.isSaving = false;
        this.queuedSave = false;

        // Configuración de XP (extensible)
        this.xpConfig = this.initXPConfig();
        this.levelConfig = this.initLevelConfig();
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
                }
            },

            // Configuración global
            settings: {
                minTimeBetweenXP: 1000, // 1 segundo mínimo entre ganancias de XP
                saveDebounceMs: 5000,   // Guardar cada 5 segundos máximo
                maxXPPerMessage: 100    // Límite de XP por mensaje individual
            },

            // Multiplicadores de racha (días -> multiplicador)
            streakMultipliers: [
                { minDays: 20, multiplier: 3.0 },   // 20+ días = x3
                { minDays: 10, multiplier: 2.0 },   // 10+ días = x2
                { minDays: 5, multiplier: 1.5 },    // 5+ días = x1.5
                { minDays: 3, multiplier: 1.2 },    // 3+ días = x1.2
                { minDays: 0, multiplier: 1.0 }     // Default = x1
            ]
        };
    }

    /**
     * Inicializa la configuración de niveles
     * Sistema infinito con fórmula exponencial
     * @returns {Object}
     */
    initLevelConfig() {
        return {
            // Fórmula: XP_requerido = baseXP * (level ^ exponent)
            baseXP: 100,
            exponent: 1.5,

            // Títulos por nivel exacto o rango inicial
            titles: {
                1: 'CIVILIAN',
                5: 'STREET RAT',
                10: 'MERCENARY',
                15: 'SOLO',
                20: 'NETRUNNER',
                30: 'FIXER',
                40: 'CORPO',
                50: 'NIGHT CITY LEGEND',
                60: 'CYBERPSYCHO',
                70: 'MAXTAC',
                80: 'TRAUMA TEAM',
                90: 'AFTERLIFE LEGEND',
                100: 'CHOOMBA SUPREME'
            },

            // Título por defecto para niveles sin título específico
            defaultTitle: 'EDGE RUNNER LVL {level}'
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
                // Cargar datos de usuarios
                Object.entries(data.users).forEach(([username, userData]) => {
                    this.usersXP.set(username.toLowerCase(), {
                        xp: userData.xp || 0,
                        level: userData.level || 1,
                        lastActivity: userData.lastActivity || null,
                        streakDays: userData.streakDays || 0,
                        lastStreakDate: userData.lastStreakDate || null,
                        totalMessages: userData.totalMessages || 0,
                        achievements: userData.achievements || [],
                        achievementStats: userData.achievementStats || {}
                    });
                });
            }

            this.isLoaded = true;
            console.log(`✅ XP Data cargado: ${this.usersXP.size} usuarios`);

        } catch (error) {
            console.error('❌ Error al cargar XP data:', error);
            this.isLoaded = true; // Continuar sin datos previos
        }
    }

    /**
     * Guarda los datos de XP en el storage
     * Usa debounce para evitar demasiadas escrituras
     * @param {boolean} force - Forzar guardado inmediato
     * @returns {Promise<void>}
     */
    async saveData(force = false) {
        if (force) {
            clearTimeout(this.saveTimeout);
            await this._performSave();
            return;
        }

        // Debounce - guardar después de inactividad
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(async () => {
            await this._performSave();
        }, this.xpConfig.settings.saveDebounceMs);
    }

    /**
     * Ejecuta el guardado real con control de concurrencia
     * @private
     */
    async _performSave() {
        // Si no hay cambios y no se forzó cola, salir
        if (this.pendingChanges.size === 0 && !this.queuedSave) return;

        // Si ya está guardando, encolar para la siguiente vuelta
        if (this.isSaving) {
            if (this.config.DEBUG) console.log('⏳ Guardado en curso, encolando siguiente...');
            this.queuedSave = true;
            return;
        }

        // Bloquear
        this.isSaving = true;
        this.queuedSave = false;

        // Snapshot de cambios para limpiar la lista principal ANTES del await
        // Esto permite que nuevos cambios entren en pendingChanges mientras guardamos
        const changesSnapshot = new Set(this.pendingChanges);
        this.pendingChanges.clear();

        try {
            // Convertir Map a objeto para JSON
            const usersData = {};
            this.usersXP.forEach((data, username) => {
                usersData[username] = data;
            });

            await this.storageService.saveXPData({
                users: usersData,
                lastUpdated: new Date().toISOString(),
                version: '1.0'
            });

            if (this.config.DEBUG) {
                console.log('💾 XP data guardado exitosamente');
            }

        } catch (error) {
            console.error('❌ Error al guardar XP data:', error);
            // Rollback: Restaurar cambios pendientes para reintentar
            changesSnapshot.forEach(user => this.pendingChanges.add(user));
        } finally {
            this.isSaving = false;

            // Procesar Cola
            // Si hubo petición durante el guardado (queuedSave) o hay nuevos cambios (pendingChanges)
            if (this.queuedSave || this.pendingChanges.size > 0) {
                if (this.config.DEBUG) console.log('🔄 Procesando guardado encolado...');

                // Ejecutar siguiente guardado (sin await para no bloquear stack, 
                // aunque es async así que es promesa nueva)
                this._performSave();
            }
        }
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
                levelProgress: this.getLevelProgress(userData.xp, userData.level),
                levelTitle: this.getLevelTitle(userData.level),
                streakDays: userData.streakDays || 0,
                streakMultiplier: this.getStreakMultiplier(userData.streakDays || 0)
            };
        }

        const previousLevel = userData.level;

        // Calcular XP ganado de cada fuente
        let totalXP = 0;
        const xpSources = [];

        // 1. XP base por mensaje
        if (this.xpConfig.sources.MESSAGE.enabled) {
            totalXP += this.xpConfig.sources.MESSAGE.xp;
            xpSources.push({ source: 'MESSAGE', xp: this.xpConfig.sources.MESSAGE.xp });
        }

        // 2. Bonus primer mensaje del día
        if (this.xpConfig.sources.FIRST_MESSAGE_DAY.enabled && !this.dailyFirstMessage.has(lowerUser)) {
            totalXP += this.xpConfig.sources.FIRST_MESSAGE_DAY.xp;
            xpSources.push({ source: 'FIRST_MESSAGE_DAY', xp: this.xpConfig.sources.FIRST_MESSAGE_DAY.xp });
            this.dailyFirstMessage.set(lowerUser, true);
        }

        // 3. Bonus stream activo
        if (this.xpConfig.sources.STREAM_ACTIVE.enabled && context.isStreamLive) {
            totalXP += this.xpConfig.sources.STREAM_ACTIVE.xp;
            xpSources.push({ source: 'STREAM_ACTIVE', xp: this.xpConfig.sources.STREAM_ACTIVE.xp });
        }

        // 4. XP por emotes
        if (this.xpConfig.sources.EMOTE_USED.enabled && context.hasEmotes && context.emoteCount > 0) {
            const emoteXP = Math.min(context.emoteCount, this.xpConfig.sources.EMOTE_USED.maxPerMessage)
                * this.xpConfig.sources.EMOTE_USED.xp;
            totalXP += emoteXP;
            xpSources.push({ source: 'EMOTE_USED', xp: emoteXP });
        }

        // 5. Bonus inicio de stream
        if (this.xpConfig.sources.STREAM_START.enabled && context.isStreamStart) {
            totalXP += this.xpConfig.sources.STREAM_START.xp;
            xpSources.push({ source: 'STREAM_START', xp: this.xpConfig.sources.STREAM_START.xp });
        }

        // 6. XP por mención
        if (this.xpConfig.sources.MENTION_USER.enabled && context.hasMention) {
            totalXP += this.xpConfig.sources.MENTION_USER.xp;
            xpSources.push({ source: 'MENTION_USER', xp: this.xpConfig.sources.MENTION_USER.xp });
        }

        // 7. Verificar y actualizar racha
        const streakResult = this.updateStreak(lowerUser, userData);
        if (streakResult.bonusAwarded) {
            totalXP += this.xpConfig.sources.STREAK_BONUS.xp;
            xpSources.push({ source: 'STREAK_BONUS', xp: this.xpConfig.sources.STREAK_BONUS.xp });
        }

        // 8. Calcular y aplicar multiplicador de racha
        const streakMultiplier = this.getStreakMultiplier(streakResult.streakDays);
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

        // Recalcular nivel
        const newLevel = this.calculateLevel(userData.xp);
        userData.level = newLevel;

        // Guardar datos actualizados
        this.usersXP.set(lowerUser, userData);
        this.pendingChanges.add(lowerUser);
        this.saveData();

        // Detectar level-up
        const leveledUp = newLevel > previousLevel;
        if (leveledUp) {
            this.emitLevelUp(username, previousLevel, newLevel, userData.xp);
        }

        return {
            username: lowerUser,
            xpGained: totalXP,
            xpBeforeMultiplier,
            xpSources,
            totalXP: userData.xp,
            level: newLevel,
            previousLevel,
            leveledUp,
            levelProgress: this.getLevelProgress(userData.xp, newLevel),
            levelTitle: this.getLevelTitle(newLevel),
            streakDays: userData.streakDays || 0,
            streakMultiplier
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
                lastStreakDate: null,
                totalMessages: 0,
                achievements: [],
                achievementStats: {}
            });
        }

        return this.usersXP.get(lowerUser);
    }

    /**
     * Calcula el nivel basado en XP total
     * Fórmula: XP_requerido = baseXP * ((level-1) ^ exponent)
     * Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 283 XP, etc.
     * @param {number} xp - XP total
     * @returns {number} Nivel
     */
    calculateLevel(xp) {
        const { baseXP, exponent } = this.levelConfig;

        if (xp < baseXP) return 1;

        // Resolver: xp = baseXP * ((level-1) ^ exponent)
        // (level-1) = (xp / baseXP) ^ (1 / exponent)
        // level = (xp / baseXP) ^ (1 / exponent) + 1
        const level = Math.floor(Math.pow(xp / baseXP, 1 / exponent)) + 1;
        return Math.max(1, level);
    }

    /**
     * Calcula el XP requerido para un nivel específico
     * Level 1 = 0 XP, Level 2 = baseXP, etc.
     * @param {number} level - Nivel objetivo
     * @returns {number} XP requerido
     */
    getXPForLevel(level) {
        if (level <= 1) return 0;
        const { baseXP, exponent } = this.levelConfig;
        return Math.floor(baseXP * Math.pow(level - 1, exponent));
    }

    /**
     * Obtiene el progreso hacia el siguiente nivel
     * @param {number} currentXP - XP actual
     * @param {number} currentLevel - Nivel actual
     * @returns {Object} Información de progreso
     */
    getLevelProgress(currentXP, currentLevel) {
        const xpForCurrentLevel = this.getXPForLevel(currentLevel);
        const xpForNextLevel = this.getXPForLevel(currentLevel + 1);

        const xpInCurrentLevel = currentXP - xpForCurrentLevel;
        const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
        const percentage = Math.min(100, Math.floor((xpInCurrentLevel / xpNeededForNext) * 100));

        return {
            currentXP,
            xpForCurrentLevel,
            xpForNextLevel,
            xpInCurrentLevel,
            xpNeededForNext,
            percentage
        };
    }

    /**
     * Obtiene el título para un nivel específico
     * Busca el título definido para el nivel más alto menor o igual al actual.
     * @param {number} level - Nivel
     * @returns {string} Título
     */
    getLevelTitle(level) {
        // Obtener todos los niveles definidos en orden descendente
        const definedLevels = Object.keys(this.levelConfig.titles)
            .map(Number)
            .sort((a, b) => b - a);

        // Encontrar el primer nivel definido que sea <= al nivel actual
        for (const definedLevel of definedLevels) {
            if (level >= definedLevel) {
                return this.levelConfig.titles[definedLevel];
            }
        }

        // Título por defecto si no encuentra ninguno (ej. nivel 0 o error)
        return this.levelConfig.defaultTitle.replace('{level}', level);
    }

    /**
     * Añade un nuevo título para un nivel
     * @param {number} level - Nivel
     * @param {string} title - Título
     */
    setLevelTitle(level, title) {
        this.levelConfig.titles[level] = title;
    }

    /**
     * Añade múltiples títulos
     * @param {Object} titles - Objeto { nivel: título }
     */
    setLevelTitles(titles) {
        Object.entries(titles).forEach(([level, title]) => {
            this.levelConfig.titles[parseInt(level)] = title;
        });
    }

    /**
     * Actualiza la racha de participación
     * @param {string} username - Nombre del usuario
     * @param {Object} userData - Datos del usuario
     * @returns {Object} Resultado de la racha
     */
    updateStreak(username, userData) {
        const today = this.getCurrentDay();
        const lastDate = userData.lastStreakDate;

        let streakDays = userData.streakDays || 0;
        let bonusAwarded = false;

        if (lastDate === today) {
            // Ya participó hoy, no cambiar racha
            return { streakDays, lastStreakDate: today, bonusAwarded: false };
        }

        const yesterday = this.getYesterday();

        if (lastDate === yesterday) {
            // Racha continúa
            streakDays += 1;

            // Bonus si alcanza el umbral
            if (streakDays >= this.xpConfig.sources.STREAK_BONUS.streakDays &&
                streakDays % this.xpConfig.sources.STREAK_BONUS.streakDays === 0) {
                bonusAwarded = true;
            }
        } else {
            // Racha rota, reiniciar
            streakDays = 1;
        }

        return { streakDays, lastStreakDate: today, bonusAwarded };
    }

    /**
     * Calcula el multiplicador de XP basado en los días de racha
     * @param {number} streakDays - Días de racha consecutivos
     * @returns {number} Multiplicador (1.0, 1.5, 2.0, 3.0)
     */
    getStreakMultiplier(streakDays) {
        const multipliers = this.xpConfig.streakMultipliers;

        for (const tier of multipliers) {
            if (streakDays >= tier.minDays) {
                return tier.multiplier;
            }
        }

        return 1.0; // Default
    }

    /**
     * Obtiene la fecha actual en formato YYYY-MM-DD (Hora Local)
     * @returns {string}
     */
    getCurrentDay() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Obtiene la fecha de ayer en formato YYYY-MM-DD (Hora Local)
     * @returns {string}
     */
    getYesterday() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const year = yesterday.getFullYear();
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const day = String(yesterday.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Verifica si el día cambió y resetea contadores diarios
     */
    checkDayReset() {
        const today = this.getCurrentDay();
        if (today !== this.currentDay) {
            this.currentDay = today;
            this.dailyFirstMessage.clear();
        }
    }

    /**
     * Registra un callback para eventos de level-up
     * @param {Function} callback - Función a ejecutar en level-up
     */
    onLevelUp(callback) {
        this.levelUpCallbacks.push(callback);
    }

    /**
     * Emite evento de level-up a todos los listeners
     * @param {string} username - Nombre del usuario
     * @param {number} oldLevel - Nivel anterior
     * @param {number} newLevel - Nuevo nivel
     * @param {number} totalXP - XP total
     */
    emitLevelUp(username, oldLevel, newLevel, totalXP) {
        const eventData = {
            username,
            oldLevel,
            newLevel,
            totalXP,
            title: this.getLevelTitle(newLevel),
            timestamp: Date.now()
        };

        this.levelUpCallbacks.forEach(callback => {
            try {
                callback(eventData);
            } catch (error) {
                console.error('Error en callback de level-up:', error);
            }
        });

        if (this.config.DEBUG) {
            console.log(`🎉 LEVEL UP: ${username} ${oldLevel} → ${newLevel}`);
        }
    }

    /**
     * Obtiene información completa de XP de un usuario
     * @param {string} username - Nombre del usuario
     * @returns {Object} Información de XP
     */
    getUserXPInfo(username) {
        const userData = this.getUserData(username.toLowerCase());
        const progress = this.getLevelProgress(userData.xp, userData.level);

        return {
            username: username.toLowerCase(),
            xp: userData.xp,
            level: userData.level,
            title: this.getLevelTitle(userData.level),
            progress,
            streakDays: userData.streakDays || 0,
            streakMultiplier: this.getStreakMultiplier(userData.streakDays || 0),
            totalMessages: userData.totalMessages,
            achievements: userData.achievements
        };
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
                title: this.getLevelTitle(data.level)
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
        await this.saveData(true);
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
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExperienceService;
}
