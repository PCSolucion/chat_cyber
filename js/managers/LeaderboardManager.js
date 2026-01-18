/**
 * LeaderboardManager - Gestión del Panel Top 10 por Inactividad
 * 
 * Responsabilidades:
 * - Detectar períodos de inactividad en el chat
 * - Mostrar Top 10 usuarios por nivel
 * - Ocultar cuando llega un nuevo mensaje
 * - Gestionar timers de aparición/desaparición
 * 
 * @class LeaderboardManager
 */
class LeaderboardManager {
    /**
     * Constructor del manager
     * @param {ExperienceService} experienceService - Servicio de XP para obtener datos
     * @param {Object} config - Configuración global
     */
    constructor(experienceService, config) {
        this.experienceService = experienceService;
        this.config = config;

        // Configuración de tiempos (en milisegundos)
        this.INACTIVITY_DELAY = 2 * 60 * 1000;  // 2 minutos para mostrar
        this.DISPLAY_DURATION = 2 * 60 * 1000;  // 2 minutos visible
        this.TOTAL_ACHIEVEMENTS = 117;           // Total de logros en el sistema

        // Timers
        this.inactivityTimer = null;
        this.hideTimer = null;

        // Estado
        this.isVisible = false;
        this.lastMessageTime = Date.now();

        // Elementos DOM (se crearán en init)
        this.panelElement = null;
        this.listElement = null;

        // Inicializar
        this.init();

        if (this.config.DEBUG) {
            console.log('✅ LeaderboardManager inicializado');
        }
    }

    /**
     * Inicializa el manager y crea el DOM
     */
    init() {
        this.createDOM();
        this.startInactivityTimer();
    }

    /**
     * Crea el HTML del panel de leaderboard
     */
    createDOM() {
        // Crear el panel principal
        this.panelElement = document.createElement('div');
        this.panelElement.className = 'leaderboard-panel';
        this.panelElement.id = 'leaderboard-panel';

        this.panelElement.innerHTML = `
            <div class="leaderboard-header">
                <span class="leaderboard-header-icon">◆</span>
                <div>
                    <div class="leaderboard-header-title">TOP LEGENDS</div>
                    <div class="leaderboard-header-sub">NIGHT CITY RANKING</div>
                </div>
                <span class="leaderboard-header-icon">◆</span>
            </div>
            <div class="leaderboard-list" id="leaderboard-list"></div>
            <div class="leaderboard-footer">
                <span class="leaderboard-footer-text">[ SYS.LEADERBOARD // LIVE DATA ]</span>
            </div>
        `;

        // Insertar en el container del widget
        const container = document.querySelector('.container');
        if (container) {
            container.appendChild(this.panelElement);
        }

        this.listElement = document.getElementById('leaderboard-list');
    }

    /**
     * Notifica que se recibió un mensaje (resetea inactividad)
     */
    onMessageReceived() {
        this.lastMessageTime = Date.now();

        // Si el panel está visible, ocultarlo
        if (this.isVisible) {
            this.hide();
        }

        // Reiniciar timer de inactividad
        this.startInactivityTimer();
    }

    /**
     * Inicia el timer de inactividad
     */
    startInactivityTimer() {
        // Limpiar timer existente
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }

        // Nuevo timer para mostrar después de inactividad
        this.inactivityTimer = setTimeout(() => {
            this.show();
        }, this.INACTIVITY_DELAY);
    }

    /**
     * Muestra el panel de leaderboard
     */
    show() {
        if (this.isVisible) return;

        // Actualizar datos
        this.updateLeaderboard();

        // Mostrar panel
        this.panelElement.classList.add('visible');
        this.isVisible = true;

        if (this.config.DEBUG) {
            console.log('📊 Leaderboard mostrado');
        }

        // Timer para ocultar después de DISPLAY_DURATION
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
        }

        this.hideTimer = setTimeout(() => {
            this.hide();
            // Reiniciar timer de inactividad después de ocultar
            this.startInactivityTimer();
        }, this.DISPLAY_DURATION);
    }

    /**
     * Oculta el panel de leaderboard
     */
    hide() {
        if (!this.isVisible) return;

        this.panelElement.classList.remove('visible');
        this.isVisible = false;

        // Limpiar timer de ocultado
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }

        if (this.config.DEBUG) {
            console.log('📊 Leaderboard ocultado');
        }
    }

    /**
     * Actualiza el contenido del leaderboard con los datos actuales
     */
    updateLeaderboard() {
        if (!this.listElement) return;

        // Obtener Top 7 del ExperienceService
        const leaderboard = this.experienceService.getXPLeaderboard(7);

        // Limpiar lista actual
        this.listElement.innerHTML = '';

        // Crear entradas
        leaderboard.forEach((user, index) => {
            const position = index + 1;
            const entry = this.createLeaderboardEntry(user, position);
            this.listElement.appendChild(entry);
        });

        // Si no hay usuarios, mostrar mensaje
        if (leaderboard.length === 0) {
            this.listElement.innerHTML = `
                <div style="text-align: center; padding: 30px; color: var(--text-dim);">
                    <div style="font-size: 24px; margin-bottom: 10px;">📊</div>
                    <div style="font-size: 11px; letter-spacing: 1px;">NO DATA AVAILABLE</div>
                </div>
            `;
        }
    }

    /**
     * Crea un elemento de entrada del leaderboard
     * @param {Object} user - Datos del usuario
     * @param {number} position - Posición en el ranking
     * @returns {HTMLElement}
     */
    createLeaderboardEntry(user, position) {
        const entry = document.createElement('div');
        entry.className = 'leaderboard-entry';

        // Clases especiales para top 3
        if (position === 1) entry.classList.add('top-1');
        else if (position === 2) entry.classList.add('top-2');
        else if (position === 3) entry.classList.add('top-3');

        // Obtener datos completos del usuario
        const userData = this.experienceService.getUserData(user.username);
        const achievementCount = (userData.achievements || []).length;

        // Icono de posición
        let positionDisplay = `#${position}`;
        if (position === 1) positionDisplay = '★';
        else if (position === 2) positionDisplay = '♛';
        else if (position === 3) positionDisplay = '♕';

        entry.innerHTML = `
            <div class="leaderboard-position">${positionDisplay}</div>
            <div class="leaderboard-user-info">
                <div class="leaderboard-username">${this.formatUsername(user.username)}</div>
                <div class="leaderboard-rank-title">${user.title}</div>
            </div>
            <div class="leaderboard-stats">
                <div class="leaderboard-level">LVL ${user.level}</div>
                <div class="leaderboard-achievements">
                    <span class="leaderboard-achievements-icon">🏆</span>
                    <span>${achievementCount}/${this.TOTAL_ACHIEVEMENTS}</span>
                </div>
            </div>
        `;

        return entry;
    }

    /**
     * Formatea el nombre de usuario para display
     * @param {string} username - Nombre de usuario
     * @returns {string} Nombre formateado
     */
    formatUsername(username) {
        // Capitalizar primera letra
        return username.charAt(0).toUpperCase() + username.slice(1);
    }

    /**
     * Fuerza la visualización del leaderboard (para testing)
     */
    forceShow() {
        // Limpiar timers
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }

        this.show();
    }

    /**
     * Destructor - limpia timers
     */
    destroy() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
        }
        if (this.panelElement && this.panelElement.parentNode) {
            this.panelElement.parentNode.removeChild(this.panelElement);
        }
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeaderboardManager;
}
