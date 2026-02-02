import EventManager from '../utils/EventEmitter.js';

/**
 * NotificationManager - Gestor de Notificaciones
 * 
 * Responsabilidades:
 * - Gestionar cola de notificaciones (logros, level-ups, etc.)
 * - Controlar animaciones y tiempos de display
 * - Generar HTML de notificaciones
 * - Reproducir sonidos asociados
 * 
 * Extraído de MessageProcessor para Single Responsibility Principle
 * 
 * @class NotificationManager
 */
export default class NotificationManager {
    /**
     * Constructor del NotificationManager
     * @param {Object} config - Configuración global
     * @param {UIManager} uiManager - Referencia al UIManager para extender tiempos
     */
    constructor(config, uiManager = null) {
        this.config = config;
        this.uiManager = uiManager;

        // Cola de notificaciones
        this.queue = [];
        this.isShowingNotification = false;

        // Configuración de tiempos
        this.NOTIFICATION_DISPLAY_TIME = 9000; // 9 segundos
        this.NOTIFICATION_FADE_TIME = 500;     // 0.5 segundos
        this.QUEUE_MAX_SIZE = 5;               // Máximo 5 en cola

        // Mapeo de rareza a iconos
        this.rarityIconMap = {
            'common': 'tier1.png',
            'uncommon': 'tier2.png',
            'rare': 'tier3.png',
            'epic': 'tier4.png',
            'legendary': 'tier5.png'
        };

        console.log('📢 NotificationManager initialized');
        this._setupEventListeners();
    }

    /**
     * Configura los listeners de eventos centralizados
     * @private
     */
    _setupEventListeners() {
        // Escuchar logros desbloqueados
        EventManager.on('user:achievementUnlocked', (eventData) => {
            this.showAchievement(eventData);
        });

        // Escuchar progreso de "Bro"
        EventManager.on('user:broProgress', ({ current, max }) => {
            this.showBroProgress(current, max);
        });

        // Escuchar level ups para mostrarlos también como notificación (opcional, pero mejora UX)
        EventManager.on('user:levelUp', (eventData) => {
            // Podríamos añadir una notificación especial para level ups aquí si quisiéramos
            // Por ahora, el XPDisplayManager ya lo maneja de forma visual directa.
        });
    }

    /**
     * Configura la referencia al UIManager
     * (Útil si no se tiene al momento de construcción)
     * @param {UIManager} uiManager 
     */
    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Añade una notificación de logro a la cola
     * @param {Object} eventData - { username, achievement }
     */
    showAchievement(eventData) {
        if (this.queue.length >= this.QUEUE_MAX_SIZE) {
            if (this.config.DEBUG) {
                console.log(`🏆 Cola llena, logro descartado: ${eventData.achievement.name}`);
            }
            return;
        }

        this.queue.push({
            type: 'achievement',
            data: eventData
        });

        this._processQueue();
    }

    /**
     * Procesa la cola de notificaciones una a una
     * @private
     */
    _processQueue() {
        if (this.isShowingNotification || this.queue.length === 0) {
            return;
        }

        this.isShowingNotification = true;
        const notification = this.queue.shift();

        // Dispatch según tipo
        switch (notification.type) {
            case 'achievement':
                this._displayAchievement(notification.data);
                break;
            default:
                console.warn('Unknown notification type:', notification.type);
                this.isShowingNotification = false;
                this._processQueue();
                return;
        }

        // Programar siguiente notificación
        const totalTime = this.NOTIFICATION_DISPLAY_TIME + this.NOTIFICATION_FADE_TIME;
        setTimeout(() => {
            this.isShowingNotification = false;
            this._processQueue();
        }, totalTime);
    }


    /**
     * Muestra una barra de progreso para el contador de "Bro"
     * @param {number} current - Contador actual
     * @param {number} max - Meta del siguiente logro
     */
    showBroProgress(current, max) {
        const container = document.getElementById('achievement-notifications');
        if (!container) return;

        // Crear elemento
        const notification = document.createElement('div');
        notification.className = 'bro-notification';

        // Calcular porcentaje
        const percent = Math.min(100, Math.max(0, (current / max) * 100));

        notification.innerHTML = `
            <div class="bro-header">
                <div class="bro-title">
                    <span>👊 BRO COUNT</span>
                </div>
                <div class="bro-count">${current} / ${max}</div>
            </div>
            <div class="bro-progress-container">
                <div class="bro-progress-fill" style="width: 0%"></div>
            </div>
        `;

        container.appendChild(notification);

        // Animar barra
        requestAnimationFrame(() => {
            const fill = notification.querySelector('.bro-progress-fill');
            if (fill) fill.style.width = `${percent}%`;
        });

        // Extender tiempo widget
        if (this.uiManager) {
            this.uiManager.extendDisplayTime(4000);
        }

        // Remover después de 3-4 segundos
        setTimeout(() => {
            notification.classList.add('hiding');
            setTimeout(() => {
                if (notification.parentNode) notification.parentNode.removeChild(notification);
            }, 500);
        }, 3500);
    }

    /**
     * Muestra físicamente la notificación de logro
     * @private
     * @param {Object} eventData - { username, achievement }
     */
    _displayAchievement(eventData) {
        const { username, achievement } = eventData;
        const container = document.getElementById('achievement-notifications');

        if (!container) {
            console.warn('Achievement notifications container not found');
            return;
        }

        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.setAttribute('data-rarity', achievement.rarity);

        // Usamos la imagen del logro (que ya viene con default.png si no tiene específica)
        const imagePath = achievement.image || 'img/logros/default.png';

        notification.innerHTML = `
            <div class="achievement-icon">
                <img src="${imagePath}" alt="Achievement Icon" onerror="this.onerror=null;this.src='img/logros/default.png';">
            </div>
            <div class="achievement-content">
                <div class="achievement-label">LOGRO DESBLOQUEADO</div>
                <div class="achievement-name"><span>${achievement.name}</span></div>
                <div class="achievement-desc"><span>${achievement.description} <span style="color: var(--cyber-cyan); opacity: 0.9;">[${achievement.condition}]</span></span></div>
            </div>
            <div class="achievement-timer"></div>
        `;

        // Añadir al container
        container.appendChild(notification);

        // Check for text overflow to enable marquee
        this._checkOverflow(notification);

        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Extender tiempo del widget para que se vea el logro
        if (this.uiManager) {
            this.uiManager.extendDisplayTime(this.NOTIFICATION_DISPLAY_TIME + 1000);
        }

        // Remover después del tiempo de display
        setTimeout(() => {
            notification.classList.remove('show');
            notification.classList.add('hiding');

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, this.NOTIFICATION_FADE_TIME);
        }, this.NOTIFICATION_DISPLAY_TIME);

        // Reproducir sonido con delay
        this._playAchievementSound();

        // Log para debug
        if (this.config.DEBUG) {
            console.log(`🏆 Achievement notification shown: ${username} -> ${achievement.name}`);
        }
    }

    /**
     * Verifica overflow de texto para activar marquee
     * @private
     * @param {HTMLElement} notification 
     */
    _checkOverflow(notification) {
        try {
            const nameSpan = notification.querySelector('.achievement-name span');
            const nameContainer = notification.querySelector('.achievement-name');
            if (nameSpan && nameContainer && nameSpan.scrollWidth > nameContainer.clientWidth) {
                nameSpan.classList.add('marquee-active');
            }

            const descSpan = notification.querySelector('.achievement-desc > span');
            const descContainer = notification.querySelector('.achievement-desc');
            if (descSpan && descContainer && descSpan.scrollWidth > descContainer.clientWidth) {
                descSpan.classList.add('marquee-active');
            }
        } catch (e) {
            console.warn('Error checking overflow:', e);
        }
    }

    /**
     * Reproduce el sonido de logro
     * @private
     */
    /**
     * Reproduce el sonido de logro
     * @private
     */
    _playAchievementSound() {
        // Delegado a AudioManager vía evento user:achievementUnlocked
    }

    /**
     * Limpia la cola de notificaciones
     */
    clearQueue() {
        this.queue = [];
        if (this.config.DEBUG) {
            console.log('📢 Notification queue cleared');
        }
    }

    /**
     * Obtiene el tamaño actual de la cola
     * @returns {number}
     */
    getQueueSize() {
        return this.queue.length;
    }
}
