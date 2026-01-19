/**
 * IdleDisplayManager - Gestiona la visualización cuando no hay chat activo
 * 
 * Responsabilidades:
 * - Detectar inactividad del chat
 * - Mostrar estadísticas en tiempo real cuando no hay mensajes
 * - Rotar entre diferentes "pantallas" de información
 * - Mantener el widget siempre visible
 * 
 * @class IdleDisplayManager
 */
class IdleDisplayManager {
    constructor(config, sessionStatsService, uiManager) {
        this.config = config;
        this.statsService = sessionStatsService;
        this.uiManager = uiManager;

        // Configuración de idle
        this.idleTimeoutMs = config.IDLE_TIMEOUT_MS || 30000;  // 30 segundos sin actividad
        this.screenRotationMs = config.IDLE_ROTATION_MS || 8000;  // 8 segundos por pantalla

        // Estado
        this.isIdle = false;
        this.idleTimeout = null;
        this.rotationInterval = null;
        this.currentCycleIndex = 0;
        this.lastMessageTime = Date.now();

        // Referencias DOM (se crearán dinámicamente)
        this.idleContainer = null;

        // Inicializar
        this._createIdleContainer();
    }

    /**
     * Crea el contenedor para el modo idle
     * @private
     */
    _createIdleContainer() {
        // Verificar si ya existe
        if (document.getElementById('idle-stats-display')) {
            this.idleContainer = document.getElementById('idle-stats-display');
            return;
        }

        // Crear contenedor
        const container = document.createElement('div');
        container.id = 'idle-stats-display';
        container.className = 'idle-stats-display';
        container.style.display = 'none';

        // Insertar en el widget (reemplaza el área de mensaje)
        const messageDiv = document.getElementById('message');
        if (messageDiv && messageDiv.parentNode) {
            messageDiv.parentNode.insertBefore(container, messageDiv.nextSibling);
        } else {
            // Fallback: insertar en el container principal
            const mainContainer = document.querySelector('.container');
            if (mainContainer) {
                mainContainer.appendChild(container);
            }
        }

        this.idleContainer = container;
    }

    /**
     * Notifica que hubo actividad (nuevo mensaje)
     * Resetea el timer de idle
     */
    onActivity() {
        this.lastMessageTime = Date.now();

        // Si estaba en modo idle, salir
        if (this.isIdle) {
            this._exitIdleMode();
        }

        // Resetear timer de idle
        this._resetIdleTimer();
    }

    /**
     * Resetea el timer de inactividad
     * @private
     */
    _resetIdleTimer() {
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
        }

        this.idleTimeout = setTimeout(() => {
            this._enterIdleMode();
        }, this.idleTimeoutMs);
    }

    /**
     * Entra en modo idle (sin actividad)
     * @private
     */
    _enterIdleMode() {
        if (this.isIdle) return;

        this.isIdle = true;
        this.currentCycleIndex = 0;

        console.log('💤 Entering idle mode - showing stats');

        // Asegurar que el widget está visible
        const container = document.querySelector('.container');
        if (container) {
            container.classList.remove('hidden');
            container.classList.add('idle-mode');
        }

        // Ocultar mensaje normal
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.style.display = 'none';
        }

        // Cambiar el nombre de usuario por el título de estadísticas
        const usernameEl = document.getElementById('username');
        if (usernameEl) {
            this._savedUsername = usernameEl.textContent;
            this._savedUsernameData = usernameEl.getAttribute('data-text');
            usernameEl.textContent = 'ESTADÍSTICAS DE DIRECTO';
            usernameEl.setAttribute('data-text', 'ESTADÍSTICAS DE DIRECTO');
            usernameEl.classList.add('idle-stats-title');
        }

        // Actualizar badge
        const badge = document.getElementById('user-badge');
        if (badge) {
            this._savedBadge = badge.textContent;
            this._savedBadgeClass = badge.className;
            badge.textContent = '📡 LIVE';
            badge.className = 'user-badge idle-badge';
        }

        // Ocultar icono admin/rank
        const adminIcon = document.getElementById('admin-icon');
        if (adminIcon) {
            this._savedAdminIconDisplay = adminIcon.style.display;
            adminIcon.style.display = 'none';
        }

        // Ocultar mission icon
        const missionIcon = document.querySelector('.mission-icon');
        if (missionIcon) {
            this._savedMissionIconDisplay = missionIcon.style.display;
            missionIcon.style.display = 'none';
        }

        // Ocultar contador de logros (20/122)
        const achCounter = document.getElementById('xp-achievements-container-wrapper');
        if (achCounter) {
            this._savedAchCounterDisplay = achCounter.style.display;
            achCounter.style.display = 'none';
        }

        // Mostrar container de idle
        if (this.idleContainer) {
            this.idleContainer.style.display = 'block';
        }

        // Iniciar primera pantalla
        this._updateIdleDisplay();

        // Iniciar rotación
        this.rotationInterval = setInterval(() => {
            this.currentCycleIndex++;
            this._updateIdleDisplay();
        }, this.screenRotationMs);
    }

    /**
     * Sale del modo idle
     * @private
     */
    _exitIdleMode() {
        if (!this.isIdle) return;

        this.isIdle = false;

        console.log('🔔 Exiting idle mode - new message');

        // Detener rotación
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
            this.rotationInterval = null;
        }

        // Quitar clase de idle mode
        const container = document.querySelector('.container');
        if (container) {
            container.classList.remove('idle-mode');
        }

        // Ocultar container de idle
        if (this.idleContainer) {
            this.idleContainer.style.display = 'none';
        }

        // Mostrar mensaje normal
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.style.display = 'block';
        }

        // Restaurar nombre de usuario
        const usernameEl = document.getElementById('username');
        if (usernameEl && this._savedUsername) {
            usernameEl.textContent = this._savedUsername;
            usernameEl.setAttribute('data-text', this._savedUsernameData || this._savedUsername);
            usernameEl.classList.remove('idle-stats-title');
        }

        // Restaurar badge
        const badge = document.getElementById('user-badge');
        if (badge && this._savedBadgeClass) {
            badge.textContent = this._savedBadge || '';
            badge.className = this._savedBadgeClass;
        }

        // Restaurar icono admin/rank
        const adminIcon = document.getElementById('admin-icon');
        if (adminIcon) {
            adminIcon.style.display = this._savedAdminIconDisplay || '';
        }

        // Restaurar mission icon
        const missionIcon = document.querySelector('.mission-icon');
        if (missionIcon) {
            missionIcon.style.display = this._savedMissionIconDisplay || '';
        }

        // Restaurar contador de logros
        const achCounter = document.getElementById('xp-achievements-container-wrapper');
        if (achCounter) {
            // Restaurar visualización original (block por defecto si no estaba guardada)
            achCounter.style.display = this._savedAchCounterDisplay !== undefined ? this._savedAchCounterDisplay : '';
        }
    }

    /**
     * Actualiza el contenido del display idle
     * @private
     */
    _updateIdleDisplay() {
        if (!this.idleContainer || !this.statsService) return;

        const screenData = this.statsService.getIdleDisplayData(this.currentCycleIndex);

        // Limpiar contenedor (el título ya está en el username)
        this.idleContainer.innerHTML = '';

        // Crear contenedor para el contenido de la pantalla
        const screenContent = document.createElement('div');
        screenContent.className = 'idle-screen-content';
        this.idleContainer.appendChild(screenContent);

        // Guardar referencia temporal para los métodos de renderizado
        this._currentScreenContent = screenContent;

        // Crear contenido según tipo de pantalla
        switch (screenData.type) {
            case 'summary':
                this._renderSummaryScreen(screenData);
                break;
            case 'leaderboard':
                this._renderLeaderboardScreen(screenData);
                break;
            case 'achievements':
                this._renderAchievementsScreen(screenData);
                break;
            case 'streaks':
                this._renderStreaksScreen(screenData);
                break;
            default:
                this._renderSummaryScreen(screenData);
        }

        // Añadir clase de animación
        this.idleContainer.classList.add('idle-screen-enter');
        setTimeout(() => {
            this.idleContainer.classList.remove('idle-screen-enter');
        }, 500);
    }

    /**
     * Renderiza pantalla de resumen
     * @private
     */
    _renderSummaryScreen(screenData) {
        const { data } = screenData;

        this._currentScreenContent.innerHTML = `
            <div class="idle-screen idle-summary">
                <div class="idle-title">
                    <span class="idle-icon">◆</span>
                    <span class="idle-title-text">${screenData.title}</span>
                </div>
                <div class="idle-stats-grid">
                    <div class="idle-stat">
                        <span class="idle-stat-value">${data.duration}</span>
                        <span class="idle-stat-label">DURACIÓN</span>
                    </div>
                    <div class="idle-stat">
                        <span class="idle-stat-value">${data.messages}</span>
                        <span class="idle-stat-label">MENSAJES</span>
                    </div>
                    <div class="idle-stat">
                        <span class="idle-stat-value">${data.users}</span>
                        <span class="idle-stat-label">USUARIOS</span>
                    </div>
                    <div class="idle-stat">
                        <span class="idle-stat-value">${data.avgMpm}</span>
                        <span class="idle-stat-label">MSG/MIN</span>
                    </div>
                </div>
                <div class="idle-footer">
                    <span class="idle-hint">Esperando mensajes...</span>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza pantalla de leaderboard
     * @private
     */
    _renderLeaderboardScreen(screenData) {
        const users = screenData.data || [];

        let usersHtml = '';
        users.forEach((user, index) => {
            const rankClass = index === 0 ? 'top-1' : index < 3 ? 'top-3' : '';
            usersHtml += `
                <div class="idle-leaderboard-row ${rankClass}">
                    <span class="idle-rank">#${index + 1}</span>
                    <span class="idle-username">${user.username}</span>
                    <span class="idle-user-level">LVL ${user.level}</span>
                    <span class="idle-user-msgs">${user.messages} msgs</span>
                </div>
            `;
        });

        if (users.length === 0) {
            usersHtml = '<div class="idle-empty">Sin actividad aún</div>';
        }

        this._currentScreenContent.innerHTML = `
            <div class="idle-screen idle-leaderboard">
                <div class="idle-title">
                    <span class="idle-icon">★</span>
                    <span class="idle-title-text">${screenData.title}</span>
                </div>
                <div class="idle-leaderboard-list">
                    ${usersHtml}
                </div>
            </div>
        `;
    }

    /**
     * Renderiza pantalla de logros y level-ups
     * @private
     */
    _renderAchievementsScreen(screenData) {
        const { data } = screenData;

        let recentHtml = '';
        if (data.recent && data.recent.length > 0) {
            data.recent.forEach(levelUp => {
                recentHtml += `
                    <div class="idle-recent-item">
                        <span class="idle-recent-user">${levelUp.username}</span>
                        <span class="idle-recent-arrow">→</span>
                        <span class="idle-recent-level">NVL ${levelUp.newLevel}</span>
                    </div>
                `;
            });
        } else {
            recentHtml = '<div class="idle-empty-small">Sin subidas de nivel</div>';
        }

        this._currentScreenContent.innerHTML = `
            <div class="idle-screen idle-achievements">
                <div class="idle-title">
                    <span class="idle-icon">🏆</span>
                    <span class="idle-title-text">${screenData.title}</span>
                </div>
                <div class="idle-stats-row">
                    <div class="idle-stat-box">
                        <span class="idle-stat-big">${data.levelUps}</span>
                        <span class="idle-stat-label">SUBIDAS</span>
                    </div>
                    <div class="idle-stat-box">
                        <span class="idle-stat-big">${data.achievements}</span>
                        <span class="idle-stat-label">LOGROS</span>
                    </div>
                </div>
                <div class="idle-recent-section">
                    <div class="idle-subtitle">ÚTIMAS SUBIDAS DE NIVEL</div>
                    ${recentHtml}
                </div>
            </div>
        `;
    }

    /**
     * Renderiza pantalla de rachas
     * @private
     */
    _renderStreaksScreen(screenData) {
        const { data } = screenData;

        let streakContent = '';
        if (data.highestStreak) {
            streakContent = `
                <div class="idle-streak-highlight">
                    <span class="idle-streak-days">${data.highestStreak.days}</span>
                    <span class="idle-streak-label">DÍAS</span>
                </div>
                <div class="idle-streak-user">
                    <span class="idle-streak-icon">🔥</span>
                    <span>${data.highestStreak.username}</span>
                </div>
            `;
        } else {
            streakContent = '<div class="idle-empty">Sin rachas activas</div>';
        }

        this._currentScreenContent.innerHTML = `
            <div class="idle-screen idle-streaks">
                <div class="idle-title">
                    <span class="idle-icon">⚡</span>
                    <span class="idle-title-text">${screenData.title}</span>
                </div>
                <div class="idle-streak-content">
                    ${streakContent}
                </div>
                <div class="idle-streak-footer">
                    <span class="idle-total-streaks">${data.totalActive} rachas activas</span>
                </div>
            </div>
        `;
    }

    /**
     * Inicia el servicio
     */
    start() {
        this._resetIdleTimer();
        console.log('💤 IdleDisplayManager started');
    }

    /**
     * Detiene el servicio
     */
    stop() {
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
        }
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
        }
        this._exitIdleMode();
    }

    /**
     * Limpia recursos
     */
    destroy() {
        this.stop();
        if (this.idleContainer && this.idleContainer.parentNode) {
            this.idleContainer.parentNode.removeChild(this.idleContainer);
        }
    }
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IdleDisplayManager;
}
