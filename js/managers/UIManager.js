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
class UIManager {
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
    displayMessage(username, message, emotes) {
        try {
            // Verificar si el widget está visible
            const isVisible = !this.dom.container.classList.contains('hidden');

            // Limpiar timers previos
            this.clearAllTimers();

            // Mostrar container
            this.dom.container.classList.remove('hidden');

            // Limpiar clases de animación
            this.dom.username.classList.remove('decrypting');
            this.dom.message.classList.remove('decrypting');
            this.dom.container.classList.remove('takeru-bg');
            this.dom.container.classList.remove('x1lenz-bg');
            this.dom.container.classList.remove('chandalf-bg');

            // Determinar tipo de animación
            const now = Date.now();
            const timeSinceLast = now - this.lastMessageTime;
            const shouldShowIncoming = !isVisible && timeSinceLast > this.config.ANIMATION_COOLDOWN_MS;

            this.lastMessageTime = now;

            if (!shouldShowIncoming) {
                // TRANSICIÓN RÁPIDA (conversación continua)
                this.fastTransition(username, message, emotes);
            } else {
                // ANIMACIÓN COMPLETA DE ENTRADA (> 30s de silencio)
                this.fullIncomingSequence(username, message, emotes);
            }

        } catch (error) {
            console.error('❌ Error en UIManager.displayMessage:', error);
        }
    }

    /**
     * Transición rápida entre mensajes (sin animación de "incoming")
     * @private
     */
    fastTransition(username, message, emotes) {
        this.dom.username.style.opacity = '0';
        this.dom.message.style.opacity = '0';

        this.fastRevealTimeout = setTimeout(() => {
            this.revealMessage(username, message, emotes);
            this.dom.username.style.opacity = '1';
            this.dom.message.style.opacity = '1';
        }, 100);
    }

    /**
     * Secuencia completa de animación de entrada
     * @private
     */
    fullIncomingSequence(username, message, emotes) {
        // Reset clases
        this.dom.container.className = 'container';

        // Texto "Incoming"
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
            this.revealMessage(username, message, emotes);
        }, 800);
    }

    revealMessage(username, message, emotes) {
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
            let displayTime = this.config.MESSAGE_DISPLAY_TIME;
            if (['admin', 'top', 'vip'].includes(userRole.role)) {
                displayTime += 2000; // +2s para usuarios especiales
            }

            // Aplicar estilos de rol
            this.applyRoleStyles(userRole);

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
            // Gestionar icono de admin (Arasaka) o Rangos Especiales
            if (this.dom.adminIcon) {
                const isAdmin = username.toLowerCase() === (this.config.SPECIAL_USER?.username || 'liiukiin').toLowerCase();
                const rankTitle = userRole.rankTitle ? userRole.rankTitle.title : '';

                // Obtener configuración de iconos
                // Se usa fallback por seguridad si el config es antiguo
                const uiConfig = this.config.UI || { RANK_ICONS: {}, SPECIAL_ICONS: {} };
                const rankIcons = uiConfig.RANK_ICONS || {};
                const specialIcons = uiConfig.SPECIAL_ICONS || {};

                let iconFilename = null;

                if (isAdmin) {
                    iconFilename = specialIcons.ADMIN || 'arasaka.png';
                } else if (username === 'SYSTEM') {
                    iconFilename = specialIcons.SYSTEM || 'netrunner.png';
                } else if (rankIcons[rankTitle]) {
                    iconFilename = rankIcons[rankTitle];
                }

                if (iconFilename) {
                    this.dom.adminIcon.src = `img/${iconFilename}`;
                    this.dom.adminIcon.style.display = 'block';
                } else {
                    this.dom.adminIcon.style.display = 'none';
                }
            }

            // Custom Background for Takeru_xiii
            if (username.toLowerCase() === 'takeru_xiii') {
                this.dom.container.classList.add('takeru-bg');
            }

            // Custom Background for x1lenz
            if (username.toLowerCase() === 'x1lenz') {
                this.dom.container.classList.add('x1lenz-bg');
            }

            // Custom Background for chandalf
            if (['chandalf', 'c_h_a_n_d_a_l_f'].includes(username.toLowerCase())) {
                this.dom.container.classList.add('chandalf-bg');
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

        // Aplicar badge
        if (userRole.badgeClass) {
            this.dom.userBadge.classList.add(userRole.badgeClass);
            this.dom.userBadge.textContent = userRole.badge;
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
            if (this.config.DEBUG) console.log('🔒 Widget ocultado tras extensión de tiempo');
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
            if (this.config.DEBUG) {
                console.log('🔒 Widget ocultado automáticamente');
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
     * Limpia todos los timers activos
     * @private
     */
    clearAllTimers() {
        if (this.hideTimeout) clearTimeout(this.hideTimeout);
        if (this.decryptTimeout) clearTimeout(this.decryptTimeout);
        if (this.fastRevealTimeout) clearTimeout(this.fastRevealTimeout);
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
