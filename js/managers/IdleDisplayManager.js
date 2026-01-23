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
            badge.textContent = 'LIVE';
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
            case 'trending':
                this._renderTrendingScreen(screenData);
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
     * Renderiza pantalla de resumen con estilo terminal
     * @private
     */
    _renderSummaryScreen(screenData) {
        const { data } = screenData;

        // Obtener hora de inicio formateada
        const startTime = new Date(this.statsService.sessionStart);
        const startTimeStr = startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        this._currentScreenContent.innerHTML = `
            <div class="idle-terminal">
                <div class="idle-terminal-header">
                    <span class="idle-terminal-prompt">></span>
                    <span class="idle-terminal-title">SESION_ACTIVA</span>
                    <span class="idle-terminal-separator"></span>
                </div>
                <div class="idle-terminal-body">
                    <div class="idle-data-line">
                        <span class="idle-data-label">TIEMPO</span>
                        <span class="idle-data-dots"></span>
                        <span class="idle-data-value value-cyan">${data.duration}</span>
                        <span class="idle-data-indicator"></span>
                    </div>
                    <div class="idle-data-line">
                        <span class="idle-data-label">MENSAJES</span>
                        <span class="idle-data-dots"></span>
                        <span class="idle-data-value">${data.messages}</span>
                    </div>
                    <div class="idle-data-line">
                        <span class="idle-data-label">USUARIOS</span>
                        <span class="idle-data-dots"></span>
                        <span class="idle-data-value">${data.users}</span>
                    </div>
                    <div class="idle-data-line">
                        <span class="idle-data-label">MSG/MIN</span>
                        <span class="idle-data-dots"></span>
                        <span class="idle-data-value value-gold">${data.avgMpm}</span>
                    </div>
                    <div class="idle-data-line">
                        <span class="idle-data-label">INICIO</span>
                        <span class="idle-data-dots"></span>
                        <span class="idle-data-value">${startTimeStr}h</span>
                    </div>
                </div>
                <div class="idle-terminal-footer">
                    <span class="idle-status-dot"></span>
                    <span class="idle-terminal-status">ESPERANDO DATOS</span>
                    <span class="idle-terminal-cursor"></span>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza pantalla de leaderboard con estilo terminal
     * @private
     */
    _renderLeaderboardScreen(screenData) {
        const users = screenData.data || [];

        let usersHtml = '';
        users.forEach((user, index) => {
            const rankClass = index === 0 ? 'rank-1' : index < 3 ? 'rank-top3' : '';
            usersHtml += `
                <div class="idle-rank-line ${rankClass}">
                    <span class="idle-rank-num">#${String(index + 1).padStart(2, '0')}</span>
                    <span class="idle-rank-name">${user.username}</span>
                    <span class="idle-rank-level">LVL ${user.level}</span>
                    <span class="idle-rank-msgs">${user.messages}msg</span>
                </div>
            `;
        });

        if (users.length === 0) {
            usersHtml = '<div class="idle-empty-state">SIN ACTIVIDAD</div>';
        }

        this._currentScreenContent.innerHTML = `
            <div class="idle-terminal">
                <div class="idle-terminal-header">
                    <span class="idle-terminal-prompt">></span>
                    <span class="idle-terminal-title">RANKING_SESION</span>
                    <span class="idle-terminal-separator"></span>
                </div>
                <div class="idle-terminal-body idle-leaderboard-terminal">
                    ${usersHtml}
                </div>
            </div>
        `;
    }

    /**
     * Renderiza pantalla de trending (palabras y emotes populares)
     * @private
     */
    _renderTrendingScreen(screenData) {
        const { data } = screenData;
        const { topWords, topEmotes, totalEmotes, uniqueWords } = data;

        // Generar HTML para palabras trending
        let wordsHtml = '';
        if (topWords && topWords.length > 0) {
            topWords.forEach((item, index) => {
                const isFirst = index === 0;
                wordsHtml += `
                    <div class="idle-trending-word ${isFirst ? 'trending-top' : ''}">
                        <span class="trending-rank">#${index + 1}</span>
                        <span class="trending-word-text">${item.word.toUpperCase()}</span>
                        <span class="trending-count">${item.count}x</span>
                    </div>
                `;
            });
        } else {
            wordsHtml = '<div class="idle-empty-state small">SIN PALABRAS AÚN</div>';
        }

        // Generar HTML para emotes trending
        let emotesHtml = '';
        if (topEmotes && topEmotes.length > 0) {
            topEmotes.forEach((item, index) => {
                const isFirst = index === 0;
                // Si tenemos URL del emote, mostrar imagen
                const emoteDisplay = item.url
                    ? `<img src="${item.url}" alt="${item.name}" class="trending-emote-img" />`
                    : `<span class="trending-emote-name">${item.name}</span>`;

                const providerBadge = item.provider && item.provider !== 'twitch'
                    ? `<span class="trending-provider">${item.provider.toUpperCase()}</span>`
                    : '';

                emotesHtml += `
                    <div class="idle-trending-emote ${isFirst ? 'trending-top' : ''}">
                        <span class="trending-rank">#${index + 1}</span>
                        ${emoteDisplay}
                        ${providerBadge}
                        <span class="trending-count">${item.count}x</span>
                    </div>
                `;
            });
        } else {
            emotesHtml = '<div class="idle-empty-state small">SIN EMOTES AÚN</div>';
        }

        this._currentScreenContent.innerHTML = `
            <div class="idle-terminal">
                <div class="idle-terminal-header">
                    <span class="idle-terminal-prompt">></span>
                    <span class="idle-terminal-title">TRENDING_DATA</span>
                    <span class="idle-terminal-separator"></span>
                </div>
                <div class="idle-terminal-body idle-trending-body">
                    <div class="idle-trending-section">
                        <div class="idle-trending-section-header">
                            <span class="trending-section-icon">></span>
                            <span class="trending-section-title">PALABRAS</span>
                            <span class="trending-section-count">${uniqueWords} únicas</span>
                        </div>
                        <div class="idle-trending-list">
                            ${wordsHtml}
                        </div>
                    </div>
                    <div class="idle-trending-divider"></div>
                    <div class="idle-trending-section">
                        <div class="idle-trending-section-header">
                            <span class="trending-section-icon">></span>
                            <span class="trending-section-title">EMOTES</span>
                            <span class="trending-section-count">${totalEmotes} usados</span>
                        </div>
                        <div class="idle-trending-list">
                            ${emotesHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza pantalla de logros y level-ups con estilo terminal
     * @private
     */
    _renderAchievementsScreen(screenData) {
        const { data } = screenData;

        let recentHtml = '';
        if (data.recent && data.recent.length > 0) {
            data.recent.forEach(levelUp => {
                recentHtml += `
                    <div class="idle-levelup-line">
                        <span class="idle-levelup-prompt">></span>
                        <span class="idle-levelup-user">${levelUp.username}</span>
                        <span class="idle-levelup-arrow">-></span>
                        <span class="idle-levelup-level">LVL ${levelUp.newLevel}</span>
                    </div>
                `;
            });
        } else {
            recentHtml = '<div class="idle-empty-state small">SIN SUBIDAS DE NIVEL</div>';
        }

        this._currentScreenContent.innerHTML = `
            <div class="idle-terminal">
                <div class="idle-terminal-header">
                    <span class="idle-terminal-prompt">></span>
                    <span class="idle-terminal-title">PROGRESO_HOY</span>
                    <span class="idle-terminal-separator"></span>
                </div>
                <div class="idle-terminal-body">
                    <div class="idle-progress-stats">
                        <div class="idle-progress-box">
                            <span class="idle-progress-num">${data.levelUps}</span>
                            <div class="idle-progress-label">NIVELES</div>
                        </div>
                        <div class="idle-progress-box">
                            <span class="idle-progress-num">${data.achievements}</span>
                            <div class="idle-progress-label">LOGROS</div>
                        </div>
                    </div>
                    <div class="idle-recent-header">ULTIMOS LEVEL-UPS</div>
                    ${recentHtml}
                </div>
            </div>
        `;
    }

    /**
     * Renderiza pantalla de rachas con estilo terminal
     * @private
     */
    _renderStreaksScreen(screenData) {
        const { data } = screenData;

        let streakContent = '';
        if (data.highestStreak) {
            streakContent = `
                <div class="idle-streak-display">
                    <div class="idle-streak-big">${data.highestStreak.days}</div>
                    <div class="idle-streak-unit">DIAS</div>
                    <div class="idle-streak-owner">${data.highestStreak.username}</div>
                </div>
            `;
        } else {
            streakContent = '<div class="idle-empty-state">SIN RACHAS ACTIVAS</div>';
        }

        this._currentScreenContent.innerHTML = `
            <div class="idle-terminal">
                <div class="idle-terminal-header">
                    <span class="idle-terminal-prompt">></span>
                    <span class="idle-terminal-title">RACHA_MAXIMA</span>
                    <span class="idle-terminal-separator"></span>
                </div>
                <div class="idle-terminal-body">
                    ${streakContent}
                    <div class="idle-streak-total">${data.totalActive} RACHAS ACTIVAS</div>
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
