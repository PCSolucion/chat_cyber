import { EVENTS } from '../../utils/EventTypes.js';
import EventManager from '../../utils/EventEmitter.js';

/**
 * DisplayController - Gestiona la visibilidad y los timers del widget
 */
export default class DisplayController {
    constructor(container, config) {
        this.container = container;
        this.config = config;
        this.timers = {
            hide: null
        };
        this.isVisible = false;
    }

    show() {
        this.isVisible = true;
        this.container.classList.remove('hidden');
    }

    hide() {
        if (window.KEEP_WIDGET_VISIBLE === true) return;
        this.isVisible = false;
        this.container.classList.add('hidden');
        EventManager.emit(EVENTS.UI.MESSAGE_HIDDEN);
    }

    scheduleHide(ms) {
        this.clearTimers();
        this.timers.hide = setTimeout(() => this.hide(), ms);
    }

    extendDisplayTime(ms) {
        if (!this.isVisible) this.show();
        this.scheduleHide(ms);
    }

    clearTimers() {
        if (this.timers.hide) {
            clearTimeout(this.timers.hide);
            this.timers.hide = null;
        }
    }

    isVisibleState() {
        return this.isVisible;
    }
}
