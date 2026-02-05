import UIUtils from '../utils/UIUtils.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import Logger from '../utils/Logger.js';

/**
 * UIManager - Gestor Principal de la Interfaz de Usuario
 * 
 * Responsabilidades:
 * - Gestionar elementos DOM
 * - Coordinar animaciones y transiciones
 * - Renderizar mensajes con efectos
 * - Aplicar estilos según rol de usuario
 * - Gestionar tiempos de visualización
 * 
 * Usa:
 * - UIUtils para procesamiento de texto
 * - RankingSystem para determinar roles
 * 
 * @class UIManager
 */
export default class UIManager {
    /**
     * Constructor del UIManager
     * @param {Object} config - Configuración global
     * @param {RankingSystem} rankingSystem - Sistema de ranking
     * @param {ExperienceService} experienceService - Servicio de XP
     * @param {ThirdPartyEmoteService} [thirdPartyEmoteService] - Servicio de emotes externos
     */
    constructor(config, rankingSystem, experienceService, thirdPartyEmoteService) {
        this.config = config;
        this.rankingSystem = rankingSystem;
        this.experienceService = experienceService;
        this.thirdPartyEmoteService = thirdPartyEmoteService;

        // Referencias a elementos DOM
        this.dom = this.initDOMReferences();

        // Timers para animaciones
        this.hideTimeout = null;
        this.decryptTimeout = null;
        this.fastRevealTimeout = null;

        // Control de cooldown para animaciones
        this.lastMessageTime = 0;
        
        // Tracking de mensajes por usuario para cooldown
        this.lastMessageByUser = new Map(); // { username: timestamp }
        this.userCooldownMs = 5000; // 5 segundos

        // Suscribirse a eventos
        this._setupEventListeners();
    }

    /**
     * Configura los listeners de eventos
     * @private
     */
    _setupEventListeners() {
        EventManager.on(EVENTS.STREAM.STATUS_CHANGED, (isOnline) => {
            this.updateSystemStatus(isOnline);
        });

        EventManager.on(EVENTS.STREAM.CATEGORY_UPDATED, (category) => {
            this.updateStreamCategory(category);
        });

        EventManager.on(EVENTS.UI.SYSTEM_MESSAGE, (data) => {
            // data puede ser un string directo o un objeto { text, style... }
            const text = typeof data === 'string' ? data : data.text;
            this.displayMessage('SYSTEM', text, {}, 99, 'system');
        });

        EventManager.on(EVENTS.CHAT.MESSAGE_RECEIVED, () => {
            this.flashLED('ledRx');
        });

        EventManager.on(EVENTS.STORAGE.DATA_SAVED, () => {
            this.flashLED('ledTx');
        });
    }

    /**
     * Inicializa las referencias a elementos DOM
     * @private
     * @returns {Object} Objeto con referencias DOM
     */
    initDOMReferences() {
        return {
            username: document.getElementById('username'),
            message: document.getElementById('message'),
            container: document.querySelector('.container'),
            userBadge: document.getElementById('user-badge'),
            adminIcon: document.getElementById('admin-icon'),
            streamCategory: document.getElementById('stream-category'),
            systemStatus: document.getElementById('system-status-text'),
            liveBadge: document.querySelector('.live-badge'),
            watchTimeContainer: document.getElementById('watch-time-container'), // NEW
            ledRx: document.getElementById('led-rx'),
            ledTx: document.getElementById('led-tx'),
            root: document.documentElement
        };
    }

    /**
     * Muestra un mensaje en el overlay
     * - Decide si mostrar animación de entrada completa o transición rápida
     * - Gestiona cooldowns para evitar spam de animaciones
     * 
     * @param {string} username - Nombre del usuario
     * @param {string} message - Mensaje a mostrar
     * @param {Object} emotes - Emotes de Twitch
     */
    displayMessage(username, message, emotes, subscriberInfo = {}) {
        try {
            // Verificar si el widget está visible
            const isVisible = !this.dom.container.classList.contains('hidden');

            // Limpiar timers previos
            this.clearAllTimers();

            // Mostrar container
            if (this.dom.container.classList.contains('hidden')) {
                this.dom.container.classList.remove('hidden');
                // Force reflow/repaint to ensure transition plays
                void this.dom.container.offsetWidth; 
            }

            // Limpiar clases de animación
            this.dom.username.classList.remove('decrypting');
            this.dom.message.classList.remove('decrypting');
            this.dom.container.classList.remove('takeru-bg');
            this.dom.container.classList.remove('x1lenz-bg');
            this.dom.container.classList.remove('chandalf-bg');
            this.dom.container.classList.remove('manguerazo-bg');
            this.dom.container.classList.remove('duckcris-bg');
            this.dom.container.classList.remove('subscriber-user'); // Limpiar clase subscriber

            // Determinar tipo de animación
            const now = Date.now();
            const timeSinceLast = now - this.lastMessageTime;
            const shouldShowIncoming = !isVisible && timeSinceLast > this.config.ANIMATION_COOLDOWN_MS;

            this.lastMessageTime = now;
            
            // Verificar cooldown por usuario (mismo usuario <5s)
            const lowerUsername = username.toLowerCase();
            const lastUserMessageTime = this.lastMessageByUser.get(lowerUsername) || 0;
            const timeSinceUserMessage = now - lastUserMessageTime;
            const isSameUserQuickly = timeSinceUserMessage < this.userCooldownMs;
            
            // Actualizar timestamp del usuario
            this.lastMessageByUser.set(lowerUsername, now);

            if (isSameUserQuickly) {
                // MISMO USUARIO <5s: Solo actualizar contenido sin animación
                this.fastTransition(username, message, emotes, subscriberInfo);
            } else if (!shouldShowIncoming) {
                // TRANSICIÓN RÁPIDA (conversación continua)
                this.fastTransition(username, message, emotes, subscriberInfo);
            } else {
                // ANIMACIÓN COMPLETA DE ENTRADA (>30s de silencio)
                this.fullIncomingSequence(username, message, emotes, subscriberInfo);
            }

        } catch (error) {
            console.error('❌ Error en UIManager.displayMessage:', error);
        }
    }

    /**
     * Transición rápida entre mensajes (sin animación de "incoming")
     * @private
     */
    fastTransition(username, message, emotes, subscriberInfo) {
        // En lugar de ocultar todo (blink), usamos una transición de opacidad suave
        // sobre el contenido existente, o intercambiamos directamente si es preferencia.
        
        // 1. Fade out content only
        this.dom.username.style.transition = 'opacity 0.2s ease-out';
        this.dom.message.style.transition = 'opacity 0.2s ease-out';
        
        this.dom.username.style.opacity = '0';
        this.dom.message.style.opacity = '0';

        this.fastRevealTimeout = setTimeout(() => {
            // 2. Swap content (hidden)
            this.revealMessage(username, message, emotes, subscriberInfo);
            
            // 3. Fade in new content
            requestAnimationFrame(() => {
                 this.dom.username.style.opacity = '1';
                 this.dom.message.style.opacity = '1';
            });
        }, 200); // 200ms wait for fade out
    }

    /**
     * Secuencia completa de animación de entrada
     * @private
     */
    fullIncomingSequence(username, message, emotes, subscriberInfo) {
        // Reset clases
        this.dom.container.className = 'container';

        // Texto "Incoming"
        this.dom.username.style.opacity = '1';
        this.dom.message.style.opacity = '1';

        this.dom.username.textContent = "SIGNAL DETECTED";
        this.dom.username.classList.add('decrypting');

        this.dom.message.innerHTML = "> INCOMING TRANSMISSION...";
        this.dom.message.classList.add('decrypting');

        // Limpiar otros elementos
        this.dom.userBadge.textContent = '';
        this.dom.userBadge.className = 'user-badge';

        // Revelar después de delay
        this.decryptTimeout = setTimeout(() => {
            this.dom.username.classList.remove('decrypting');
            this.dom.message.classList.remove('decrypting');
            this.revealMessage(username, message, emotes, subscriberInfo);
        }, 800);
    }

    revealMessage(username, message, emotes, subscriberInfo = {}) {
        try {
            // Procesar nombre de usuario
            const displayUsername = UIUtils.cleanUsername(username);

            // Obtener rol del usuario (para estilos visuales de contenedor/badge)
            const userRole = this.rankingSystem.getUserRole(username);

            // Obtener datos de XP y sobreescribir el título del rango (Excepto para SYSTEM)
            if (this.experienceService && username !== 'SYSTEM') {
                const xpInfo = this.experienceService.getUserXPInfo(username);
                if (xpInfo) {
                    userRole.rankTitle = {
                        title: xpInfo.title,
                        icon: 'icon-tech' // Icono por defecto para niveles de XP
                    };
                }
            }

            // Calcular tiempo de visualización
            let displayTime = this.config.MESSAGE_DISPLAY_TIME + 1000; // Increased by 1s
            if (['admin', 'top', 'vip'].includes(userRole.role)) {
                displayTime += 2000; // +2s para usuarios especiales
            }

            // Aplicar estilos de rol
            this.applyRoleStyles(userRole);

            // ================= SUBSCRIBER GOLD MODE LOGIC =================
            // 1. Limpiar timers previos
            if (this.goldModeTimeout) {
                clearTimeout(this.goldModeTimeout);
                this.goldModeTimeout = null;
            }

            // 2. Resetear estado visual (Quitar Gold Mode del mensaje anterior)
            this.dom.container.classList.remove('gold-mode-active');
            
            const xpLevelContainer = this.dom.container.querySelector('.xp-level-container');
            const xpLevelLabel = this.dom.container.querySelector('.xp-level-label');
            const xpLevelValue = this.dom.container.querySelector('#xp-level');
            const userBadge = this.dom.userBadge;

            // Resetear textos a originales (LVL y Rol)
            // LVL ya se resetea por el flujo del XPDisplayManager, pero aseguramos las etiquetas
            if (xpLevelLabel) xpLevelLabel.textContent = 'LVL';
            
            // Si hay rol, el badge ya se puso en applyRoleStyles, pero si estaba en SUB hay que asegurarnos
            if (userBadge.textContent.startsWith('SUB')) {
                 // Recuperar el texto original del rol si es posible, o dejar que applyRoleStyles lo haya hecho
                 // Como applyRoleStyles se llamó arriba, userBadge tiene el texto correcto (ej: TOP 1)
            }

            // 3. Programar transición si es Sub
            if (subscriberInfo.isSubscriber) {
                const months = subscriberInfo.badgeInfo ? subscriberInfo.badgeInfo.subscriber : 0;
                const subValue = months > 0 ? months : '1'; 

                this.goldModeTimeout = setTimeout(() => {
                   // ACTIVAR MODO ORO
                   this.dom.container.classList.add('gold-mode-active');

                   // Mantener LVL y Valor Original (Solicitud de usuario)
                   // No sobrescribimos xpLevelLabel ni xpLevelValue con meses de sub.
                   
                   /* REMOVED:
                   if (xpLevelLabel) xpLevelLabel.textContent = 'SUB';
                   if (xpLevelValue) xpLevelValue.textContent = subValue;
                   */

                   // NO CAMBIAR BADGE - Mantener el ranking (TOP 32, etc.)
                   // Badge se mantiene como está (TOP X, VIP, etc.)
                   /* REMOVED - Badge change:
                   if (userBadge) {
                       userBadge.textContent = `SUB ${subValue} MESES`;
                   }
                   */
                   
                   // OCULTAR ICONO DE RANGO/ADMIN (Para ganar espacio)
                   // El icono se restaurará automáticamente en el próximo mensaje por la lógica de revealMessage
                   if (this.dom.adminIcon) {
                       this.dom.adminIcon.style.display = 'none';
                   }

                   // Nota: El borde, la barra de XP y lo demas se manejan por CSS 
                   // gracias a la clase .gold-mode-active en el contenedor padre.

                   // CAMBIAR RANGO A EXCELSIOR USER (Visual Glitch)
                   // Solo visual, no cambia el Gist
                   // Después de 2s alterna a SUB info
                   const xpTitleEl = this.dom.container.querySelector('#xp-title');
                   if (xpTitleEl) {
                       // Mostrar EXCELSIOR USER primero
                       UIUtils.scrambleText(xpTitleEl, 'EXCELSIOR USER', 30, false);
                       
                       // Después de 2 segundos, alternar a SUB info
                       setTimeout(() => {
                           const subText = `SUB ${subValue} MESES`;
                           UIUtils.scrambleText(xpTitleEl, subText, 30, false);
                       }, 2000);
                   }

                }, 4000); // 4 segundos de delay (ajustable)
            }

            // Eliminar elementos antiguos de sub (Limpieza de versiones anteriores)
            const oldSubDisplay = this.dom.container.querySelector('#subscriber-status-display');
            if (oldSubDisplay) oldSubDisplay.remove();
            
            const streamCategoryEl = this.dom.container.querySelector('#stream-category');
            if (streamCategoryEl && streamCategoryEl.textContent.includes('SUB //')) {
                streamCategoryEl.textContent = 'CHAT.STREAM';
                streamCategoryEl.style.color = '';
                streamCategoryEl.style.textShadow = '';
                streamCategoryEl.style.fontWeight = '';
            }

            // Eliminar badge anterior si quedó alguno (Limpieza)
            if (this.dom.username.parentElement) {
                const stack = this.dom.username.parentElement.querySelector('.user-identity-stack');
                if (stack) {
                    const existingSubBadge = stack.querySelector('.sub-badge');
                    if (existingSubBadge) existingSubBadge.remove();
                }
            }

            // Actualizar nombre de usuario
            this.dom.username.textContent = displayUsername;
            this.dom.username.setAttribute('data-text', displayUsername);

            // Ajustar tamaño de fuente para nombres largos
            this.dom.username.classList.remove('small-text', 'extra-small-text');

            if (displayUsername.length > 16) {
                this.dom.username.classList.add('extra-small-text');
            } else if (displayUsername.length > 12) {
                this.dom.username.classList.add('small-text');
            }

            // Gestionar icono de admin (Arasaka) o Rangos Especiales
            if (this.dom.adminIcon) {
                const isAdmin = username.toLowerCase() === (this.config.SPECIAL_USER?.username || 'liiukiin').toLowerCase();
                const rankTitle = userRole.rankTitle ? userRole.rankTitle.title : '';

                // Obtener configuración de iconos
                const uiConfig = this.config.UI || { RANK_ICONS: {}, SPECIAL_ICONS: {} };
                const rankIcons = uiConfig.RANK_ICONS || {};
                const specialIcons = uiConfig.SPECIAL_ICONS || {};

                let iconFilename = null;

                if (isAdmin) {
                    iconFilename = specialIcons.ADMIN || 'arasaka.png';
                } else if (username === 'SYSTEM') {
                    iconFilename = specialIcons.SYSTEM || 'netrunner.png';
                } else if (subscriberInfo.isSubscriber) {
                     // Icono especial para suscriptores si no tienen otro
                     // Usamos 'samurai.png' como placeholder de suscriptor si existe, o mantenemos lógica de rango
                }

                if (!iconFilename) {
                     // Búsqueda case-insensitive robusta para rangos
                    const normalizedTitle = (rankTitle || '').trim().toUpperCase();
                    // Buscar clave que coincida (ej: 'FIXER' === 'FIXER')
                    const matchingKey = Object.keys(rankIcons).find(k => k.toUpperCase() === normalizedTitle);

                    if (this.config.DEBUG || username.toLowerCase() === 'takeru') {
                        console.log(`🔍 Icon Lookup for ${username}: Title="${rankTitle}", Normalized="${normalizedTitle}", Match="${matchingKey}"`);
                    }

                    if (matchingKey) {
                        iconFilename = rankIcons[matchingKey];
                    }
                }

                if (iconFilename) {
                    this.dom.adminIcon.src = `img/${iconFilename}`;
                    this.dom.adminIcon.style.display = 'block';
                } else {
                    this.dom.adminIcon.style.display = 'none';
                }
            }

            // ================= WATCH TIME DISPLAY (FOOTER BOTTOM-RIGHT) =================
            // HIDDEN - User request: No mostrar LURK visualmente
            /*
            if (this.dom.watchTimeContainer && this.experienceService) {
                // Reset inicial
                this.dom.watchTimeContainer.innerHTML = '';
                this.dom.watchTimeContainer.style.display = 'none';

                const userData = this.experienceService.getUserData(username);

                if (userData) {
                    // Default to 0 if undefined
                    const minutes = userData.watchTimeMinutes || 0;
                    let timeText = '';

                    // Formato: 7H
                    if (minutes >= 60) {
                        timeText = `${Math.floor(minutes / 60)}H`;
                    } else {
                        timeText = `${minutes}m`;
                    }

                    // Estilo: Absolute Bottom Right
                    this.dom.watchTimeContainer.style.display = 'flex';
                    this.dom.watchTimeContainer.style.alignItems = 'center';
                    this.dom.watchTimeContainer.style.gap = '4px';

                    // Posicionamiento absoluto relativo al contenedor del footer
                    this.dom.watchTimeContainer.style.position = 'absolute';
                    this.dom.watchTimeContainer.style.right = '5px'; // Más pegado al borde (antes 15px)
                    this.dom.watchTimeContainer.style.bottom = '30px';  // Flotando ENCIMA de los logros

                    // Limpiamos estilos extra
                    this.dom.watchTimeContainer.className = 'xp-streak';
                    this.dom.watchTimeContainer.style.background = 'none';
                    this.dom.watchTimeContainer.style.border = 'none';
                    this.dom.watchTimeContainer.style.boxShadow = 'none';
                    this.dom.watchTimeContainer.style.padding = '0';
                    this.dom.watchTimeContainer.style.margin = '0';

                    // Renderizamos con estilo "LURK" igual a "RACHA"
                    this.dom.watchTimeContainer.innerHTML = `
                        <span class="streak-label">LURK:</span>
                        <span class="streak-days">${timeText}</span>
                    `;
            */
            // ====================================================================

            // Aplicar temas personalizados de usuario desde la configuración
            const userThemes = (this.config.UI && this.config.UI.USER_THEMES) || {};
            const themeClass = userThemes[username.toLowerCase()];
            if (themeClass) {
                this.dom.container.classList.add(themeClass);
            }

            // Procesar y mostrar mensaje
            this.displayMessageContent(message, emotes, userRole);

            // Accesibilidad
            if (this.config.ACCESSIBILITY.ENABLE_ARIA) {
                this.dom.message.setAttribute('aria-label', `Mensaje de ${username}: ${message}`);
            }

            // Programar ocultamiento
            this.scheduleHide(displayTime);

        } catch (error) {
            console.error('❌ Error en revealMessage:', error);
            // Asegurar que el widget se oculte aunque haya error
            this.scheduleHide(this.config.MESSAGE_DISPLAY_TIME);
        }
    }

    /**
     * Aplica estilos CSS según el rol del usuario
     * @private
     */
    applyRoleStyles(userRole) {
        // Limpiar clases previas
        this.dom.container.classList.remove(
            'vip-user', 'top-user', 'admin-user', 'ranked-user', 'status-red'
        );
        this.dom.userBadge.classList.remove('vip', 'top-user', 'admin', 'ranked');

        // Aplicar clases de rol
        if (userRole.containerClass) {
            this.dom.container.classList.add(userRole.containerClass);

            // Color de status bar para usuarios especiales
            if (['admin-user', 'top-user', 'vip-user'].includes(userRole.containerClass)) {
                this.dom.container.classList.add('status-red');
            }
        }

        // Aplicar badge (Streak)
        if (userRole.badgeClass) {
            this.dom.userBadge.classList.add(userRole.badgeClass);

            // REMOVE "BONUS" TEXT logic
            // El badge suele venir como "🔥 x2 BONUS" o algo así.
            // Vamos a limpiar la palabra "BONUS" y dejar solo el icono y valor.
            // Usamos 'gi' para case-insensitive
            let cleanBadge = userRole.badge.replace(/bonus/gi, '').trim();
            this.dom.userBadge.textContent = cleanBadge;
        }

        // ================= WATCH TIME BADGE INJECTION =================
        // Inyectamos el badge de tiempo ANTES del badge de racha.
        // Como userBadge es un span dentro de un container, lo ideal es manipular el container.
        // El container es .user-identity-stack (ver index.html)
        // Pero no tenemos referencia directa en this.dom, solo userBadge.
        // userBadge.parentElement es .user-identity-stack

        if (this.dom.userBadge && this.dom.userBadge.parentElement) {
            // Eliminar badge de tiempo anterior si existe
            const existingTimeBadge = this.dom.userBadge.parentElement.querySelector('.time-badge');
            if (existingTimeBadge) {
                existingTimeBadge.remove();
            }

            // Crear nuevo badge si tenemos datos
            // Necesitamos los datos del usuario. Como no los tenemos pasados aquí explícitamente,
            // pero sí en revealMessage, deberíamos haberlos pasado o obtenerlos de nuevo.
            // FIX: applyRoleStyles se llama desde revealMessage.
            // Vamos a acceder al ExperienceService para obtener el tiempo.
            // Necesitamos el username, pero applyRoleStyles recibe userRole.
            // userRole no tiene username necesariamente (depende de RankingSystem).
            // Vamos a asumir que podemos obtener el username del DOM o que modificamos applyRoleStyles.

            // Mejor enfoque: Hacer esto en revealMessage, no aquí.
            // Revertimos cambio aquí y lo hacemos en revealMessage donde tenemos el username.
        }
    }



    /**
     * Procesa y muestra el contenido del mensaje
     * @private
     */
    displayMessageContent(message, emotes, userRole) {
        const processedMessage = UIUtils.processEmotes(
            message,
            emotes,
            this.thirdPartyEmoteService,
            this.config.EMOTE_SIZE
        );

        // Detectar si es solo emotes (Twitch, 7TV, BTTV, FFZ)
        const emoteAnalysis = UIUtils.isEmoteOnlyMessage(processedMessage);

        // Aplicar efecto scramble solo a Admin y Top 1 (NO si es solo emotes)
        const isHighRank = userRole.role === 'admin' ||
            (userRole.role === 'top' && userRole.rankTitle?.icon === 'icon-skull');
        const hasImages = UIUtils.hasImages(processedMessage);

        // Limpiar clases de tamaño de emotes previas
        this.dom.message.classList.remove('emote-only', 'emote-large', 'emote-medium');

        if (emoteAnalysis.isEmoteOnly) {
            // Mensaje solo de emotes: sin comillas
            this.dom.message.classList.add('emote-only');

            // Agregar clase de tamaño según cantidad de emotes
            if (emoteAnalysis.emoteCount <= 2) {
                this.dom.message.classList.add('emote-large');
            } else if (emoteAnalysis.emoteCount <= 4) {
                this.dom.message.classList.add('emote-medium');
            }

            this.dom.message.innerHTML = processedMessage;
        } else if (isHighRank && !hasImages) {
            UIUtils.scrambleText(this.dom.message, processedMessage);
        } else {
            this.dom.message.innerHTML = `"${processedMessage}"`;
        }
    }

    /**
     * Extiende el tiempo de visualización del widget
     * Útil cuando aparecen logros u otros eventos secundarios
     * @param {number} extraTimeMs - Tiempo extra en milisegundos
     */
    extendDisplayTime(extraTimeMs) {
        if (this.dom.container.classList.contains('hidden')) {
            // Si estaba oculto, lo mostramos
            this.dom.container.classList.remove('hidden');
        }

        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        if (window.KEEP_WIDGET_VISIBLE === true) return;

        // Programar nuevo timeout
        this.hideTimeout = setTimeout(() => {
            if (window.KEEP_WIDGET_VISIBLE === true) return;
            this.dom.container.classList.add('hidden');
            if (this.config.DEBUG) Logger.info('UI', 'Widget ocultado tras extensión de tiempo');
        }, extraTimeMs);
    }

    /**
     * Programa el ocultamiento del widget
     * @private
     */
    scheduleHide(displayTime) {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        // Check global flag from test panel
        if (window.KEEP_WIDGET_VISIBLE === true) {
            return;
        }

        this.hideTimeout = setTimeout(() => {
            // Re-check flag just in case it changed during the timeout
            if (window.KEEP_WIDGET_VISIBLE === true) return;

            this.dom.container.classList.add('hidden');
            EventManager.emit(EVENTS.UI.MESSAGE_HIDDEN);
            if (this.config.DEBUG) {
                Logger.info('UI', 'Widget ocultado automáticamente');
            }
        }, displayTime);
    }

    /**
     * Actualiza la categoría del stream en la barra de estado
     * @param {string} categoryName - Nombre de la categoría (Juego)
     */
    updateStreamCategory(categoryName) {
        if (!this.dom.streamCategory || !categoryName) return;

        // Efecto visual simple de actualización
        this.dom.streamCategory.style.opacity = '0';

        setTimeout(() => {
            // Formato: SYS.ONLINE | [CATEGORY]
            // Pero 'SYS.ONLINE |' está en otros elementos, aquí solo cambiamos el último span
            this.dom.streamCategory.textContent = categoryName.toUpperCase();
            this.dom.streamCategory.style.opacity = '1';
        }, 300);
    }

    /**
     * Actualiza el estado del sistema (ONLINE/OFFLINE)
     * @param {boolean} isOnline 
     */
    updateSystemStatus(isOnline) {
        if (!this.dom.systemStatus) return;

        const text = isOnline ? 'SYS.ONLINE' : 'SYS.OFFLINE';

        // Solo actualizar si cambia
        if (this.dom.systemStatus.textContent !== text) {
            this.dom.systemStatus.style.opacity = '0';
            setTimeout(() => {
                this.dom.systemStatus.textContent = text;
                this.dom.systemStatus.style.opacity = '1';

                // Opcional: Cambiar color si es offline
                if (!isOnline) {
                    this.dom.systemStatus.style.color = '#555'; // Greyed out for offline
                    if (this.dom.liveBadge) this.dom.liveBadge.style.display = 'none';
                } else {
                    this.dom.systemStatus.style.color = ''; // Reset to default
                    if (this.dom.liveBadge) this.dom.liveBadge.style.display = 'block';
                }
            }, 300);
        }
    }

    /**
     * Limpia todos los timers activos
     * @private
     */
    clearAllTimers() {
        if (this.hideTimeout) clearTimeout(this.hideTimeout);
        if (this.decryptTimeout) clearTimeout(this.decryptTimeout);
        if (this.fastRevealTimeout) clearTimeout(this.fastRevealTimeout);
    }

    /**
     * Hace parpadear un LED de actividad
     * @param {string} ledKey - 'ledRx' o 'ledTx'
     */
    flashLED(ledKey) {
        const led = this.dom[ledKey];
        if (!led) return;

        // Force restart animation if already active
        led.classList.remove('active');
        void led.offsetWidth; 
        led.classList.add('active');

        // Turn off after 200ms
        setTimeout(() => {
            led.classList.remove('active');
        }, 200);
    }
}
