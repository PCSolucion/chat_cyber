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
     */
    constructor(config, rankingSystem, experienceService) {
        this.config = config;
        this.rankingSystem = rankingSystem;
        this.experienceService = experienceService;

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
            // rankIcon: document.getElementById('rank-icon'), // Removed
            // rankText: document.getElementById('rank-text'), // Removed
            customUserImage: document.getElementById('custom-user-image'),
            userIdentityStack: document.querySelector('.user-identity-stack'),
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
     * @param {number} userNumber - Número de piloto
     * @param {Object} team - Equipo de F1
     */
    displayMessage(username, message, emotes, userNumber, team) {
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

            // Determinar tipo de animación
            const now = Date.now();
            const timeSinceLast = now - this.lastMessageTime;
            const shouldShowIncoming = !isVisible && timeSinceLast > this.config.ANIMATION_COOLDOWN_MS;

            this.lastMessageTime = now;

            if (!shouldShowIncoming) {
                // TRANSICIÓN RÁPIDA (conversación continua)
                this.fastTransition(username, message, emotes, userNumber, team);
            } else {
                // ANIMACIÓN COMPLETA DE ENTRADA (> 30s de silencio)
                this.fullIncomingSequence(username, message, emotes, userNumber, team);
            }

        } catch (error) {
            console.error('❌ Error en UIManager.displayMessage:', error);
        }
    }

    /**
     * Transición rápida entre mensajes (sin animación de "incoming")
     * @private
     */
    fastTransition(username, message, emotes, userNumber, team) {
        this.dom.username.style.opacity = '0';
        this.dom.message.style.opacity = '0';

        this.fastRevealTimeout = setTimeout(() => {
            this.revealMessage(username, message, emotes, userNumber, team);
            this.dom.username.style.opacity = '1';
            this.dom.message.style.opacity = '1';
        }, 100);
    }

    /**
     * Secuencia completa de animación de entrada
     * @private
     */
    fullIncomingSequence(username, message, emotes, userNumber, team) {
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
        // this.dom.rankIcon.className = ''; // Removed
        // this.dom.rankText.textContent = "ESTABLISHING CONNECTION..."; // Removed

        if (this.dom.customUserImage) {
            this.dom.customUserImage.style.display = 'none';
        }

        // Revelar después de delay
        this.decryptTimeout = setTimeout(() => {
            this.dom.username.classList.remove('decrypting');
            this.dom.message.classList.remove('decrypting');
            this.revealMessage(username, message, emotes, userNumber, team);
        }, 800);
    }

    revealMessage(username, message, emotes, userNumber, team) {
        try {
            // Procesar nombre de usuario
            const displayUsername = UIUtils.cleanUsername(username);

            // Obtener rol del usuario (para estilos visuales de contenedor/badge)
            const userRole = this.rankingSystem.getUserRole(username);

            // Obtener datos de XP y sobreescribir el título del rango
            if (this.experienceService) {
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

            // Gestionar imagen personalizada
            this.updateCustomUserImage(displayUsername, userRole);

            // updateRankDisplay removed

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
     * Actualiza la imagen personalizada del usuario
     * @private
     */
    updateCustomUserImage(username, userRole) {
        if (!this.dom.customUserImage) return;

        // Siempre ocultar imagen
        this.dom.customUserImage.style.display = 'none';
        this.dom.customUserImage.innerHTML = '';

        if (this.dom.userIdentityStack) {
            this.dom.userIdentityStack.classList.remove('horizontal-stack');
        }
    }

    /**
     * Actualiza la visualización del ranking (DEPRECATED/REMOVED)
     * @private
     */
    updateRankDisplay(userRole) {
        // Feature removed by user request
    }

    /**
     * Procesa y muestra el contenido del mensaje
     * @private
     */
    displayMessageContent(message, emotes, userRole) {
        const processedMessage = UIUtils.processEmotes(
            message,
            emotes,
            this.config.EMOTE_SIZE
        );

        // Aplicar efecto scramble solo a Admin y Top 1
        const isHighRank = userRole.role === 'admin' ||
            (userRole.role === 'top' && userRole.rankTitle?.icon === 'icon-skull');
        const hasImages = UIUtils.hasImages(processedMessage);

        if (isHighRank && !hasImages) {
            UIUtils.scrambleText(this.dom.message, processedMessage);
        } else {
            this.dom.message.innerHTML = `"${processedMessage}"`;
        }
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
