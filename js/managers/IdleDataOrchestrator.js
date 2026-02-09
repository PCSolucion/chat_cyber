/**
 * IdleDataOrchestrator - Orquestador de Datos para el Modo Idle
 * 
 * Responsabilidades:
 * - Decidir qué pantalla mostrar en cada ciclo de inactividad
 * - Preparar y formatear los datos necesarios para cada pantalla
 * - Centralizar la lógica de selección de contenido idle
 * 
 * @class IdleDataOrchestrator
 */
export default class IdleDataOrchestrator {
    /**
     * @param {SessionStatsService} statsService - Servicio de estadísticas
     */
    constructor(statsService) {
        this.statsService = statsService;
    }

    /**
     * Obtiene los datos para la pantalla actual según el índice de ciclo
     * @param {number} cycleIndex - Índice actual del ciclo de rotación
     * @returns {Object} Datos formateados para el renderer
     */
    getData(cycleIndex = 0) {
        if (!this.statsService) return null;

        try {
            const displayStats = this.statsService.getDisplayStats() || {};

            // 1. Definir todas las pantallas potenciales
            const allScreens = [
                {
                    type: 'summary',
                    title: 'ESTADÍSTICAS DE SESIÓN',
                    data: {
                        duration: displayStats.sessionDuration || '00:00:00',
                        messages: displayStats.totalMessages || 0,
                        users: displayStats.uniqueUsers || 0,
                        avgMpm: displayStats.avgMessagesPerMinute || 0,
                        sessionStart: this.statsService.sessionStart || Date.now()
                    },
                    // El resumen siempre es válido si hay al menos un mensaje o ha pasado tiempo
                    isValid: () => (displayStats.totalMessages > 0 || displayStats.sessionDuration !== '00:00:00')
                },
                {
                    type: 'leaderboard',
                    title: 'MÁS ACTIVOS',
                    data: displayStats.topUsers || [],
                    isValid: (s) => s.data && s.data.length > 0
                },
                {
                    type: 'trending',
                    title: 'TRENDING HOY',
                    data: {
                        topEmotes: this.statsService.getTopEmotes ? this.statsService.getTopEmotes(3) : [],
                        totalEmotes: (this.statsService.stats && this.statsService.stats.totalEmotesUsed) || 0
                    },
                    isValid: (s) => s.data.totalEmotes > 0 || s.data.topEmotes.length > 0
                },
                {
                    type: 'achievements',
                    title: 'PROGRESO DE SESIÓN',
                    data: {
                        levelUps: displayStats.totalLevelUps || 0,
                        achievements: displayStats.totalAchievements || 0,
                        recent: (displayStats.recentLevelUps || []).slice(0, 3)
                    },
                    isValid: (s) => s.data.levelUps > 0 || s.data.achievements > 0
                },
                {
                    type: 'streaks',
                    title: 'RACHAS ACTIVAS',
                    data: {
                        topStreaks: displayStats.topStreaks || [],
                        totalActive: displayStats.activeStreaksCount || 0
                    },
                    isValid: (s) => s.data.totalActive > 0 || s.data.topStreaks.length > 0
                },
                {
                    type: 'watchtime_session',
                    title: 'TIEMPO EN DIRECTO',
                    data: this.statsService.getTopWatchTime ? this.statsService.getTopWatchTime('session', 20) : [],
                    isValid: (s) => s.data && s.data.length > 0
                },
                {
                    type: 'watchtime_total',
                    title: 'TIEMPO TOTAL',
                    data: this.statsService.getTopWatchTime ? this.statsService.getTopWatchTime('total', 10) : [],
                    isValid: (s) => s.data && s.data.length > 0
                },
                {
                    type: 'last_achievement',
                    title: 'ÚLTIMO LOGRO DESBLOQUEADO',
                    data: (displayStats.recentAchievements && displayStats.recentAchievements.length > 0) ? displayStats.recentAchievements[0] : null,
                    isValid: (s) => s.data !== null
                },
                {
                    type: 'top_subscribers',
                    title: 'SUSCRIPTORES VETERANOS',
                    data: this.statsService.getTopSubscribers ? this.statsService.getTopSubscribers(20) : [],
                    isValid: (s) => s.data && s.data.length > 0
                }
            ];

            // 2. Filtrar solo las pantallas que tienen datos reales
            const activeScreens = allScreens.filter(screen => screen.isValid(screen));

            // Si no hay ninguna pantalla con datos (ej. stream recién arrancado), 
            // siempre devolvemos el resumen como fallback para que no explote
            if (activeScreens.length === 0) {
                return allScreens[0]; 
            }

            // 3. Calcular el índice real de la pantalla dentro del array filtrado
            const screenIndex = Math.abs(cycleIndex) % activeScreens.length;
            const screenData = activeScreens[screenIndex];
            
            // Adjuntar metadatos de navegación basados en el set ACTIVO
            if (screenData) {
                screenData.totalScreens = activeScreens.length;
            }
            
            return screenData;
        } catch (error) {
            console.error('❌ Error orchestrating idle data:', error);
            return {
                type: 'summary',
                title: 'ERROR DE SISTEMA',
                data: { duration: 'ERR', messages: 0, users: 0, avgMpm: 0 },
                totalScreens: 1
            };
        }
    }
}
