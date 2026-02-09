import { EVENTS } from '../../utils/EventTypes.js';
import EventManager from '../../utils/EventEmitter.js';

/**
 * StatusBarComponent - Gestiona la barra de estado superior (LEDs, Categoría, Sistema)
 */
export default class StatusBarComponent {
    constructor(elements) {
        this.dom = elements; // { streamCategory, systemStatus, liveBadge, ledRx, ledTx }
    }

    updateCategory(cat) {
        if (!this.dom.streamCategory) return;
        this.dom.streamCategory.style.opacity = '0';
        setTimeout(() => {
            this.dom.streamCategory.textContent = cat.toUpperCase();
            this.dom.streamCategory.style.opacity = '1';
        }, 300);
    }

    updateSystemStatus(isOnline) {
        if (!this.dom.systemStatus) return;
        const text = isOnline ? 'SYS.ONLINE' : 'SYS.OFFLINE';
        if (this.dom.systemStatus.textContent === text) return;

        this.dom.systemStatus.style.opacity = '0';
        setTimeout(() => {
            this.dom.systemStatus.textContent = text;
            this.dom.systemStatus.style.opacity = '1';
            this.dom.systemStatus.style.color = isOnline ? '' : '#555';
            if (this.dom.liveBadge) this.dom.liveBadge.style.display = isOnline ? 'block' : 'none';
        }, 300);
    }

    flashLED(ledKey) {
        const led = this.dom[ledKey];
        if (!led) return;
        
        // Duración diferenciada: TX (datos) dura un poco más que RX (mensajes)
        const duration = ledKey === 'ledTx' ? 400 : 150;

        led.classList.remove('active');
        void led.offsetWidth; // Trigger reflow
        led.classList.add('active');
        
        setTimeout(() => led.classList.remove('active'), duration);
    }
}
