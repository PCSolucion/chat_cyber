import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import { STATS, TIMING } from '../constants/AppConstants.js';
import UIUtils from '../utils/UIUtils.js';

/**
 * SessionStatsService - Estadísticas en Tiempo Real de la Sesión
 * 
 * Responsabilidades:
 * - Trackear métricas de la sesión actual
 * - Calcular estadísticas en tiempo real
 * - Proveer datos para el modo "idle" del widget
 * 
 * @class SessionStatsService
 */
export default class SessionStatsService {
    constructor(config, experienceService, achievementService, stateManager) {
        this.config = config;
        this.experienceService = experienceService;
        this.achievementService = achievementService;
        this.stateManager = stateManager;

        // Timestamp de inicio de sesión
        this.sessionStart = null;
        this.isLive = false;

        // Contadores de sesión
        this.stats = {
            // Mensajes
            totalMessages: 0,
            messagesByMinute: [],  // Array circular de los últimos 60 minutos

            // Usuarios
            uniqueUsers: new Set(),
            userMessageCounts: new Map(),  // { username: count }

            // Emotes
            emotesUsed: new Map(),  // { emoteName: count }
            emotesUsedByName: new Map(), // { emoteName: { count, provider, url } }
            totalEmotesUsed: 0,

            // Level-ups de la sesión
            levelUps: [],  // { username, oldLevel, newLevel, timestamp }

            // Logros desbloqueados en la sesión
            achievementsUnlocked: [],  // { username, achievement, timestamp }

            // Rachas
            currentActiveStreaks: new Map(),  // { username: streakDays }

            // Comandos usados
            commandsUsed: new Map(),  // { command: count }



            // Historial de actividad por minuto (para gráfico)
            activityHistory: [],  // { timestamp, messages, users }

            // Tiempo de visualización en sesión
            sessionWatchTime: new Map() // { username: minutes }
        };
        
        this._unsubscribers = [];

        // Iniciar tracking de actividad por minuto
        this._startMinuteTracker();

        // Suscribirse a eventos si los servicios están disponibles
        this._bindToServices();
    }

    /**
     * Inicia el tracker de actividad por minuto
     * @private
     */
    _startMinuteTracker() {
        this.minuteCounter = 0;
        this.lastMinuteMessages = 0;
        this.lastMinuteUsers = new Set();

        this.minuteInterval = setInterval(() => {
            // Guardar estadísticas del último minuto
            this.stats.activityHistory.push({
                timestamp: Date.now(),
                messages: this.lastMinuteMessages,
                users: this.lastMinuteUsers.size
            });

            // Mantener solo los últimos 60 minutos
            if (this.stats.activityHistory.length > STATS.ACTIVITY_HISTORY_MAX_MINUTES) {
                this.stats.activityHistory.shift();
            }

            // Agregar al array circular de mensajes por minuto
            this.stats.messagesByMinute.push(this.lastMinuteMessages);
            if (this.stats.messagesByMinute.length > STATS.MESSAGES_BY_MINUTE_BUFFER) {
                this.stats.messagesByMinute.shift();
            }

            // Reset contadores del minuto
            this.lastMinuteMessages = 0;
            this.lastMinuteUsers = new Set();

        }, TIMING.ACTIVITY_TRACKER_INTERVAL_MS); // Cada minuto
    }

    /**
     * Vincula a eventos de otros servicios
     * @private
     */
    _bindToServices() {
        // Suscribirse a level-ups vía EventManager
        this._unsubscribers.push(
            EventManager.on(EVENTS.USER.LEVEL_UP, (eventData) => {
                this.stats.levelUps.push({
                    ...eventData,
                    timestamp: Date.now()
                });
            })
        );
    
        // Suscribirse a cambios de estado del stream
        this._unsubscribers.push(
            EventManager.on(EVENTS.STREAM.STATUS_CHANGED, (isOnline) => {
                this.setStreamStatus(isOnline);
            })
        );
    
        // Suscribirse a achievements vía EventManager
        this._unsubscribers.push(
            EventManager.on(EVENTS.USER.ACHIEVEMENT_UNLOCKED, (eventData) => {
                this.stats.achievementsUnlocked.push({
                    ...eventData,
                    timestamp: Date.now()
                });
            })
        );
    }

    /**
     * Trackea un mensaje entrante
     * @param {string} userId - ID numérico de Twitch
     * @param {string} username - Nombre del usuario
     * @param {string} message - Contenido del mensaje
     * @param {Object} context - Contexto adicional
     */
    trackMessage(userId, username, message, context = {}) {
        const lowerUser = username.toLowerCase();
        // FORCE USERNAME AS ID: El sistema ahora es username-centric
        const id = lowerUser;

        // Verificar blacklist
        if (this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(lowerUser)) {
            return;
        }

        // Contadores básicos
        this.stats.totalMessages++;
        this.stats.uniqueUsers.add(id);
        this.lastMinuteMessages++;
        this.lastMinuteUsers.add(id);

        // Mensajes por usuario
        const currentCount = this.stats.userMessageCounts.get(id) || 0;
        this.stats.userMessageCounts.set(id, currentCount + 1);

        // Trackear emotes usados (cantidad total)
        if (context.emoteCount && context.emoteCount > 0) {
            this.stats.totalEmotesUsed += context.emoteCount;
        }

        // Trackear emotes individuales por nombre
        if (context.emoteNames && context.emoteNames.length > 0) {
            this._trackEmotes(context.emoteNames);
        }

        // Trackear comandos
        if (message.startsWith('!')) {
            const command = message.split(' ')[0].toLowerCase();
            const cmdCount = this.stats.commandsUsed.get(command) || 0;
            this.stats.commandsUsed.set(command, cmdCount + 1);
        }



        // Actualizar rachas si están disponibles
        if (this.experienceService) {
            try {
                const userData = this.experienceService.getUserData(userId, username);
                if (userData && userData.streakDays > 0) {
                    this.stats.currentActiveStreaks.set(id, userData.streakDays);
                }
            } catch (e) {
                // Ignorar errores
            }
        }
    }

    /**
     * Trackea tiempo de visualización para la sesión actual
     * @param {string} username 
     * @param {number} minutes 
     */
    trackSessionWatchTime(userId, username, minutes) {
        const lowerUser = username.toLowerCase();
        // FORCE USERNAME AS ID
        const id = lowerUser;

        // Verificar blacklist y justinfan
        if ((this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(lowerUser)) || lowerUser.startsWith('justinfan')) {
            return;
        }

        const current = this.stats.sessionWatchTime.get(id) || 0;
        this.stats.sessionWatchTime.set(id, current + minutes);
    }

    /**
     * Trackea tiempo de visualización para múltiples usuarios (Batch)
     * @param {Array} chatters 
     * @param {number} minutes 
     */
    trackSessionWatchTimeBatch(chatters, minutes) {
        if (!chatters || !Array.isArray(chatters)) return;

        chatters.forEach(username => {
            this.trackSessionWatchTime(null, username, minutes);
        });
    }

    /**
     * Trackea emotes individuales por nombre
     * @private
     * @param {Array} emoteNames - Array de objetos { name, provider?, url? }
     */
    _trackEmotes(emoteNames) {
        emoteNames.forEach(emote => {
            const name = typeof emote === 'string' ? emote : emote.name;
            const provider = typeof emote === 'object' ? emote.provider : 'twitch';
            const url = typeof emote === 'object' ? emote.url : null;

            const existing = this.stats.emotesUsedByName.get(name);
            if (existing) {
                existing.count++;
            } else {
                this.stats.emotesUsedByName.set(name, {
                    count: 1,
                    provider: provider,
                    url: url
                });
            }
        });
    }



    /**
     * Obtiene los top N emotes más usados
     * @param {number} n - Número de emotes a retornar
     * @returns {Array} Array de { name, count, provider, url }
     */
    getTopEmotes(n = 5) {
        return Array.from(this.stats.emotesUsedByName.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, n)
            .map(([name, data]) => ({
                name,
                count: data.count,
                provider: data.provider,
                url: data.url
            }));
    }

    /**
     * Obtiene resumen de estadísticas para mostrar en el widget
     * @returns {Object} Estadísticas resumidas
     */
    getDisplayStats() {
        // Si no estamos en directo, la duración es 0
        const sessionDuration = (this.isLive && this.sessionStart)
            ? Date.now() - this.sessionStart
            : 0;

        const sessionMinutes = Math.floor(sessionDuration / TIMING.MINUTE_MS);
        const sessionHours = Math.floor(sessionMinutes / 60);

        // Calcular mensajes por minuto promedio
        const avgMessagesPerMinute = sessionMinutes > 0
            ? Math.round(this.stats.totalMessages / sessionMinutes * 10) / 10
            : this.stats.totalMessages;

        // Top 5 usuarios más activos
        const topUsers = this._getTopUsers(5);

        // Obtener última actividad
        const lastActivity = this._getLastActivity();

        // Level-ups recientes (últimos 5)
        const recentLevelUps = this.stats.levelUps.slice(-5).reverse();

        // Logros recientes (últimos 3)
        const recentAchievements = this.stats.achievementsUnlocked.slice(-3).reverse();

        // Racha más alta activa
        // Top rachas activas (Top 2 para el VS)
        const topStreaks = this._getTopActiveStreaks(2);

        return {
            // Tiempos
            sessionDuration: UIUtils.formatDuration(sessionDuration),
            sessionMinutes,
            sessionHours,

            // Contadores principales
            totalMessages: this.stats.totalMessages,
            uniqueUsers: this.stats.uniqueUsers.size,
            avgMessagesPerMinute,

            // Rankings
            topUsers,

            // Emotes
            totalEmotesUsed: this.stats.totalEmotesUsed,

            // Level-ups y logros
            totalLevelUps: this.stats.levelUps.length,
            totalAchievements: this.stats.achievementsUnlocked.length,
            recentLevelUps,
            recentAchievements,

            // Rachas
            topStreaks,
            activeStreaksCount: this.stats.currentActiveStreaks.size,

            // Última actividad
            lastActivity,

            // Actividad reciente (para gráfico simple)
            recentActivity: this.stats.activityHistory.slice(-10)
        };
    }

    /**
     * Obtiene el ranking global de los 10 mejores
     */
    getGlobalLeaderboard(limit = 10) {
        if (!this.experienceService) return [];
        return this.experienceService.getXPLeaderboard(limit);
    }

    /**
     * Obtiene los top N usuarios más activos
     * @private
     */
    /**
     * Obtiene los top N usuarios más activos
     * @private
     */
    _getTopUsers(n = 20) {
        return Array.from(this.stats.userMessageCounts.entries())
            .filter(([id]) => {
                // Filtrar usuarios blacklisted y justinfan
                if (String(id).startsWith('justinfan')) return false;
                // Si el ID es un nombre, verificar blacklist. Si es numérico, intentamos buscar nombre.
                const name = isNaN(id) ? id : (this.stateManager?.users.get(id)?.displayName || id);
                if (this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(name.toLowerCase())) return false;
                return true;
            })
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([id, count]) => {
                // Obtener datos adicionales si están disponibles
                let level = 1;
                let title = 'CIVILIAN';
                let displayName = isNaN(id) ? id : id;

                if (this.experienceService) {
                    try {
                        const userData = this.stateManager?.users.get(id);
                        if (userData) {
                            level = userData.level;
                            title = this.experienceService.levelCalculator.getLevelTitle(level);
                            displayName = userData.displayName || id;
                        }
                    } catch (e) {
                        // Ignorar
                    }
                }

                return {
                    username: UIUtils.formatUsername(displayName),
                    messages: count,
                    level,
                    title
                };
            });
    }

    /**
     * Obtiene las top N rachas más altas activas
     * @private
     */
    _getTopActiveStreaks(n = 2) {
        return Array.from(this.stats.currentActiveStreaks.entries())
            .filter(([id]) => {
                if (String(id).startsWith('justinfan')) return false;
                
                // Resolver nombre para filtrar por blacklist
                const name = isNaN(id) ? id : (this.stateManager?.users.get(id)?.displayName || id);
                if (this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(String(name).toLowerCase())) return false;
                return true;
            })
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([id, days]) => {
                const displayName = isNaN(id) ? id : (this.stateManager?.users.get(id)?.displayName || id);
                return {
                    username: UIUtils.formatUsername(displayName),
                    days
                };
            });
    }

    /**
     * Obtiene los top N suscriptores por meses
     * @param {number} n
     */
    getTopSubscribers(n = 20) {
        if (!this.stateManager) return [];

        return Array.from(this.stateManager.getAllUsers().entries())
            .filter(([id, data]) => {
                // Excluir al streamer y filtrar por meses > 0
                const broadcaster = this.config.BROADCASTER_USERNAME || this.config.TWITCH_CHANNEL || 'liiukiin';
                const name = data.displayName || id;
                
                if (name.toLowerCase() === broadcaster.toLowerCase()) return false;
                return data.subMonths && data.subMonths > 0;
            })
            .sort((a, b) => (b[1].subMonths || 0) - (a[1].subMonths || 0))
            .slice(0, n)
            .map(([id, data]) => ({
                username: UIUtils.formatUsername(data.displayName || id),
                months: data.subMonths,
                level: data.level
            }));
    }

    /**
     * Obtiene los top N usuarios por tiempo de visualización
     * @param {string} period 'session', 'week', 'month', 'total'
     * @param {number} n 
     */
    getTopWatchTime(period, n) {
        let users = [];

        if (period === 'session') {
            users = Array.from(this.stats.sessionWatchTime.entries())
                .map(([username, minutes]) => ({ username, minutes }));
        } else if (this.stateManager) {
            // Iterar sobre todos los usuarios conocidos por StateManager
            // Usar entries para tener el objeto de datos y evitar llamadas innecesarias a getUser
            users = Array.from(this.stateManager.getAllUsers().entries()).map(([id, data]) => ({
                id,
                username: data.displayName || id,
                minutes: this.experienceService.getWatchTimeStats(id, data.displayName, period)
            }));
        }

        // Sort y slice
        return users
            .filter(u => {
                const lowerUser = String(u.username).toLowerCase();
                // Filtrar usuarios blacklisted y justinfan
                if (lowerUser.startsWith('justinfan')) return false;
                
                // El nombre de u.username puede ser un ID en el periodo de sesión
                const resolvedName = isNaN(u.username) ? u.username : (this.stateManager?.users.get(u.username)?.displayName || u.username);
                if (this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(String(resolvedName).toLowerCase())) return false;
                
                return u.minutes > 0;
            })
            .sort((a, b) => b.minutes - a.minutes)
            .slice(0, n)
            .map(u => {
                const finalName = isNaN(u.username) ? u.username : (this.stateManager?.users.get(u.username)?.displayName || u.username);
                return {
                    username: UIUtils.formatUsername(finalName),
                    minutes: u.minutes,
                    formatted: UIUtils.formatDuration(u.minutes * (TIMING.SECOND_MS * 60))
                };
            });
    }

    /**
     * Obtiene información sobre la última actividad
     * @private
     */
    _getLastActivity() {
        if (this.stats.activityHistory.length === 0) {
            return null;
        }

        const last = this.stats.activityHistory[this.stats.activityHistory.length - 1];
        return {
            messagesLastMinute: last?.messages || 0,
            usersLastMinute: last?.users || 0
        };
    }





    /**
     * Resetea estadísticas de sesión
     * NOTA: Esto solo reinicia los contadores visuales de LA SESIÓN ACTUAL.
     * NO borra niveles, logros ni rachas persistentes de la base de datos (ExperienceService).
     */
    reset() {
        this.sessionStart = Date.now();
        this.stats = {
            totalMessages: 0,
            messagesByMinute: [],
            uniqueUsers: new Set(),
            userMessageCounts: new Map(),
            emotesUsed: new Map(),
            emotesUsedByName: new Map(),
            totalEmotesUsed: 0,
            levelUps: [],
            achievementsUnlocked: [],
            currentActiveStreaks: new Map(),
            commandsUsed: new Map(),
            wordFrequency: new Map(),
            activityHistory: [],
            sessionWatchTime: new Map()
        };

        this.lastMinuteMessages = 0;
        this.lastMinuteUsers = new Set();
    }

    /**
     * Actualiza el estado del stream para controlar la sesión
     * @param {boolean} isOnline 
     */
    setStreamStatus(isOnline) {
        if (isOnline) {
            // Si pasamos a ONLINE y no estábamos trackeando, iniciamos sesión
            if (!this.isLive) {
                console.log('🔴 Stream ONLINE detector: Starting session stats...');
                this.startSession();
            }
        } else {
            // Si pasamos a OFFLINE y estábamos trackeando, paramos
            if (this.isLive) {
                console.log('⚫ Stream OFFLINE detector: Stopping session stats...');
                this.stopSession();
            }
        }
    }

    /**
     * Inicia una nueva sesión de estadísticas
     */
    startSession() {
        // Solo resetear si venimos de un estado offline y hay datos viejos
        // Esto previene reinicios accidentales si hay micro-cortes
        if (!this.isLive) {
            this.reset();
        }
        this.isLive = true;
        this.sessionStart = Date.now();
    }

    /**
     * Detiene la sesión actual
     */
    stopSession() {
        this.isLive = false;
        this.sessionStart = null;
        // NO reseteamos las stats (mensajes, usuarios, etc) para mantener los datos visibles
        // hasta el próximo directo o reinicio manual
    }

    /**
     * Limpia recursos
     */
    destroy() {
        if (this.minuteInterval) {
            clearInterval(this.minuteInterval);
        }
        
        // Limpiar suscripciones a eventos para evitar memory leaks
        if (this._unsubscribers) {
            this._unsubscribers.forEach(unsub => {
                if (typeof unsub === 'function') unsub();
            });
            this._unsubscribers = [];
        }
    }
}
