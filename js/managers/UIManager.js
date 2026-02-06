import UIUtils from '../utils/UIUtils.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import Logger from '../utils/Logger.js';

/**
 * UIManager - Gestor Principal de la Interfaz de Usuario
 * Pattern: State-to-UI (Refactored)
 */
export default class UIManager {
    constructor(config, rankingSystem, experienceService, thirdPartyEmoteService) {
        this.config = config;
        this.rankingSystem = rankingSystem;
        this.experienceService = experienceService;
        this.thirdPartyEmoteService = thirdPartyEmoteService;

        // 1. Estado Visual Centralizado
        this.state = {
            isVisible: false,
            isOnline: false,
            streamCategory: 'CHAT.STREAM',
            currentMessage: {
                username: '',
                text: '',
                role: null,
                isSub: false
            }
        };

        // 2. Referencias DOM
        this.dom = this.initDOMReferences();

        // 3. Control de Timers
        this.timers = {
            hide: null,
            decrypt: null,
            transition: null,
            goldMode: null
        };

        // 4. Cooldowns
        this.lastMessageTime = 0;
        this.lastMessageByUser = new Map();
        this.userCooldownMs = 5000;

        this._setupEventListeners();
    }

    /**
     * Inicializa las referencias a elementos DOM
     */
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
        EventManager.on(EVENTS.STREAM.STATUS_CHANGED, (isOnline) => this.updateSystemStatus(isOnline));
        EventManager.on(EVENTS.STREAM.CATEGORY_UPDATED, (cat) => this.updateStreamCategory(cat));
        EventManager.on(EVENTS.CHAT.MESSAGE_RECEIVED, () => this.flashLED('ledRx'));
        EventManager.on(EVENTS.STORAGE.DATA_SAVED, () => this.flashLED('ledTx'));
        
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
            const isVisible = this.state.isVisible;
            
            // Decidir tipo de entrada
            const shouldShowFullAnim = !isVisible && timeSinceLast > this.config.ANIMATION_COOLDOWN_MS;
            
            this.clearAllTimers();
            this.lastMessageTime = now;

            // Actualizar estado básico
            this.state.isVisible = true;
            this.dom.container.classList.remove('hidden');

            if (shouldShowFullAnim) {
                this._fullIncomingSequence(username, message, emotes, subscriberInfo);
            } else {
                this._fastTransition(username, message, emotes, subscriberInfo);
            }

        } catch (error) {
            Logger.error('UI', 'Error displaying message', error);
        }
    }

    /**
     * Transición rápida entre mensajes
     * @private
     */
    _fastTransition(username, message, emotes, subscriberInfo) {
        this.dom.username.style.opacity = '0';
        this.dom.message.style.opacity = '0';

        this.timers.transition = setTimeout(() => {
            this._revealMessage(username, message, emotes, subscriberInfo);
            requestAnimationFrame(() => {
                this.dom.username.style.opacity = '1';
                this.dom.message.style.opacity = '1';
            });
        }, 200);
    }

    /**
     * Secuencia completa de "Signal Detected"
     * @private
     */
    _fullIncomingSequence(username, message, emotes, subscriberInfo) {
        this._resetVisualClasses();
        
        this.dom.username.textContent = "SIGNAL DETECTED";
        this.dom.username.classList.add('decrypting');
        this.dom.message.innerHTML = "> INCOMING TRANSMISSION...";
        this.dom.message.classList.add('decrypting');

        this.timers.decrypt = setTimeout(() => {
            this.dom.username.classList.remove('decrypting');
            this.dom.message.classList.remove('decrypting');
            this._revealMessage(username, message, emotes, subscriberInfo);
        }, 800);
    }

    /**
     * Renderiza el contenido final del mensaje
     * @private
     */
    _revealMessage(username, message, emotes, subscriberInfo) {
        // 1. Preparar datos de usuario y rol
        const userRole = this.rankingSystem.getUserRole(username);
        const xpInfo = this.experienceService?.getUserXPInfo(username);
        
        if (xpInfo && username !== 'SYSTEM') {
            userRole.rankTitle = { title: xpInfo.title, icon: 'icon-tech' };
        }

        // 2. Actualizar estado del mensaje actual
        this.state.currentMessage = { username, text: message, role: userRole, isSub: subscriberInfo.isSubscriber };

        // 3. Aplicar cambios al DOM de forma atómica
        this._updateUserIdentity(username, userRole, subscriberInfo);
        this._updateMessageContent(message, emotes, userRole);
        this._handleGoldMode(subscriberInfo);

        // 4. Programar desaparición
        let displayTime = this.config.MESSAGE_DISPLAY_TIME + (userRole.role !== 'user' ? 2000 : 0);
        this.scheduleHide(displayTime);
    }

    /**
     * Actualiza la identidad visual del usuario (Nombre, Iconos, Roles)
     * @private
     */
    _updateUserIdentity(username, userRole, subInfo) {
        const cleanName = UIUtils.cleanUsername(username);
        this.dom.username.textContent = cleanName;
        this.dom.username.setAttribute('data-text', cleanName);

        // Ajustar tamaño si es largo
        this.dom.username.className = 'driver-name';
        if (cleanName.length > 16) this.dom.username.classList.add('extra-small-text');
        else if (cleanName.length > 12) this.dom.username.classList.add('small-text');

        // Limpiar estilos previos del contenedor y aplicar nuevos
        this._resetRoleStyles();
        if (userRole.containerClass) {
            this.dom.container.classList.add(userRole.containerClass);
            if (['admin-user', 'top-user', 'vip-user'].includes(userRole.containerClass)) {
                this.dom.container.classList.add('status-red');
            }
        }

        // Badge de Racha/Rol
        if (userRole.badge) {
            this.dom.userBadge.classList.add(userRole.badgeClass || 'ranked');
            this.dom.userBadge.textContent = userRole.badge.replace(/bonus/gi, '').trim();
        } else {
            this.dom.userBadge.textContent = '';
        }

        // Icono de Rango/Especial (Arasaka, System, etc.)
        this._updateUserIcon(username, userRole, subInfo);
        
        // Temas personalizados de config.js
        const userThemes = this.config.UI?.USER_THEMES || {};
        const personalTheme = userThemes[username.toLowerCase()];
        if (personalTheme) this.dom.container.classList.add(personalTheme);
    }

    /**
     * Procesa y muestra el texto del mensaje
     * @private
     */
    _updateMessageContent(message, emotes, userRole) {
        const processed = UIUtils.processEmotes(message, emotes, this.thirdPartyEmoteService, this.config.EMOTE_SIZE);
        const { isEmoteOnly, emoteCount } = UIUtils.isEmoteOnlyMessage(processed);
        
        this.dom.message.className = 'quote';
        
        if (isEmoteOnly) {
            this.dom.message.classList.add('emote-only');
            if (emoteCount <= 2) this.dom.message.classList.add('emote-large');
            else if (emoteCount <= 4) this.dom.message.classList.add('emote-medium');
            this.dom.message.innerHTML = processed;
        } else {
            const isHighRank = ['admin', 'top'].includes(userRole.role);
            if (isHighRank && !UIUtils.hasImages(processed)) {
                UIUtils.scrambleText(this.dom.message, processed);
            } else {
                this.dom.message.innerHTML = `"${processed}"`;
            }
        }
    }

    /**
     * Lógica especial para suscriptores (Gold Mode)
     * @private
     */
    _handleGoldMode(subInfo) {
        if (!subInfo.isSubscriber) return;

        this.timers.goldMode = setTimeout(() => {
            this.dom.container.classList.add('gold-mode-active');
            if (this.dom.adminIcon) this.dom.adminIcon.style.display = 'none';

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

    /**
     * Selecciona y aplica el icono correcto al nombre
     * @private
     */
    _updateUserIcon(username, userRole, subInfo) {
        if (!this.dom.adminIcon) return;

        const uiConfig = this.config.UI || { RANK_ICONS: {}, SPECIAL_ICONS: {} };
        const isAdmin = username.toLowerCase() === (this.config.BROADCASTER_USERNAME || '').toLowerCase();
        
        let icon = null;
        if (isAdmin) icon = uiConfig.SPECIAL_ICONS?.ADMIN;
        else if (username === 'SYSTEM') icon = uiConfig.SPECIAL_ICONS?.SYSTEM;
        else {
            const title = (userRole.rankTitle?.title || '').toUpperCase();
            icon = uiConfig.RANK_ICONS?.[title];
        }

        if (icon) {
            this.dom.adminIcon.src = `img/${icon}`;
            this.dom.adminIcon.style.display = 'block';
        } else {
            this.dom.adminIcon.style.display = 'none';
        }
    }

    /**
     * Actualiza la barra de estado superior
     */
    updateStreamCategory(cat) {
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
        led.classList.remove('active');
        void led.offsetWidth; 
        led.classList.add('active');
        setTimeout(() => led.classList.remove('active'), 200);
    }

    /**
     * Gestión de visibilidad
     */
    scheduleHide(ms) {
        if (this.timers.hide) clearTimeout(this.timers.hide);
        if (window.KEEP_WIDGET_VISIBLE === true) return;

        this.timers.hide = setTimeout(() => {
            if (window.KEEP_WIDGET_VISIBLE === true) return;
            this.dom.container.classList.add('hidden');
            this.state.isVisible = false;
            EventManager.emit(EVENTS.UI.MESSAGE_HIDDEN);
        }, ms);
    }

    extendDisplayTime(ms) {
        if (!this.state.isVisible) this.dom.container.classList.remove('hidden');
        this.scheduleHide(ms);
    }

    _resetVisualClasses() {
        this.dom.container.className = 'container';
        this.dom.username.classList.remove('decrypting', 'small-text', 'extra-small-text');
        this.dom.message.classList.remove('decrypting', 'emote-only', 'emote-large', 'emote-medium');
    }

    _resetRoleStyles() {
        this.dom.container.classList.remove('vip-user', 'top-user', 'admin-user', 'ranked-user', 'status-red', 'gold-mode-active');
        this.dom.userBadge.className = 'user-badge';
    }

    clearAllTimers() {
        Object.values(this.timers).forEach(t => { if(t) clearTimeout(t); });
    }
}
