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
class SessionStatsService {
    constructor(config, experienceService, achievementService) {
        this.config = config;
        this.experienceService = experienceService;
        this.achievementService = achievementService;

        // Timestamp de inicio de sesión
        this.sessionStart = Date.now();

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
            totalEmotesUsed: 0,

            // Level-ups de la sesión
            levelUps: [],  // { username, oldLevel, newLevel, timestamp }

            // Logros desbloqueados en la sesión
            achievementsUnlocked: [],  // { username, achievement, timestamp }

            // Rachas
            currentActiveStreaks: new Map(),  // { username: streakDays }

            // Comandos usados
            commandsUsed: new Map(),  // { command: count }

            // Palabras clave / frases populares
            wordFrequency: new Map(),  // { word: count }

            // Historial de actividad por minuto (para gráfico)
            activityHistory: []  // { timestamp, messages, users }
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
            if (this.stats.activityHistory.length > 60) {
                this.stats.activityHistory.shift();
            }

            // Agregar al array circular de mensajes por minuto
            this.stats.messagesByMinute.push(this.lastMinuteMessages);
            if (this.stats.messagesByMinute.length > 60) {
                this.stats.messagesByMinute.shift();
            }

            // Reset contadores del minuto
            this.lastMinuteMessages = 0;
            this.lastMinuteUsers = new Set();

        }, 60000); // Cada minuto
    }

    /**
     * Vincula a eventos de otros servicios
     * @private
     */
    _bindToServices() {
        // Suscribirse a level-ups
        if (this.experienceService) {
            this.experienceService.onLevelUp((eventData) => {
                this.stats.levelUps.push({
                    ...eventData,
                    timestamp: Date.now()
                });
            });
        }

        // Suscribirse a achievements
        if (this.achievementService) {
            this.achievementService.onAchievementUnlocked((eventData) => {
                this.stats.achievementsUnlocked.push({
                    ...eventData,
                    timestamp: Date.now()
                });
            });
        }
    }

    /**
     * Trackea un mensaje entrante
     * @param {string} username - Nombre del usuario
     * @param {string} message - Contenido del mensaje
     * @param {Object} context - Contexto adicional
     */
    trackMessage(username, message, context = {}) {
        const lowerUser = username.toLowerCase();

        // Contadores básicos
        this.stats.totalMessages++;
        this.stats.uniqueUsers.add(lowerUser);
        this.lastMinuteMessages++;
        this.lastMinuteUsers.add(lowerUser);

        // Mensajes por usuario
        const currentCount = this.stats.userMessageCounts.get(lowerUser) || 0;
        this.stats.userMessageCounts.set(lowerUser, currentCount + 1);

        // Trackear emotes usados
        if (context.emoteCount && context.emoteCount > 0) {
            this.stats.totalEmotesUsed += context.emoteCount;
        }

        // Trackear comandos
        if (message.startsWith('!')) {
            const command = message.split(' ')[0].toLowerCase();
            const cmdCount = this.stats.commandsUsed.get(command) || 0;
            this.stats.commandsUsed.set(command, cmdCount + 1);
        }

        // Trackear palabras (simple)
        this._trackWords(message);

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
     * Trackea frecuencia de palabras
     * @private
     */
    _trackWords(message) {
        // Ignorar comandos y mensajes muy cortos
        if (message.startsWith('!') || message.length < 3) return;

        const words = message.toLowerCase()
            .replace(/[^\w\sáéíóúñü]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3);  // Solo palabras de 4+ caracteres

        words.forEach(word => {
            const count = this.stats.wordFrequency.get(word) || 0;
            this.stats.wordFrequency.set(word, count + 1);
        });
    }

    /**
     * Obtiene resumen de estadísticas para mostrar en el widget
     * @returns {Object} Estadísticas resumidas
     */
    getDisplayStats() {
        const sessionDuration = Date.now() - this.sessionStart;
        const sessionMinutes = Math.floor(sessionDuration / 60000);
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
        const highestStreak = this._getHighestActiveStreak();

        return {
            // Tiempos
            sessionDuration: this._formatDuration(sessionDuration),
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
            highestStreak,
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
    _getTopUsers(n = 5) {
        return Array.from(this.stats.userMessageCounts.entries())
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
     * Obtiene la racha más alta activa
     * @private
     */
    _getHighestActiveStreak() {
        let highest = { username: null, days: 0 };

        this.stats.currentActiveStreaks.forEach((days, username) => {
            if (days > highest.days) {
                highest = {
                    username: username.charAt(0).toUpperCase() + username.slice(1),
                    days
                };
            }
        });

        return highest.username ? highest : null;
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
     * Formatea duración en texto legible
     * @private
     */
    _formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Obtiene datos para mostrar en modo idle
     * Alterna entre diferentes tipos de información
     * @param {number} cycleIndex - Índice del ciclo actual
     * @returns {Object} Datos para mostrar
     */
    getIdleDisplayData(cycleIndex = 0) {
        const displayStats = this.getDisplayStats();

        // Diferentes "pantallas" para rotar
        const screens = [
            // Pantalla 1: Resumen general
            {
                type: 'summary',
                title: 'ESTADÍSTICAS DE SESIÓN',
                data: {
                    duration: displayStats.sessionDuration,
                    messages: displayStats.totalMessages,
                    users: displayStats.uniqueUsers,
                    avgMpm: displayStats.avgMessagesPerMinute
                }
            },
            // Pantalla 2: Top usuarios
            {
                type: 'leaderboard',
                title: 'MÁS ACTIVOS',
                data: displayStats.topUsers
            },
            // Pantalla 3: XP y logros
            {
                type: 'achievements',
                title: 'PROGRESO DE SESIÓN',
                data: {
                    levelUps: displayStats.totalLevelUps,
                    achievements: displayStats.totalAchievements,
                    recent: displayStats.recentLevelUps.slice(0, 3)
                }
            },
            // Pantalla 4: Rachas
            {
                type: 'streaks',
                title: 'RACHAS ACTIVAS',
                data: {
                    highestStreak: displayStats.highestStreak,
                    totalActive: displayStats.activeStreaksCount
                }
            }
        ];

        // Rotar entre pantallas
        const screenIndex = cycleIndex % screens.length;
        return screens[screenIndex];
    }

    /**
     * Resetea estadísticas de sesión
     */
    reset() {
        this.sessionStart = Date.now();
        this.stats = {
            totalMessages: 0,
            messagesByMinute: [],
            uniqueUsers: new Set(),
            userMessageCounts: new Map(),
            emotesUsed: new Map(),
            totalEmotesUsed: 0,
            levelUps: [],
            achievementsUnlocked: [],
            currentActiveStreaks: new Map(),
            commandsUsed: new Map(),
            wordFrequency: new Map(),
            activityHistory: []
        };

        this.lastMinuteMessages = 0;
        this.lastMinuteUsers = new Set();
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

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionStatsService;
}
