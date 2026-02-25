import UIUtils from '../utils/UIUtils.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import Logger from '../utils/Logger.js';

// Nuevos componentes especializados
import DisplayController from './ui/DisplayController.js';
import StatusBarComponent from './ui/StatusBarComponent.js';
import NotificationManager from './NotificationManager.js';
import IdentityComponent from './ui/IdentityComponent.js';
import MessageComponent from './ui/MessageComponent.js';
import MessageQueueManager from './ui/MessageQueueManager.js';

/**
 * UIManager - Gestor Principal de la Interfaz de Usuario
 * Pattern: Orchestrator (Refactored)
 */
export default class UIManager {
    constructor(config, rankingSystem, experienceService, thirdPartyEmoteService, xpDisplay = null) {
        this.config = config;
        this.rankingSystem = rankingSystem;
        this.experienceService = experienceService;
        this.xpDisplay = xpDisplay;
        this.thirdPartyEmoteService = thirdPartyEmoteService;

        // 1. Referencias DOM base
        const dom = this.initDOMReferences();

        // 2. Inicializar Componentes Especializados
        this.display = new DisplayController(dom.container, config);
        this.status = new StatusBarComponent({
            streamCategory: dom.streamCategory,
            systemStatus: dom.systemStatus,
            liveBadge: dom.liveBadge,
            ledRx: dom.ledRx,
            ledTx: dom.ledTx
        });
        this.identity = new IdentityComponent({
            container: dom.container,
            username: dom.username,
            userBadge: dom.userBadge,
            userIcon: dom.userIcon
        }, config);
        this.message = new MessageComponent(dom.message, thirdPartyEmoteService, config);
        this.queue = new MessageQueueManager(config);
        this.isIdle = false;

        // 3. Estado local
        this.isProcessingQueue = false;
        this.lastMessageTime = 0;
        this.timers = {
            decrypt: null,
            transition: null,
            goldMode: null,
            nextQueue: null
        };

        // 4. Referencias a manejadores de eventos (para limpieza)
        this._handlers = {};

        this._setupEventListeners();
    }

    initDOMReferences() {
        return {
            container: document.querySelector('.container'),
            username: document.getElementById('username'),
            message: document.getElementById('message'),
            userBadge: document.getElementById('user-badge'),
            // Nuevo ID: user-icon, con fallback a admin-icon para compatibilidad
            userIcon: document.getElementById('user-icon') || document.getElementById('admin-icon'),
            streamCategory: document.getElementById('stream-category'),
            systemStatus: document.getElementById('system-status-text'),
            liveBadge: document.querySelector('.live-badge'),
            ledRx: document.getElementById('led-rx'),
            ledTx: document.getElementById('led-tx')
        };
    }

    _setupEventListeners() {
        // Almacenar referencias para permitir su eliminación posterior en destroy()
        this._handlers.statusChanged = (isOnline) => this.status.updateSystemStatus(isOnline);
        this._handlers.categoryUpdated = (cat) => this.status.updateCategory(cat);
        this._handlers.messageReceived = () => this.status.flashLED('ledRx');
        this._handlers.dataSaved = () => this.status.flashLED('ledTx');
        
        this._handlers.systemMessage = (data) => {
            const text = typeof data === 'string' ? data : data.text;
            // Corregido: 'SYSTEM' como ID, 'SYSTEM' como nombre, y el texto como CUERPO del mensaje
            this.displayMessage('SYSTEM', 'SYSTEM', text, {}, { isSubscriber: false });
        };

        this._handlers.messageHidden = () => {
            if (this.isIdle) return;
            if (!this.queue.isEmpty()) {
                if (this.timers.nextQueue) clearTimeout(this.timers.nextQueue);
                this.timers.nextQueue = setTimeout(() => this._processQueue(), 200);
            } else {
                this.isProcessingQueue = false;
            }
        };

        this._handlers.idleStart = () => { this.isIdle = true; this.reset(); };
        this._handlers.idleStop = () => { 
            this.isIdle = false; 
            // Procesar cualquier mensaje que haya llegado durante el fin del modo idle
            this._processQueue();
        };

        // Suscribirse a los eventos usando las referencias guardadas
        EventManager.on(EVENTS.STREAM.STATUS_CHANGED, this._handlers.statusChanged);
        EventManager.on(EVENTS.STREAM.CATEGORY_UPDATED, this._handlers.categoryUpdated);
        EventManager.on(EVENTS.CHAT.MESSAGE_RECEIVED, this._handlers.messageReceived);
        EventManager.on(EVENTS.STORAGE.DATA_SAVED, this._handlers.dataSaved);
        EventManager.on(EVENTS.UI.SYSTEM_MESSAGE, this._handlers.systemMessage);
        EventManager.on(EVENTS.UI.MESSAGE_HIDDEN, this._handlers.messageHidden);
        EventManager.on('idle:start', this._handlers.idleStart);
        EventManager.on('idle:stop', this._handlers.idleStop);
    }

    /**
     * Punto de entrada principal para mostrar mensajes (Añade a cola)
     */
    displayMessage(userId, username, message, emotes, subscriberInfo = {}, xpResult = null) {
        if (this.config.DEBUG) {
            console.log(`[UIManager] 📩 Incoming display: ${username} (ID: ${userId}) -> "${message}"`);
        }

        try {
            // 1. Añadir a la cola primero para que esté disponible si el despertar dispara el procesado
            this.queue.add({ userId, username, message, emotes, subscriberInfo, xpResult });

            // 2. Despertar al manager de inactividad y resetear timers
            EventManager.emit(EVENTS.USER.ACTIVITY, { userId, username });

            // 3. Si no estamos procesando o si el widget ya es visible (y queremos swap rápido)
            if (!this.isProcessingQueue || this.display.isVisibleState()) {
                this._processQueue();
            }

        } catch (error) {
            Logger.error('UI', 'Error adding message to queue', error);
        }
    }

    /**
     * Extrae y renderiza el siguiente mensaje de la cola
     * @private
     */
    _processQueue() {
        if (this.isIdle) return;
        if (this.queue.isEmpty()) return;

        // Si ya estamos procesando un mensaje, pero este es un swap, cancelar timers previos
        if (this.isProcessingQueue && this.display.isVisibleState()) {
            this.clearAllTimers();
        }

        this.isProcessingQueue = true;
        const msgObj = this.queue.getNext();
        if (!msgObj) return;

        const { userId, username, message, emotes, subscriberInfo, xpResult } = msgObj;

        // Resetear visualización de XP antes de mostrar el nuevo usuario
        if (this.xpDisplay) {
            this.xpDisplay.reset();
        }

        try {
            const now = Date.now();
            const isVisible = this.display.isVisibleState();
            
            // Si el widget ya estaba visible, usamos transición rápida. Si no, secuencia completa.
            const shouldShowFullAnim = !isVisible && (now - this.lastMessageTime) > this.config.ANIMATION_COOLDOWN_MS && username.toLowerCase() === 'liiukiin';
            
            this.lastMessageTime = now;
            this.display.show();

            const displayTime = this.queue.calculateDisplayTime(msgObj);

            if (shouldShowFullAnim) {
                this._fullIncomingSequence(userId, username, message, emotes, subscriberInfo, xpResult, displayTime);
            } else {
                this._fastTransition(userId, username, message, emotes, subscriberInfo, xpResult, displayTime);
            }

        } catch (error) {
            Logger.error('UI', 'Error processing queue message', error);
            this.isProcessingQueue = false;
        }
    }

    _fastTransition(userId, username, message, emotes, subscriberInfo, xpResult, displayTime) {
        this.identity.fade(0);
        this.message.fade(0);

        this.timers.transition = setTimeout(() => {
            this._revealMessage(userId, username, message, emotes, subscriberInfo, xpResult, displayTime);
            requestAnimationFrame(() => {
                this.identity.fade(1);
                this.message.fade(1);
            });
        }, 200);
    }

    _fullIncomingSequence(userId, username, message, emotes, subscriberInfo, xpResult, displayTime) {
        this.identity.showIncomingState();
        
        this.message.setDecrypting(true);
        this.message.setRawHTML("> INCOMING TRANSMISSION...");

        this.timers.decrypt = setTimeout(() => {
            this.identity.clearIncomingState();
            this.message.setDecrypting(false);
            this._revealMessage(userId, username, message, emotes, subscriberInfo, xpResult, displayTime);
        }, 800);
    }

    _revealMessage(userId, username, message, emotes, subscriberInfo, xpResult, displayTime) {
        // Obtener datos de XP actuales
        const xpData = xpResult || (this.experienceService ? this.experienceService.getUserData(userId, username) : null);
        const userRole = this.rankingSystem.getUserRole(userId, username, xpData);

        // Actualizar UI de XP
        if (this.xpDisplay) {
            this.xpDisplay.updateXPDisplay(userId, username, xpResult);
        }

        // Delegar actualizaciones a los componentes
        this.identity.update(username, userRole, subscriberInfo);
        this.message.update(username, message, emotes, userRole);
        
        this._handleGoldMode(subscriberInfo);

        // Programar desaparición
        this.display.scheduleHide(displayTime);
    }

    _handleGoldMode(subInfo) {
        if (!subInfo.isSubscriber) return;

        this.timers.goldMode = setTimeout(() => {
            // Activar visuales en identidad y XP
            this.identity.setGoldMode(true);
            
            if (this.xpDisplay) {
                this.xpDisplay.handleGoldMode(subInfo);
            }
        }, 4000);
    }

    clearAllTimers() {
        this.display.clearTimers();
        Object.values(this.timers).forEach(t => { if(t) clearTimeout(t); });
    }

    reset() {
        this.clearAllTimers();
        this.identity.reset();
        this.message.setRawHTML('');
        this.isProcessingQueue = false;
        if (this.xpDisplay) this.xpDisplay.reset();
    }

    /**
     * Extiende el tiempo de visualización del widget
     * Útil para notificaciones externas que necesitan que el widget no se oculte
     * @param {number} ms - Milisegundos a extender
     */
    extendDisplayTime(ms) {
        if (this.display) {
            this.display.extendDisplayTime(ms);
        }
    }

    /**
     * Limpia y destruye el UIManager (previene memory leaks)
     */
    destroy() {
        console.log('[UIManager] Destruyendo instancia y limpiando eventos...');
        this.clearAllTimers();

        // 1. Eliminar Event Listeners globales
        if (this._handlers) {
            EventManager.off(EVENTS.STREAM.STATUS_CHANGED, this._handlers.statusChanged);
            EventManager.off(EVENTS.STREAM.CATEGORY_UPDATED, this._handlers.categoryUpdated);
            EventManager.off(EVENTS.CHAT.MESSAGE_RECEIVED, this._handlers.messageReceived);
            EventManager.off(EVENTS.STORAGE.DATA_SAVED, this._handlers.dataSaved);
            EventManager.off(EVENTS.UI.SYSTEM_MESSAGE, this._handlers.systemMessage);
            EventManager.off(EVENTS.UI.MESSAGE_HIDDEN, this._handlers.messageHidden);
            EventManager.off('idle:start', this._handlers.idleStart);
            EventManager.off('idle:stop', this._handlers.idleStop);
        }

        // 2. Limpiar Subcomponentes si implementan destroy()
        if (this.display && typeof this.display.destroy === 'function') this.display.destroy();
        if (this.status && typeof this.status.destroy === 'function') this.status.destroy();
        if (this.identity && typeof this.identity.destroy === 'function') this.identity.destroy();
        if (this.message && typeof this.message.destroy === 'function') this.message.destroy();
        if (this.queue && typeof this.queue.destroy === 'function') this.queue.destroy();
    }
}

