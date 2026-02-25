import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import { IDLE, DEFAULTS } from '../constants/AppConstants.js';
import IdleScreenRenderer from './IdleScreenRenderer.js';
import IdleDataOrchestrator from './IdleDataOrchestrator.js';
import IdleTimerService from './IdleTimerService.js';
import UIUtils from '../utils/UIUtils.js';

/**
 * IdleDisplayManager - Gestiona la visualización cuando no hay chat activo
 * 
 * Responsabilidades:
 * - Coordinar la entrada/salida de modo idle.
 * - Gestionar la mutación visual del widget (ocultar/mostrar elementos).
 * - Delegar el renderizado y la gestión de tiempos.
 */
export default class IdleDisplayManager {
    constructor(config, sessionStatsService, uiManager) {
        this.config = config;
        this.statsService = sessionStatsService;
        this.uiManager = uiManager;

        // Componentes delegados
        this.renderer = new IdleScreenRenderer(sessionStatsService);
        this.orchestrator = new IdleDataOrchestrator(sessionStatsService);
        this.timerService = new IdleTimerService(config);

        // Configuración de visualización
        this.totalScreensInCycle = Number(IDLE.TOTAL_SCREENS_IN_CYCLE) || 9;
        this.currentCycleIndex = 0;

        // Estado visual
        this.idleContainer = null;

        // Inicializar
        this._createIdleContainer();
        this._setupTimerCallbacks();
        this._setupEventListeners();
    }

    /**
     * Configura los callbacks del servicio de tiempo
     * @private
     */
    _setupTimerCallbacks() {
        this.timerService.setCallbacks({
            onEnterIdle: () => this._enterIdleMode(),
            onExitIdle: () => this._exitIdleMode(),
            onRotate: (screensShown) => this._handleRotation(screensShown),
            onHide: () => this._hideAfterCycles(),
            onShow: () => this._showWidgetAfterHidden()
        });
    }

    _setupEventListeners() {
        this._handlers = {
            activity: () => this.onActivity(),
            messageHidden: () => this.timerService.enterIdle()
        };

        EventManager.on(EVENTS.USER.ACTIVITY, this._handlers.activity);
        EventManager.on(EVENTS.UI.MESSAGE_HIDDEN, this._handlers.messageHidden);
    }

    /**
     * Reacción a la actividad del usuario
     */
    onActivity() {
        this.timerService.exitIdle();
    }

    /**
     * Maneja la lógica de cambio de pantalla y decide si debe terminar
     * @private
     */
    _handleRotation(screensShown) {
        // En la primera llamada (screensShown=0), forzar actualización
        const currentScreenData = this.orchestrator.getData(screensShown);
        
        if (!currentScreenData) return { delay: 5000 };

        // El Orchestrator nos dice cuántas pantallas hay con datos reales actualmente
        const activeScreensCount = currentScreenData.totalScreens || this.totalScreensInCycle;
        
        // Si ya mostramos todas las pantallas que tenían datos (una vuelta completa)
        if (screensShown >= activeScreensCount) {
            return { shouldHide: true };
        }

        // Actualizar UI con el índice actual
        this.currentCycleIndex = screensShown;
        this._updateIdleDisplay();

        // Calcular delay para la siguiente pantalla
        return { 
            delay: this.renderer.calculateScreenDuration(currentScreenData, this.timerService.screenRotationMs) 
        };
    }

    /**
     * Entra en modo idle (Lógica visual)
     * @private
     */
    _enterIdleMode() {
        this.currentCycleIndex = 0;
        console.log('💤 Entering idle mode - showing stats');
        EventManager.emit('idle:start');

        this._applyIdleVisuals(true);
        this._updateIdleDisplay();
    }

    /**
     * Sale del modo idle (Lógica visual)
     * @private
     */
    _exitIdleMode() {
        console.log('🔔 Exiting idle mode');
        EventManager.emit('idle:stop');
        this._applyIdleVisuals(false);
    }

    /**
     * Aplica o retira los cambios visuales del modo idle
     * @private
     */
    _applyIdleVisuals(isEntering) {
        const container = document.querySelector('.container');
        if (!container) return;

        if (isEntering) {
            container.classList.add('idle-mode');
            container.classList.remove('hidden');
            
            // Limpiar temas visuales especiales (Centralizado)
            UIUtils.clearVisualThemes(container, DEFAULTS.THEMES_CLASSES);

            if (this.uiManager) this.uiManager.clearAllTimers();
            if (this.idleContainer) {
                this.idleContainer.style.display = 'flex';
                this.idleContainer.style.opacity = '1';
            }
        } else {
            container.classList.remove('idle-mode');
            if (this.idleContainer) this.idleContainer.style.display = 'none';
        }
    }

    /**
     * Oculta o muestra elementos del widget original
     * @private
     */
    // _toggleElements ha sido eliminado en favor de estilos CSS basados en .idle-mode


    _createIdleContainer() {
        if (document.getElementById('idle-stats-display')) {
            this.idleContainer = document.getElementById('idle-stats-display');
            return;
        }

        const container = document.createElement('div');
        container.id = 'idle-stats-display';
        container.className = 'idle-stats-display';
        container.style.display = 'none';
        container.style.zIndex = '100';

        const messageDiv = document.getElementById('message');
        if (messageDiv && messageDiv.parentNode) {
            messageDiv.parentNode.insertBefore(container, messageDiv.nextSibling);
        }
        this.idleContainer = container;
    }

    _updateIdleDisplay() {
        if (!this.idleContainer || !this.statsService) return;

        const screenData = this.orchestrator.getData(this.currentCycleIndex);
        if (!screenData) return;

        const usernameEl = document.getElementById('username');
        if (usernameEl && screenData.title) {
            usernameEl.textContent = screenData.title;
            usernameEl.setAttribute('data-text', screenData.title);
        }

        this.renderer.render(screenData, this.idleContainer);
        
        // Animación de entrada
        this.idleContainer.classList.remove('idle-screen-enter');
        void this.idleContainer.offsetWidth; 
        this.idleContainer.classList.add('idle-screen-enter');
    }

    _hideAfterCycles() {
        const container = document.querySelector('.container');
        if (container) {
            container.classList.add('exit-left');
            setTimeout(() => {
                if (this.timerService.isHiddenAfterCycles) {
                    container.classList.add('hidden');
                    container.classList.remove('exit-left', 'idle-mode');
                    if (this.idleContainer) this.idleContainer.style.display = 'none';
                }
            }, 2100);
        }
    }

    _showWidgetAfterHidden() {
        const container = document.querySelector('.container');
        if (container) {
            container.classList.remove('hidden', 'exit-left');
        }
    }

    start() {
        this.timerService.resetIdleTimer();
    }

    stop() {
        this.timerService.clearTimers();
        this._exitIdleMode();
    }

    destroy() {
        this.stop();

        // Desuscripción de eventos para evitar fugas de memoria
        if (this._handlers) {
            EventManager.off(EVENTS.USER.ACTIVITY, this._handlers.activity);
            EventManager.off(EVENTS.UI.MESSAGE_HIDDEN, this._handlers.messageHidden);
        }

        if (this.idleContainer && this.idleContainer.parentNode) {
            this.idleContainer.parentNode.removeChild(this.idleContainer);
        }
    }
}
