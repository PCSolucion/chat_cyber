import { IDLE } from '../constants/AppConstants.js';
import Logger from '../utils/Logger.js';
import SummaryScreen from './ui/screens/SummaryScreen.js';
import LeaderboardScreen from './ui/screens/LeaderboardScreen.js';
import TopSubsScreen from './ui/screens/TopSubsScreen.js';
import TrendingScreen from './ui/screens/TrendingScreen.js';
import AchievementsScreen from './ui/screens/AchievementsScreen.js';
import LastAchievementScreen from './ui/screens/LastAchievementScreen.js';
import StreaksScreen from './ui/screens/StreaksScreen.js';
import WatchTimeScreen from './ui/screens/WatchTimeScreen.js';

/**
 * IdleScreenRenderer - Encargado de generar el HTML de las pantallas de inactividad
 * 
 * Implementa un patrón Strategy para delegar el renderizado en clases especializadas.
 * 
 * @class IdleScreenRenderer
 */
export default class IdleScreenRenderer {
    constructor(statsService) {
        this.statsService = statsService; // Necesario para SummaryScreen

        // Registro de estrategias de pantalla
        this.screens = {
            'summary': new SummaryScreen(),
            'leaderboard': new LeaderboardScreen(),
            'top_subscribers': new TopSubsScreen(),
            'trending': new TrendingScreen(),
            'achievements': new AchievementsScreen(),
            'last_achievement': new LastAchievementScreen(),
            'streaks': new StreaksScreen(),
            'watchtime_session': new WatchTimeScreen(),
            'watchtime_total': new WatchTimeScreen()
        };
    }

    /**
     * Renderiza una pantalla específica en el contenedor
     * @param {Object} screenData Datos de la pantalla a renderizar
     * @param {HTMLElement} container Contenedor donde se insertará el contenido
     */
    render(screenData, container) {
        if (!container) return;
        if (!screenData) {
            container.innerHTML = '<div class="empty-message">ERROR: NO SCREEN DATA</div>';
            return;
        }

        // Limpiar contenedor
        container.innerHTML = '';

        // Crear contenedor para el contenido de la pantalla
        const screenContent = document.createElement('div');
        screenContent.className = 'idle-screen-content';
        container.appendChild(screenContent);

        try {
            const screen = this.screens[screenData.type] || this.screens['summary'];
            screen.render(screenData, screenContent);
        } catch (error) {
            Logger.error('UI', `Error rendering idle screen of type ${screenData.type}`, error);
            
            // Si falla la renderización, mostramos error específico en lugar de summary con datos erróneos
            screenContent.innerHTML = `
                <div class="empty-message animate-in">
                    <div style="color: var(--cyber-red); margin-bottom: 10px; font-weight: bold;">[SISTEMA_ERROR]</div>
                    FALLO EN LA GENERACIÓN DE DATOS<br>
                    TIPO: ${screenData.type.toUpperCase()}<br>
                    REINTENTANDO EN EL PRÓXIMO CICLO...
                </div>
            `;
            
            // Ya no hacemos fallback al summary porque screenData.data 
            // no corresponde con lo que espera SummaryScreen y causa datos vacíos/erróneos.
        }
    }

    /**
     * Calcula la duración óptima para una pantalla basada en su contenido
     * @param {Object} screenData Datos de la pantalla
     * @param {number} baseRotationMs Duración base configurada
     * @returns {number} Duración calculada en milisegundos
     */
    calculateScreenDuration(screenData, baseRotationMs) {
        const rotationMs = (typeof baseRotationMs === 'number' && !isNaN(baseRotationMs)) 
            ? baseRotationMs 
            : (IDLE.DEFAULT_ROTATION_MS || 12000);
            
        if (!screenData || !screenData.type) return rotationMs;

        const screen = this.screens[screenData.type];
        if (screen) {
            return screen.calculateDuration(screenData, rotationMs);
        }

        return rotationMs;
    }

    _renderError(container, type) {
        container.innerHTML = `
            <div class="empty-message" style="font-size: 10px; opacity: 0.5;">
                [INTERNAL_RENDER_ERROR]: ${type}<br>
                FALLBACK_RECOVERY_ACTIVE
            </div>
        `;
    }

    /**
     * @deprecated Usar UIUtils.animateValue
     */
    animateValue(elementId, start, end, duration) {
        // Mantenido por compatibilidad si alguna clase externa lo llama, pero el render interno usa UIUtils
        import('../utils/UIUtils.js').then(module => {
            module.default.animateValue(elementId, start, end, duration);
        });
    }
}
