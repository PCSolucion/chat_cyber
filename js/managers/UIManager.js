import UIUtils from '../utils/UIUtils.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import Logger from '../utils/Logger.js';

// Nuevos componentes especializados
import DisplayController from './ui/DisplayController.js';
import StatusBarComponent from './ui/StatusBarComponent.js';
import IdentityComponent from './ui/IdentityComponent.js';
import MessageComponent from './ui/MessageComponent.js';

/**
 * UIManager - Gestor Principal de la Interfaz de Usuario
 * Pattern: Orchestrator (Refactored)
 */
export default class UIManager {
    constructor(config, rankingSystem, experienceService, thirdPartyEmoteService) {
        this.config = config;
        this.rankingSystem = rankingSystem;
        this.experienceService = experienceService;
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
            adminIcon: dom.adminIcon
        }, config);
        this.message = new MessageComponent(dom.message, thirdPartyEmoteService, config);

        // 3. Estado local
        this.lastMessageTime = 0;
        this.timers = {
            decrypt: null,
            transition: null,
            goldMode: null
        };

        this._setupEventListeners();
    }

    initDOMReferences() {
        return {
            container: document.querySelector('.container'),
            username: document.getElementById('username'),
            message: document.getElementById('message'),
            userBadge: document.getElementById('user-badge'),
            adminIcon: document.getElementById('admin-icon'),
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
            this.displayMessage('SYSTEM', text, {}, { isSubscriber: false });
        });
    }

    /**
     * Punto de entrada principal para mostrar mensajes
     */
    displayMessage(username, message, emotes, subscriberInfo = {}) {
        try {
            const now = Date.now();
            const timeSinceLast = now - this.lastMessageTime;
            const isVisible = this.display.isVisibleState();
            
            const shouldShowFullAnim = !isVisible && timeSinceLast > this.config.ANIMATION_COOLDOWN_MS;
            
            this.clearAllTimers();
            this.lastMessageTime = now;
            this.display.show();

            if (shouldShowFullAnim) {
                this._fullIncomingSequence(username, message, emotes, subscriberInfo);
            } else {
                this._fastTransition(username, message, emotes, subscriberInfo);
            }

        } catch (error) {
            Logger.error('UI', 'Error displaying message', error);
        }
    }

    _fastTransition(username, message, emotes, subscriberInfo) {
        this.identity.dom.username.style.opacity = '0';
        this.message.fade(0);

        this.timers.transition = setTimeout(() => {
            this._revealMessage(username, message, emotes, subscriberInfo);
            requestAnimationFrame(() => {
                this.identity.dom.username.style.opacity = '1';
                this.message.fade(1);
            });
        }, 200);
    }

    _fullIncomingSequence(username, message, emotes, subscriberInfo) {
        this.identity.reset();
        this.message.reset();
        
        this.identity.dom.username.textContent = "SIGNAL DETECTED";
        this.identity.dom.username.classList.add('decrypting');
        this.message.setRawHTML("> INCOMING TRANSMISSION...");
        this.message.setDecrypting(true);

        this.timers.decrypt = setTimeout(() => {
            this.identity.dom.username.classList.remove('decrypting');
            this.message.setDecrypting(false);
            this._revealMessage(username, message, emotes, subscriberInfo);
        }, 800);
    }

    _revealMessage(username, message, emotes, subscriberInfo) {
        const userRole = this.rankingSystem.getUserRole(username);
        const xpInfo = this.experienceService?.getUserXPInfo(username);
        
        if (xpInfo && username !== 'SYSTEM') {
            userRole.rankTitle = { title: xpInfo.title, icon: 'icon-tech' };
        }

        // Delegar actualizaciones a los componentes
        this.identity.update(username, userRole, subscriberInfo);
        this.message.update(message, emotes, userRole);
        this._handleGoldMode(subscriberInfo);

        // Programar desaparición (Delegado al display controller)
        let displayTime = this.config.MESSAGE_DISPLAY_TIME + (userRole.role !== 'user' ? 2000 : 0);
        this.display.scheduleHide(displayTime);
    }

    _handleGoldMode(subInfo) {
        if (!subInfo.isSubscriber) return;

        this.timers.goldMode = setTimeout(() => {
            this.identity.dom.container.classList.add('gold-mode-active');
            if (this.identity.dom.adminIcon) this.identity.dom.adminIcon.style.display = 'none';

            const xpTitleEl = document.getElementById('xp-title');
            if (xpTitleEl) {
                const subValue = subInfo.badgeInfo?.subscriber || '1';
                UIUtils.scrambleText(xpTitleEl, 'EXCELSIOR USER', 30, false);
                setTimeout(() => {
                    UIUtils.scrambleText(xpTitleEl, `SUB ${subValue} MESES`, 30, false);
                }, 2000);
            }
        }, 4000);
    }

    clearAllTimers() {
        this.display.clearTimers();
        Object.values(this.timers).forEach(t => { if(t) clearTimeout(t); });
    }
}

