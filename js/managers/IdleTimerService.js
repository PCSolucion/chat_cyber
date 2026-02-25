import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

/**
 * IdleTimerService - Gestiona los ciclos temporales y estados del modo Idle.
 * 
 * Responsabilidades:
 * - Controlar el tiempo de espera por inactividad.
 * - Gestionar la rotación de pantallas.
 * - Controlar el límite de ciclos antes de ocultar el widget.
 */
export default class IdleTimerService {
    constructor(config) {
        this.config = config;
        
        // Parámetros de configuración
        this.idleTimeoutMs = Number(config.IDLE_TIMEOUT_MS) || 30000;
        this.screenRotationMs = Number(config.IDLE_ROTATION_MS) || 12000;
        this.maxCycles = 1;

        // Estado del cronómetro
        this.isIdle = false;
        this.idleTimeout = null;
        this.rotationInterval = null;
        this.screensShown = 0;
        this.isHiddenAfterCycles = false;

        // Callbacks para notificar al Manager
        this.callbacks = {
            onEnterIdle: null,
            onExitIdle: null,
            onRotate: null,
            onHide: null,
            onShow: null
        };
    }

    /**
     * Configura los callbacks de acción
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Inicia o reinicia el timer de inactividad
     */
    resetIdleTimer() {
        this.clearTimers();
        
        this.idleTimeout = setTimeout(() => {
            this.enterIdle();
        }, this.idleTimeoutMs);
    }

    /**
     * Entra formalmente en modo idle
     */
    enterIdle() {
        if (this.isIdle) return;
        
        this.isIdle = true;
        this.screensShown = 0;
        this.isHiddenAfterCycles = false;

        if (this.callbacks.onEnterIdle) this.callbacks.onEnterIdle();
        
        this.startRotation();
    }

    /**
     * Sale del modo idle
     */
    exitIdle() {
        if (!this.isIdle && !this.isHiddenAfterCycles) return;

        const wasHidden = this.isHiddenAfterCycles;
        this.isIdle = false;
        this.isHiddenAfterCycles = false;
        this.screensShown = 0;

        this.clearTimers();

        if (wasHidden && this.callbacks.onShow) {
            this.callbacks.onShow();
        }

        if (this.callbacks.onExitIdle) {
            this.callbacks.onExitIdle();
        }
        
        this.resetIdleTimer();
    }

    /**
     * Inicia la rotación de contenidos
     */
    startRotation() {
        this.clearRotation();
        this._scheduleNextRotation();
    }

    /**
     * Planifica la siguiente rotación
     * @private
     */
    _scheduleNextRotation() {
        if (!this.isIdle) return;

        // El delay puede ser dinámico si el manager lo proporciona mediante el callback onRotate
        let delay = this.screenRotationMs;
        
        if (this.callbacks.onRotate) {
            const rotationInfo = this.callbacks.onRotate(this.screensShown);
            
            // Si el manager decide que ya es suficiente (basado en ciclos de datos reales)
            if (rotationInfo && rotationInfo.shouldHide) {
                this.hide();
                return;
            }

            if (rotationInfo && rotationInfo.delay) {
                delay = rotationInfo.delay;
            }
        }

        this.rotationInterval = setTimeout(() => {
            if (!this.isIdle) return;
            this.screensShown++;
            this._scheduleNextRotation();
        }, delay);
    }

    /**
     * Oculta el sistema por exceso de ciclos
     */
    hide() {
        this.isIdle = false;
        this.isHiddenAfterCycles = true;
        this.clearRotation();
        
        if (this.callbacks.onHide) this.callbacks.onHide();
    }

    /**
     * Limpia todos los timers activos
     */
    clearTimers() {
        if (this.idleTimeout) clearTimeout(this.idleTimeout);
        this.clearRotation();
    }

    clearRotation() {
        if (this.rotationInterval) clearTimeout(this.rotationInterval);
    }
}
