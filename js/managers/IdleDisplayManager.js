import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import { IDLE, DEFAULTS } from '../constants/AppConstants.js';
import IdleScreenRenderer from './IdleScreenRenderer.js';
import IdleDataOrchestrator from './IdleDataOrchestrator.js';
import IdleTimerService from './IdleTimerService.js';
import F1DriverCardOverlay from './ui/F1DriverCardOverlay.js';
import UIUtils from '../utils/UIUtils.js';
import Logger from '../utils/Logger.js';

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
        
        // F1 Driver Card Overlay
        console.log('[IdleManager] 🏎️ Initializing F1DriverCardOverlay...');
        this.f1DriverCard = new F1DriverCardOverlay(sessionStatsService);
        
        // F1 Theme Detection (to mute standard idle but keep driver cards)
        this.isF1Theme = !!document.querySelector('link[href*="f1"]') || window.location.href.includes('f1');

        // Configuración de visualización
        this.totalScreensInCycle = Number(IDLE.TOTAL_SCREENS_IN_CYCLE) || 9;
        this.currentCycleIndex = 0;

        // Estado visual
        this.f1Started = false;
        this.lastF1ShowTime = 0;
        this.F1_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
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
        
        // F1 Theme: Skip standard screens and move directly to "hide" phase
        if (this.isF1Theme) {
            return { shouldHide: true };
        }

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
        Logger.info('IdleDisplayManager', '💤 Entering idle mode - showing stats');
        EventManager.emit('idle:start');

        this._applyIdleVisuals(true);
        this._updateIdleDisplay();
    }

    /**
     * Sale del modo idle (Lógica visual)
     * @private
     */
    _exitIdleMode() {
        Logger.info('IdleDisplayManager', '🔔 Exiting idle mode');
        EventManager.emit('idle:stop');
        this._applyIdleVisuals(false);

        // Clear pending delayed Driver Card triggers if we wake up mid-exit
        if (this.f1Timeout) {
            clearTimeout(this.f1Timeout);
            this.f1Timeout = null;
        }

        // Hide F1 Driver Card
        this.f1Started = false;
        if (this.f1DriverCard) {
            console.log('[IdleManager] 💤 Stopping rotation on f1DriverCard...');
            this.f1DriverCard.hide();
        }
    }

    /**
     * Aplica o retira los cambios visuales del modo idle
     * @private
     */
    _applyIdleVisuals(isEntering) {
        // Skip visual mutations if in F1 theme (user wants "no idle mode" vs cards)
        if (this.isF1Theme) return;

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
            container.classList.remove('idle-mode', 'exit-left', 'hidden');
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
        
        // Skip standard screens in F1 theme
        if (this.isF1Theme) return;

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
            
            if (this.f1Timeout) clearTimeout(this.f1Timeout);
            
            this.f1Timeout = setTimeout(() => {
                if (this.timerService.isHiddenAfterCycles) {
                    container.classList.add('hidden');
                    container.classList.remove('exit-left', 'idle-mode');
                    if (this.idleContainer) this.idleContainer.style.display = 'none';

                    // [F1 Theme] Now that the main widget is gone, show the Driver Card
                    // But only if we are past the 10-minute cooldown
                    if (this.isF1Theme && this.f1DriverCard && !this.f1Started) {
                        const now = Date.now();
                        if (now - this.lastF1ShowTime >= this.F1_COOLDOWN_MS) {
                            console.log('[IdleManager] 🏎️ Widget hidden. Triggering Driver Card...');
                            this.f1Started = true;
                            this.lastF1ShowTime = now;
                            this.f1DriverCard.startRotation();
                        } else {
                            const minutesLeft = Math.ceil((this.F1_COOLDOWN_MS - (now - this.lastF1ShowTime)) / 60000);
                            Logger.info('IdleManager', `🏎️ F1 Driver Card on cooldown (${minutesLeft} min left). Skipping.`);
                        }
                    }
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

        if (this.f1DriverCard) {
            this.f1DriverCard.destroy();
        }

        if (this.idleContainer && this.idleContainer.parentNode) {
            this.idleContainer.parentNode.removeChild(this.idleContainer);
        }
    }
}
