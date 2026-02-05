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
    constructor(config, experienceService, achievementService) {
        this.config = config;
        this.experienceService = experienceService;
        this.achievementService = achievementService;

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
        EventManager.on(EVENTS.USER.LEVEL_UP, (eventData) => {
            this.stats.levelUps.push({
                ...eventData,
                timestamp: Date.now()
            });
        });

        // Suscribirse a cambios de estado del stream
        EventManager.on(EVENTS.STREAM.STATUS_CHANGED, (isOnline) => {
            this.setStreamStatus(isOnline);
        });

        // Suscribirse a achievements vía EventManager
        EventManager.on(EVENTS.USER.ACHIEVEMENT_UNLOCKED, (eventData) => {
            this.stats.achievementsUnlocked.push({
                ...eventData,
                timestamp: Date.now()
            });
        });
    }

    /**
     * Trackea un mensaje entrante
     * @param {string} username - Nombre del usuario
     * @param {string} message - Contenido del mensaje
     * @param {Object} context - Contexto adicional
     */
    trackMessage(username, message, context = {}) {
        const lowerUser = username.toLowerCase();

        // Verificar blacklist
        if (this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(lowerUser)) {
            return;
        }

        // Contadores básicos
        this.stats.totalMessages++;
        this.stats.uniqueUsers.add(lowerUser);
        this.lastMinuteMessages++;
        this.lastMinuteUsers.add(lowerUser);

        // Mensajes por usuario
        const currentCount = this.stats.userMessageCounts.get(lowerUser) || 0;
        this.stats.userMessageCounts.set(lowerUser, currentCount + 1);

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
                const userData = this.experienceService.getUserData(lowerUser);
                if (userData && userData.streakDays > 0) {
                    this.stats.currentActiveStreaks.set(lowerUser, userData.streakDays);
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
    trackSessionWatchTime(username, minutes) {
        const lowerUser = username.toLowerCase();

        // Verificar blacklist y justinfan
        if ((this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(lowerUser)) || lowerUser.startsWith('justinfan')) {
            return;
        }

        const current = this.stats.sessionWatchTime.get(lowerUser) || 0;
        this.stats.sessionWatchTime.set(lowerUser, current + minutes);
    }

    /**
     * Trackea tiempo de visualización para múltiples usuarios (Batch)
     * @param {Array} chatters 
     * @param {number} minutes 
     */
    trackSessionWatchTimeBatch(chatters, minutes) {
        if (!chatters || !Array.isArray(chatters)) return;

        chatters.forEach(username => {
            this.trackSessionWatchTime(username, minutes);
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
     * Obtiene los top N usuarios más activos
     * @private
     */
    /**
     * Obtiene los top N usuarios más activos
     * @private
     */
    _getTopUsers(n = 20) {
        return Array.from(this.stats.userMessageCounts.entries())
            .filter(([username]) => {
                // Filtrar usuarios blacklisted y justinfan (aunque trackMessage ya lo hace, doble seguridad)
                if (username.startsWith('justinfan')) return false;
                if (this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(username)) return false;
                return true;
            })
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([username, count]) => {
                // Obtener datos adicionales si están disponibles
                let level = 1;
                let title = 'CIVILIAN';

                if (this.experienceService) {
                    try {
                        const xpInfo = this.experienceService.getUserXPInfo(username);
                        if (xpInfo) {
                            level = xpInfo.level;
                            title = xpInfo.title;
                        }
                    } catch (e) {
                        // Ignorar
                    }
                }

                return {
                    username: username.charAt(0).toUpperCase() + username.slice(1),
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
            .filter(([username]) => {
                if (username.startsWith('justinfan')) return false;
                if (this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(username)) return false;
                return true;
            })
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([username, days]) => ({
                username: UIUtils.formatUsername(username),
                days
            }));
    }

    /**
     * Obtiene los top N suscriptores por meses
     * @param {number} n
     */
    getTopSubscribers(n = 20) {
        if (!this.experienceService || !this.experienceService.usersXP) return [];

        return Array.from(this.experienceService.usersXP.entries())
            .filter(([username, data]) => {
                // Excluir al streamer y filtrar por meses > 0
                // Fallback: Si no hay BROADCASTER_USERNAME, usa TWITCH_CHANNEL, o 'liiukiin' por defecto
                const broadcaster = this.config.BROADCASTER_USERNAME || this.config.TWITCH_CHANNEL || 'liiukiin';
                
                if (username.toLowerCase() === broadcaster.toLowerCase()) return false;
                return data.subMonths && data.subMonths > 0;
            })
            .sort((a, b) => b[1].subMonths - a[1].subMonths)
            .slice(0, n)
            .map(([username, data]) => ({
                username: UIUtils.formatUsername(username),
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
        } else if (this.experienceService) {
            // Iterar sobre todos los usuarios conocidos por XP service
            // NOTA: Esto acceso a propiedad interna usersXP, idealmente debería haber un método público
            // pero por simplicidad accedemos al Map si está accesible
            if (this.experienceService.usersXP) {
                users = Array.from(this.experienceService.usersXP.keys()).map(username => ({
                    username,
                    minutes: this.experienceService.getWatchTimeStats(username, period)
                }));
            }
        }

        // Sort y slice
        return users
            .filter(u => {
                const lowerUser = u.username.toLowerCase();
                // Filtrar usuarios blacklisted y justinfan
                if (lowerUser.startsWith('justinfan')) return false;
                if (this.config.BLACKLISTED_USERS && this.config.BLACKLISTED_USERS.includes(lowerUser)) return false;
                return u.minutes > 0;
            })
            .sort((a, b) => b.minutes - a.minutes)
            .slice(0, n)
            .map(u => ({
                username: UIUtils.formatUsername(u.username),
                minutes: u.minutes,
                formatted: UIUtils.formatDuration(u.minutes * TIMING.MINUTE_MS) // Convert back to ms for format
            }));
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
    }
}
