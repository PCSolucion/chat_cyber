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
        EventManager.on(EVENTS.STREAM.STATUS_CHANGED, (isOnline) => this.status.updateSystemStatus(isOnline));
        EventManager.on(EVENTS.STREAM.CATEGORY_UPDATED, (cat) => this.status.updateCategory(cat));
        EventManager.on(EVENTS.CHAT.MESSAGE_RECEIVED, () => this.status.flashLED('ledRx'));
        EventManager.on(EVENTS.STORAGE.DATA_SAVED, () => this.status.flashLED('ledTx'));
        
        EventManager.on(EVENTS.UI.SYSTEM_MESSAGE, (data) => {
            const text = typeof data === 'string' ? data : data.text;
            // Corregido: 'SYSTEM' como ID, 'SYSTEM' como nombre, y el texto como CUERPO del mensaje
            this.displayMessage('SYSTEM', 'SYSTEM', text, {}, { isSubscriber: false });
        });

        // Escuchar cuando un mensaje termina para procesar el siguiente en la cola
        EventManager.on(EVENTS.UI.MESSAGE_HIDDEN, () => {
            if (this.isIdle) return;
            if (!this.queue.isEmpty()) {
                if (this.timers.nextQueue) clearTimeout(this.timers.nextQueue);
                this.timers.nextQueue = setTimeout(() => this._processQueue(), 200);
            } else {
                this.isProcessingQueue = false;
            }
        });

        // Detectar entrada/salida de Idle
        EventManager.on('idle:start', () => { this.isIdle = true; this.reset(); });
        EventManager.on('idle:stop', () => { this.isIdle = false; });
    }

    /**
     * Punto de entrada principal para mostrar mensajes (Añade a cola)
     */
    displayMessage(userId, username, message, emotes, subscriberInfo = {}, xpResult = null) {
        if (this.config.DEBUG) {
            console.log(`[UIManager] 📩 Incoming display: ${username} (ID: ${userId}) -> "${message}"`);
        }

        if (this.isIdle) {
            // Si estamos en idle, despertar al manager (esto disparará activity y eventualmente saldrá de idle)
            EventManager.emit(EVENTS.USER.ACTIVITY, { userId, username });
        }

        try {
            // Añadir a la cola
            this.queue.add({ userId, username, message, emotes, subscriberInfo, xpResult });

            // Si no estamos procesando o si el widget ya es visible (y queremos swap rápido)
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
        if (this.queue.isEmpty()) {
            // Si la cola se vacía y el widget ya cumplió su ciclo, permitir ocultarse
            return;
        }

        // Si ya estamos procesando un mensaje, pero este es un swap (porque display es visible)
        // debemos cancelar timers previos para que no solapen
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

            // Calcular tiempo de visualización dinámico (Modo Turbo)
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
        this.identity.dom.username.style.opacity = '0';
        this.message.fade(0);

        this.timers.transition = setTimeout(() => {
            this._revealMessage(userId, username, message, emotes, subscriberInfo, xpResult, displayTime);
            requestAnimationFrame(() => {
                this.identity.dom.username.style.opacity = '1';
                this.message.fade(1);
            });
        }, 200);
    }

    _fullIncomingSequence(userId, username, message, emotes, subscriberInfo, xpResult, displayTime) {
        // Preparar estado de desencriptado sin vaciar completamente y causar saltos
        this.identity.dom.username.classList.add('decrypting');
        this.identity.dom.username.textContent = "SIGNAL DETECTED";
        
        this.message.setDecrypting(true);
        this.message.setRawHTML("> INCOMING TRANSMISSION...");

        this.timers.decrypt = setTimeout(() => {
            this.identity.dom.username.classList.remove('decrypting');
            this.message.setDecrypting(false);
            this._revealMessage(userId, username, message, emotes, subscriberInfo, xpResult, displayTime);
        }, 800);
    }

    _revealMessage(userId, username, message, emotes, subscriberInfo, xpResult, displayTime) {
        // Obtener datos de XP actuales (bien del resultado del mensaje o del servicio)
        const xpData = xpResult || (this.experienceService ? this.experienceService.getUserData(userId, username) : null);
        
        // Obtener Rol Unificado (Rank + Nivel + Admin)
        const levelCalculator = this.experienceService ? this.experienceService.levelCalculator : null;
        
        const userRole = this.rankingSystem.getUserRole(userId, username, xpData, levelCalculator);

        // Actualizar UI de XP de forma SÍNCRONA con el mensaje
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
            this.identity.dom.container.classList.add('gold-mode-active');

            const xpTitleEl = document.getElementById('xp-title');
            if (xpTitleEl) {
                const subValue = subInfo.badgeInfo?.subscriber || '1';
                UIUtils.scrambleText(xpTitleEl, 'EXCELSIOR USER', 30, false);
                this.timers.goldMode = setTimeout(() => {
                    UIUtils.scrambleText(xpTitleEl, `SUB ${subValue} MESES`, 30, false);
                }, 2000);
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
}

