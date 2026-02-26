import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import XPDisplayRenderer from './ui/XPDisplayRenderer.js';
import Logger from '../utils/Logger.js';

/**
 * XPDisplayManager - Gestión de Lógica de UI para el Sistema de XP
 * 
 * Responsabilidades:
 * - Coordinar actualizaciones del display de XP basándose en eventos
 * - Gestionar el estado del usuario activo en el widget
 * - Delegar el renderizado físico a XPDisplayRenderer
 * 
 * @class XPDisplayManager
 */
export default class XPDisplayManager {
    /**
     * Constructor del manager de display de XP
     */
    constructor(config, experienceService, achievementService) {
        this.config = config;
        this.experienceService = experienceService;
        this.achievementService = achievementService;

        // Inicializar Renderer (UI)
        this.renderer = new XPDisplayRenderer(config);

        // Estado
        this.totalAchievements = 0;
        this._updateTotalAchievements();
        
        this.currentUsername = null;
        this.currentUserId = null;

        // Inicializar cuando DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    _updateTotalAchievements() {
        if (this.achievementService) {
            this.totalAchievements = this.achievementService.getTotalAchievements();
        }
    }

    init() {
        this.renderer.initDOMReferences();
        this.bindEvents();
    }

    bindEvents() {
        this._handlers = {};
        // Suscribirse a ganancias de XP
        this._handlers.xpGained = EventManager.on(EVENTS.USER.XP_GAINED, (data) => {
            const isMatch = (this.currentUsername && data.username && 
                           data.username.toLowerCase() === this.currentUsername.toLowerCase());
            
            if (isMatch) {
                this.updateXPDisplay(null, data.username);
            }
        });
    }

    /**
     * Limpia y destruye el manager (previene memory leaks)
     */
    destroy() {
        if (this._handlers) {
            if (this._handlers.xpGained) this._handlers.xpGained();
        }
        if (this.renderer && typeof this.renderer.destroy === 'function') {
            this.renderer.destroy();
        }
    }

    /**
     * Actualiza toda la UI de XP para un usuario activo
     */
    updateXPDisplay(userId, username, xpResult = null) {
        if (!this.experienceService) return;
        
        this.currentUsername = username;
        this.currentUserId = null;

        // Obtener info de XP
        const xpInfo = xpResult || this.experienceService.getUserXPInfo(null, username);
        const progress = xpInfo.levelProgress || xpInfo.progress;

        // Preparar datos para el renderer
        const renderData = {
            level: xpInfo.level || 1,
            title: xpInfo.levelTitle || xpInfo.title || 'CIVILIAN',
            progress: progress ? {
                percentage: progress.percentage || 0,
                currentXP: progress.xpInCurrentLevel || 0,
                nextXP: progress.xpNeededForNext || 100
            } : null,
            streak: {
                days: xpInfo.streakDays || (xpResult && xpResult.streakDays) || 0,
                multiplier: xpInfo.streakMultiplier || (xpResult && xpResult.streakMultiplier) || 1,
                isReturning: xpResult && xpResult.isReturning,
                daysAway: xpResult ? xpResult.daysAway : 0
            },
            achievements: this.totalAchievements > 0 ? {
                unlocked: (this.experienceService.getUserData(null, username).achievements || []).length,
                total: this.totalAchievements
            } : null
        };

        this.renderer.renderXP(renderData);

        // Mostrar ganancia de XP si existe
        if (xpResult && xpResult.xpGained > 0) {
            this.renderer.renderXPGain(xpResult.xpGained);
        }
    }

    /**
     * Muestra la animación de Level Up Inline
     */
    showLevelUp(eventData) {
        if (this.config.DEBUG) Logger.debug('XP', `🎬 Iniciando LevelUp INLINE para: ${eventData.username}`, eventData);
        this.renderer.renderLevelUpInline(eventData.newLevel);
    }

    /**
     * Muestra la animación de Level Up en el Overlay Superior
     */
    showTopLevelUp(eventData) {
        if (this.config.DEBUG) Logger.debug('XP', `🎬 Iniciando LevelUp OVERLAY para: ${eventData.username}`, eventData);
        this.renderer.renderTopLevelUp(eventData);
    }

    /**
     * Activa visuales de suscriptor (Gold Mode) en el widget de XP
     */
    handleGoldMode(subInfo) {
        this.renderer.renderGoldMode(subInfo);
    }

    hideTopLevelUp() {
        this.renderer.hideTopLevelUp();
    }

    hideLevelUpInline() {
        this.renderer.hideLevelUpInline();
    }

    hideLevelUp() {
        this.renderer.hideTopLevelUp();
        this.renderer.hideLevelUpInline();
    }

    formatNumber(num) {
        return this.renderer.formatNumber(num);
    }

    reset() {
        this.currentUsername = null;
        this.renderer.reset();
    }

    setVisible(visible) {
        this.renderer.setVisible(visible);
    }
}
