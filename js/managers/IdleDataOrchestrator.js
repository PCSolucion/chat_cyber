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

        const displayStats = this.statsService.getDisplayStats();

        // Lista de pantallas disponibles y su lógica de obtención de datos
        const screens = [
            // Pantalla 1: Resumen general de la sesión
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
            // Pantalla 2: Leaderboard de actividad
            {
                type: 'leaderboard',
                title: 'MÁS ACTIVOS',
                data: displayStats.topUsers
            },
            // Pantalla 3: Tendencias (Emotes y Palabras)
            {
                type: 'trending',
                title: 'TRENDING HOY',
                data: {
                    topEmotes: this.statsService.getTopEmotes(3),
                    totalEmotes: this.statsService.stats.totalEmotesUsed
                }
            },
            // Pantalla 4: Logros y niveles de la sesión
            {
                type: 'achievements',
                title: 'PROGRESO DE SESIÓN',
                data: {
                    levelUps: displayStats.totalLevelUps,
                    achievements: displayStats.totalAchievements,
                    recent: displayStats.recentLevelUps.slice(0, 3)
                }
            },
            // Pantalla 5: Rachas activas
            {
                type: 'streaks',
                title: 'RACHAS ACTIVAS',
                data: {
                    topStreaks: displayStats.topStreaks,
                    totalActive: displayStats.activeStreaksCount
                }
            },
            // Pantalla 6: Tiempo de visualización en la sesión actual
            {
                type: 'watchtime_session',
                title: 'TIEMPO EN DIRECTO',
                data: this.statsService.getTopWatchTime('session', 20)
            },
            // Pantalla 7: Tiempo de visualización histórico (acumulado)
            {
                type: 'watchtime_total',
                title: 'TIEMPO TOTAL (HISTÓRICO)',
                data: this.statsService.getTopWatchTime('total', 15)
            },
            // Pantalla 8: Detalle del último logro desbloqueado
            {
                type: 'last_achievement',
                title: 'ÚLTIMO LOGRO DESBLOQUEADO',
                data: displayStats.recentAchievements.length > 0 ? displayStats.recentAchievements[0] : null
            },
            // Pantalla 9: Ranking de suscriptores veteranos
            {
                type: 'top_subscribers',
                title: 'SUSCRIPTORES VETERANOS',
                data: this.statsService.getTopSubscribers(20)
            }
        ];

        // Calcular el índice real de la pantalla dentro del array
        const screenIndex = cycleIndex % screens.length;
        const screenData = screens[screenIndex];
        
        // Adjuntar metadatos de navegación
        screenData.totalScreens = screens.length;
        
        return screenData;
    }
}
