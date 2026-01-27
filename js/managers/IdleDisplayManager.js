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
            container.classList.remove('takeru-bg'); // Limpiar fondo personalizado de Takeru al entrar en modo idle
            container.classList.remove('x1lenz-bg');
            container.classList.remove('chandalf-bg');
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
            usernameEl.textContent = 'ESTADÍSTICAS DEL DIRECTO';
            usernameEl.setAttribute('data-text', 'ESTADÍSTICAS DEL DIRECTO');
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
    /**
     * Renderiza pantalla de resumen con estilo moderno (Dashboard)
     * @private
     */
    _renderSummaryScreen(screenData) {
        const { data } = screenData;

        // Obtener hora de inicio formateada
        const startTime = new Date(this.statsService.sessionStart);
        const startTimeStr = startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        this._currentScreenContent.innerHTML = `
            <div class="idle-screen-title">RESUMEN DE SESIÓN</div>
            <div class="idle-dashboard-grid">
                <div class="stat-card">
                    <div class="stat-icon timer-icon"></div>
                    <div class="stat-value">${data.duration}</div>
                    <div class="stat-label">TIEMPO</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon msg-icon"></div>
                    <div class="stat-value mobile-highlight">${data.messages}</div>
                    <div class="stat-label">MENSAJES</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon user-icon"></div>
                    <div class="stat-value">${data.users}</div>
                    <div class="stat-label">USUARIOS</div>
                </div>
                <div class="stat-card highlight-card">
                    <div class="stat-icon speed-icon"></div>
                    <div class="stat-value cyan-glow">${data.avgMpm}</div>
                    <div class="stat-label">MSG/MIN</div>
                </div>
            </div>
            <div class="idle-footer-info">
                <span class="pulse-dot"></span> INICIO: ${startTimeStr}h
            </div>
        `;
    }

    /**
     * Renderiza pantalla de leaderboard con estilo terminal
     * @private
     */
    /**
     * Renderiza pantalla de leaderboard con estilo lista moderna
     * @private
     */
    _renderLeaderboardScreen(screenData) {
        // Aseguramos mostrar al menos 15 usuarios si hay datos disponibles
        // screenData.data viene del SessionStatsService, verifiquemos que traiga suficientes
        const allUsers = screenData.data || [];
        // Tomar hasta 20 para el scroll
        const users = allUsers.slice(0, 20);

        let usersHtml = '';
        users.forEach((user, index) => {
            const rankClass = index === 0 ? 'top-1' : index < 3 ? 'top-3' : '';
            usersHtml += `
                <div class="modern-list-item ${rankClass}">
                    <div class="list-rank">#${index + 1}</div>
                    <div class="list-content">
                        <span class="list-name">${user.username}</span>
                        <span class="list-sub">NIVEL ${user.level}</span>
                    </div>
                    <div class="list-stat">
                        <span class="stat-num">${user.messages}</span>
                        <span class="stat-unit">msg</span>
                    </div>
                </div>
            `;
        });

        if (users.length === 0) {
            usersHtml = '<div class="empty-message">ESPERANDO ACTIVIDAD...</div>';
        }

        // Wrapper for animation
        // Solo animar si hay más de 5 usuarios (que es lo que cabe aprox sin scroll)
        const shouldScroll = users.length > 5;
        const animationDuration = Math.max(10, users.length * 2.5); // Min 10s, 2.5s per item

        const content = `
            <div class="idle-list-scroll-wrapper ${shouldScroll ? 'animate-scroll' : ''}" style="animation-duration: ${animationDuration}s">
                ${usersHtml}
            </div>
        `;

        this._currentScreenContent.innerHTML = `
            <div class="idle-screen-title">TOP ACTIVOS (${users.length})</div>
            <div class="idle-list-container">
                ${content}
            </div>
        `;
    }

    /**
     * Renderiza pantalla de trending (palabras y emotes populares)
     * @private
     */
    /**
     * Renderiza pantalla de trending (palabras y emotes populares)
     * @private
     */
    _renderTrendingScreen(screenData) {
        const { data } = screenData;
        const { topWords, topEmotes, totalEmotes, uniqueWords } = data;

        // PALABRAS
        let wordsHtml = '';
        if (topWords && topWords.length > 0) {
            // Tomamos solo top 3 para que quepa bien
            topWords.slice(0, 3).forEach((item, index) => {
                const percent = Math.min(100, (item.count / (topWords[0].count || 1)) * 100);
                wordsHtml += `
                    <div class="trend-item">
                        <div class="trend-info">
                            <span class="trend-name">${item.word.toUpperCase()}</span>
                            <span class="trend-count">${item.count}</span>
                        </div>
                        <div class="trend-bar-bg"><div class="trend-bar-fill" style="width: ${percent}%"></div></div>
                    </div>
                `;
            });
        } else {
            wordsHtml = '<div class="empty-message small">---</div>';
        }

        // EMOTES
        let emotesHtml = '';
        if (topEmotes && topEmotes.length > 0) {
            // Tomamos solo top 3
            topEmotes.slice(0, 3).forEach((item, index) => {
                const percent = Math.min(100, (item.count / (topEmotes[0].count || 1)) * 100);
                const emoteDisplay = item.url
                    ? `<img src="${item.url}" alt="${item.name}" class="mini-emote" />`
                    : `<span class="mini-emote-text">${item.name}</span>`;

                emotesHtml += `
                    <div class="trend-item">
                        <div class="trend-info">
                            <div class="trend-name-flex">${emoteDisplay}</div>
                            <span class="trend-count">${item.count}</span>
                        </div>
                        <div class="trend-bar-bg"><div class="trend-bar-fill fill-cyan" style="width: ${percent}%"></div></div>
                    </div>
                `;
            });
        } else {
            emotesHtml = '<div class="empty-message small">---</div>';
        }

        this._currentScreenContent.innerHTML = `
            <div class="idle-screen-title">TENDENCIAS</div>
            <div class="idle-split-view">
                <div class="split-col">
                    <div class="col-header">PALABRAS <span class="col-count">(${uniqueWords})</span></div>
                    <div class="col-list">${wordsHtml}</div>
                </div>
                <div class="split-divider"></div>
                <div class="split-col">
                    <div class="col-header">EMOTES <span class="col-count">(${totalEmotes})</span></div>
                    <div class="col-list">${emotesHtml}</div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza pantalla de logros y level-ups con estilo terminal
     * @private
     */
    /**
     * Renderiza pantalla de logros y level-ups con estilo limpio
     * @private
     */
    _renderAchievementsScreen(screenData) {
        const { data } = screenData;

        let recentHtml = '';
        if (data.recent && data.recent.length > 0) {
            data.recent.slice(0, 3).forEach(levelUp => {
                recentHtml += `
                    <div class="recent-levelup-item">
                        <span class="levelup-user">${levelUp.username}</span>
                        <div class="levelup-badge">LVL ${levelUp.newLevel}</div>
                    </div>
                `;
            });
        } else {
            recentHtml = '<div class="empty-message small">NINGUNO RECIENTEMENTE</div>';
        }

        this._currentScreenContent.innerHTML = `
            <div class="idle-screen-title">PROGRESO GLOBAL</div>
            <div class="idle-stats-row">
                <div class="big-stat-box">
                    <span class="big-stat-num">${data.levelUps}</span>
                    <span class="big-stat-label">NIVELES</span>
                </div>
                <div class="big-stat-box">
                    <span class="big-stat-num">${data.achievements}</span>
                    <span class="big-stat-label">LOGROS</span>
                </div>
            </div>
            <div class="recent-section">
                <div class="section-label">ÚLTIMOS ASCENSOS</div>
                ${recentHtml}
            </div>
        `;
    }

    /**
     * Renderiza pantalla de rachas con estilo terminal
     * @private
     */
    /**
     * Renderiza pantalla de rachas - diseño Hero
     * @private
     */
    _renderStreaksScreen(screenData) {
        const { data } = screenData;

        let streakContent = '';
        if (data.highestStreak) {
            streakContent = `
                <div class="hero-streak-card">
                    <div class="streak-days">${data.highestStreak.days}</div>
                    <div class="streak-label">DÍAS CONSECUTIVOS</div>
                    <div class="streak-owner-badge">
                         ${data.highestStreak.username}
                    </div>
                </div>
            `;
        } else {
            streakContent = '<div class="empty-message">SIN RACHAS AUN</div>';
        }

        this._currentScreenContent.innerHTML = `
            <div class="idle-screen-title">MAYOR RACHA</div>
            <div class="idle-hero-container">
                ${streakContent}
                <div class="sub-stat">
                    <span class="highlight">${data.totalActive}</span> RACHAS ACTIVAS
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
