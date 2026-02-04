import EventManager from '../utils/EventEmitter.js';

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
export default class IdleDisplayManager {
    constructor(config, sessionStatsService, uiManager) {
        this.config = config;
        this.statsService = sessionStatsService;
        this.uiManager = uiManager;

        // Configuración de idle
        this.idleTimeoutMs = config.IDLE_TIMEOUT_MS || 30000;  // 30 segundos sin actividad
        this.screenRotationMs = config.IDLE_ROTATION_MS || 12000;  // 12 segundos por pantalla
        this.totalScreensInCycle = 5;  // Número de pantallas diferentes en el ciclo
        this.maxCycles = 2;  // Número de ciclos completos antes de ocultar

        // Estado
        this.isIdle = false;
        this.idleTimeout = null;
        this.rotationInterval = null;
        this.currentCycleIndex = 0;
        this.screensShown = 0;  // Contador de pantallas mostradas
        this.lastMessageTime = Date.now();
        this.isHiddenAfterCycles = false;  // Flag para saber si está oculto tras completar ciclos

        // Referencias DOM (se crearán dinámicamente)
        this.idleContainer = null;

        // Inicializar
        this._createIdleContainer();
        this._setupEventListeners();
    }

    /**
     * Anima un valor numérico contando hacia arriba
     * @private
     */
    _animateValue(elementId, start, end, duration) {
        const obj = document.getElementById(elementId);
        if (!obj) return;
        
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Easing easeOutExpo
            const ease = (progress === 1) ? 1 : 1 - Math.pow(2, -10 * progress);
            
            obj.textContent = Math.floor(ease * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                 obj.textContent = end; // Ensure final value
            }
        };
        window.requestAnimationFrame(step);
    }

    /**
     * Configura los listeners de eventos
     * @private
     */
    _setupEventListeners() {
        // Escuchar actividad de usuarios para salir de modo idle
        EventManager.on('user:activity', () => {
            this.onActivity();
        });

        // Escuchar cuando se oculta el mensaje para entrar en idle inmediatamente
        EventManager.on('ui:messageHidden', () => {
            this._forceIdleMode();
        });
    }

    /**
     * Fuerza la entrada al modo idle inmediatamente
     * @private
     */
    _forceIdleMode() {
        // Si ya estamos idle, nada que hacer
        if (this.isIdle) return;

        console.log('⚡ Forcing idle mode immediately');
        
        // Limpiar timer de espera normal
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
            this.idleTimeout = null;
        }
        
        // Entrar en modo idle
        this._enterIdleMode();
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

        // Si estaba oculto después de completar ciclos, mostrar de nuevo
        if (this.isHiddenAfterCycles) {
            this._showWidgetAfterHidden();
        }

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
        this.screensShown = 0;  // Resetear contador de pantallas

        console.log('💤 Entering idle mode - showing stats');

        // Asegurar que el widget está visible
        const container = document.querySelector('.container');
        if (container) {
            container.classList.remove('hidden');
            container.classList.add('idle-mode');
            container.classList.remove('gold-mode-active'); // Ensure Gold Mode is OFF in idle
            container.classList.remove('takeru-bg'); // Limpiar fondo personalizado de Takeru al entrar en modo idle
            container.classList.remove('x1lenz-bg');
            container.classList.remove('chandalf-bg');
            container.classList.remove('manguerazo-bg');
            container.classList.remove('duckcris-bg');
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

        // Iniciar visualización real inmediatamente (sin secuencia de arranque)
        this._updateIdleDisplay();

        // Iniciar rotación (usamos setTimeout recursivo para permitir tiempos variables)
        this._scheduleNextRotation();
    }

    /**
     * Programa la siguiente rotación de pantalla
     * @private
     */
    _scheduleNextRotation() {
        if (this.rotationInterval) clearTimeout(this.rotationInterval);

        // Obtener la pantalla actual para determinar cuánto tiempo mostrarla
        // NOTA: currentCycleIndex ya se ha incrementado o es el inicial
        const currentScreenData = this.statsService.getIdleDisplayData(this.currentCycleIndex);

        // Calcular delay dinámico
        const delay = this._calculateScreenDuration(currentScreenData);

        // Log para depuración
        // console.log(`⏱️ Next rotation in ${delay}ms for screen ${currentScreenData.type}`);

        this.rotationInterval = setTimeout(() => {
            if (!this.isIdle) return;

            this.currentCycleIndex++;
            this.screensShown++;

            // Verificar si hemos completado los ciclos máximos
            // NOTA: totalScreensInCycle en SessionStatsService son 7 ahora
            const maxScreens = (this.statsService.getIdleDisplayData(0).totalScreens || 7) * this.maxCycles;

            // Hardcode 7 como fallback seguro si no podemos obtenerlo dinámicamente fácil
            if (this.screensShown >= (7 * this.maxCycles)) {
                this._hideAfterCycles();
                return;
            }

            this._updateIdleDisplay();
            this._scheduleNextRotation();

        }, delay);
    }
    
    /**
     * Calcula la duración óptima para una pantalla basada en su contenido
     * @private
     */
    _calculateScreenDuration(screenData) {
        let duration = this.screenRotationMs;

        // Si es una lista con scroll, calcular tiempo basado en items
        if (['leaderboard', 'top_subscribers', 'watchtime_total', 'watchtime_session'].includes(screenData.type)) {
            const itemCount = (screenData.data || []).length;
            
            // Si hay scroll (más de 5 items)
            if (itemCount > 5) {
                // El CSS de autoScroll tarda aprox 2s por item extra o tiene una duración fija
                // En idle-stats.css definimos scrollUpList a 15s.
                // Lo ideal es sincronizar con esa animación o dar tiempo suficiente.
                
                // Cálculo: Tiempo base + tiempo por item extra
                // Damos 3 segundos por item para asegurar lectura cómoda
                const calculatedTime = Math.max(duration, itemCount * 2500);
                
                // Cap a un máximo razonable (ej. 45s) para no aburrir
                duration = Math.min(calculatedTime, 45000);
                
                // Si es Top Subscribers, ser un poco más generosos
                if (screenData.type === 'top_subscribers') {
                    duration = Math.max(duration, 20000); // Mínimo 20s para subs si hay lista
                }
            }
        }

        return duration;
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
            clearTimeout(this.rotationInterval);
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
     * Oculta el widget después de completar los ciclos máximos
     * @private
     */
    _hideAfterCycles() {
        console.log('💤 Hiding widget after completing max cycles');

        this.isHiddenAfterCycles = true;

        // Detener rotación
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
            this.rotationInterval = null;
        }

        // Ocultar el widget completamente
        const container = document.querySelector('.container');
        if (container) {
            container.classList.add('hidden');
            container.classList.remove('idle-mode');
        }

        // Ocultar container de idle
        if (this.idleContainer) {
            this.idleContainer.style.display = 'none';
        }

        // Mantener isIdle en true para que no se reinicie el timer
        // hasta que llegue un nuevo mensaje
    }

    /**
     * Muestra el widget de nuevo cuando llega un mensaje después de estar oculto
     * @private
     */
    _showWidgetAfterHidden() {
        console.log('🔔 Showing widget again after new message');

        this.isHiddenAfterCycles = false;
        this.screensShown = 0;  // Resetear contador

        // Mostrar el widget
        const container = document.querySelector('.container');
        if (container) {
            container.classList.remove('hidden');
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
            case 'watchtime_session':
            case 'watchtime_total':
                this._renderWatchTimeList(screenData);
                break;
            case 'last_achievement':
                this._renderLastAchievementScreen(screenData);
                break;
            case 'top_subscribers':
                this._renderTopSubsScreen(screenData);
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
     * Renderiza pantalla de Top Tiempo de Visualización
     * @private
     */
    /**
     * Renderiza pantalla de Watch Time como lista (estilo Leaderboard)
     * @private
     */
    _renderWatchTimeList(screenData) {
        const users = screenData.data || [];
        const title = screenData.title || 'TIEMPO DE VISUALIZACIÓN';

        let usersHtml = '';
        users.forEach((user, index) => {
            const rankClass = index === 0 ? 'top-1' : index < 3 ? 'top-3' : '';
            // Stagger delay based on index (max 10 items to prevent huge delays)
            // Manual delay calculation for finer control
            const delayStyle = `animation-delay: ${index * 0.3}s`; // Halved from 0.6s
            const delayClass = 'animate-hidden animate-in';
            
            usersHtml += `
                <div class="modern-list-item ${rankClass} ${delayClass}" style="${delayStyle}">
                    <div class="list-rank">#${index + 1}</div>
                    <div class="list-content">
                        <span class="list-name">${user.username}</span>
                    </div>
                    <div class="list-stat">
                        <span class="stat-num tabular-nums" style="color: var(--cyber-cyan);">${user.formatted}</span>
                    </div>
                </div>
            `;
        });

        if (users.length === 0) {
            usersHtml = '<div class="empty-message animate-hidden animate-in">ESPERANDO DATOS...</div>';
        }


        // Wrapper for animation scroll
        const shouldScroll = users.length > 5;
        const scrollDuration = this._calculateScreenDuration(screenData) / 1000;

        const content = `
            <div class="idle-list-scroll-wrapper ${shouldScroll ? 'animate-scroll' : ''}" 
                 style="${shouldScroll ? `animation-duration: ${scrollDuration}s;` : ''}">
                ${usersHtml}
            </div>
        `;

        this._currentScreenContent.innerHTML = `
            <div class="idle-screen-title wide-spacing animate-hidden animate-in">${title}</div>
            <div class="idle-list-container">
                ${content}
            </div>
        `;
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
            <div class="idle-screen-title wide-spacing animate-hidden animate-in">RESUMEN DE SESIÓN</div>
            
            <!-- Fila Superior: 3 Estadísticas -->
            <div class="idle-dashboard-top-row">
                <div class="stat-card mini-stat animate-hidden animate-in delay-1">
                    <div class="stat-icon timer-icon"></div>
                    <div class="stat-info">
                        <div class="stat-value small tabular-nums">${data.duration}</div>
                        <div class="stat-label">TIEMPO</div>
                    </div>
                </div>
                <div class="stat-card mini-stat animate-hidden animate-in delay-2">
                    <div class="stat-icon msg-icon"></div>
                    <div class="stat-info">
                        <div class="stat-value small mobile-highlight tabular-nums" id="stat-msgs">0</div>
                        <div class="stat-label">MSGS</div>
                    </div>
                </div>
                <div class="stat-card mini-stat animate-hidden animate-in delay-3">
                    <div class="stat-icon user-icon"></div>
                    <div class="stat-info">
                        <div class="stat-value small tabular-nums" id="stat-users">0</div>
                        <div class="stat-label">USERS</div>
                    </div>
                </div>
            </div>

            <!-- Fila Inferior: Speedometer MSG/MIN -->
            <div class="stat-card full-width-hero animate-hidden animate-in delay-4">
                <div class="speedometer-wrapper">
                    <div class="speedometer-gauge">
                        <div class="gauge-bg"></div>
                        <div class="gauge-fill" id="gauge-needle" style="transform: rotate(0deg)"></div>
                        <div class="gauge-cover">
                            <div class="gauge-value-text cyan-glow tabular-nums" id="stat-mpm">${data.avgMpm}</div>
                            <div class="gauge-label-text">MSG/MIN</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="idle-footer-info animate-hidden animate-in delay-5">
                <span class="pulse-dot"></span> INICIO: ${startTimeStr}h
            </div>
        `;

        // Wait for screen fade-in (500ms) before starting animations
        setTimeout(() => {
            // Animate Numbers (Slower to match needle)
            this._animateValue('stat-msgs', 0, parseInt(data.messages) || 0, 2500);
            this._animateValue('stat-users', 0, parseInt(data.users) || 0, 2500);
            
            // Animate Needle
            const targetRotation = Math.min(180, (parseFloat(data.avgMpm) || 0) * 18);
            const needle = document.getElementById('gauge-needle');
            if (needle) {
                // Sutil rebote antes de ir a su posición (opcional, pero queda premium)
                needle.style.transform = `rotate(${targetRotation}deg)`;
            }
        }, 800);
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
            // Stagger animations
            const delayClass = index < 10 ? `animate-hidden animate-in` : 'animate-hidden animate-in';
            const delayStyle = `animation-delay: ${index * 0.3}s`; // Faster stagger (0.3s)
            
            usersHtml += `
                <div class="modern-list-item ${rankClass} ${delayClass}" style="${delayStyle}">
                    <div class="list-rank">#${index + 1}</div>
                    <div class="list-content">
                        <span class="list-name">${user.username}</span>
                        <span class="list-sub tabular-nums">NIVEL ${user.level}</span>
                    </div>
                    <div class="list-stat">
                        <span class="stat-num tabular-nums">${user.messages}</span>
                        <span class="stat-unit">msg</span>
                    </div>
                </div>
            `;
        });

        if (users.length === 0) {
            usersHtml = '<div class="empty-message animate-hidden animate-in">ESPERANDO ACTIVIDAD...</div>';
        }

        // Wrapper for animation 
        const shouldScroll = users.length > 5;
        const scrollDuration = this._calculateScreenDuration(screenData) / 1000;

        const content = `
            <div class="idle-list-scroll-wrapper ${shouldScroll ? 'animate-scroll' : ''}" 
                 style="${shouldScroll ? `animation-duration: ${scrollDuration}s;` : ''}">
                ${usersHtml}
            </div>
        `;

        this._currentScreenContent.innerHTML = `
            <div class="idle-screen-title wide-spacing animate-hidden animate-in">TOP ACTIVOS (${users.length})</div>
            <div class="idle-list-container">
                ${content}
            </div>
        `;
    }

    /**
     * Renderiza pantalla de Top Suscriptores
     * @private
     */
    _renderTopSubsScreen(screenData) {
        const users = screenData.data || [];
        
        let usersHtml = '';
        users.forEach((user, index) => {
            const rankClass = index === 0 ? 'top-1' : index < 3 ? 'top-3' : '';
            const delayClass = index < 10 ? `animate-hidden animate-in` : 'animate-hidden animate-in';
            const delayStyle = `animation-delay: ${index * 0.25}s`; // Slower stagger for subs
            
            // Icono de corona o medalla para el top
            let rankIcon = '';
            // if (index === 0) rankIcon = '👑 '; // Ya se distingue por color
            // else if (index === 1) rankIcon = '🥈 ';
            // else if (index === 2) rankIcon = '🥉 ';

            usersHtml += `
                <div class="modern-list-item ${rankClass} ${delayClass}" style="${delayStyle}">
                    <div class="list-rank">${rankIcon}#${index + 1}</div>
                    <div class="list-content">
                        <span class="list-name" style="${index === 0 ? 'color: #ffd700;' : ''}">${user.username}</span>
                        <span class="list-sub tabular-nums">NIVEL ${user.level}</span>
                    </div>
                    <div class="list-stat">
                        <span class="stat-num tabular-nums" style="color: #ffd700;">${user.months}</span>
                        <span class="stat-unit" style="color: #aa771c;">meses</span>
                    </div>
                </div>
            `;
        });

        if (users.length === 0) {
            usersHtml = '<div class="empty-message animate-hidden animate-in">SIN EXPERTOS EN RED AUN</div>';
        }

        const shouldScroll = users.length > 5;
        const scrollDuration = this._calculateScreenDuration(screenData) / 1000;

        const content = `
            <div class="idle-list-scroll-wrapper ${shouldScroll ? 'animate-scroll' : ''}" 
                 style="${shouldScroll ? `animation-duration: ${scrollDuration}s;` : ''}">
                ${usersHtml}
            </div>
        `;

        this._currentScreenContent.innerHTML = `
            <div class="idle-screen-title wide-spacing animate-hidden animate-in" style="border-bottom-color: #ffd700;">TOP SUSCRIPTORES</div>
            <div class="idle-list-container">
                ${content}
            </div>
        `;
    }

    /**
     * Renderiza pantalla de trending (solo emotes populares)
     * @private
     */
    _renderTrendingScreen(screenData) {
        const { data } = screenData;
        const { topEmotes, totalEmotes } = data;

        // EMOTES - Mostrar hasta 5 emotes
        let emotesHtml = '';
        if (topEmotes && topEmotes.length > 0) {
            // Tomamos hasta 5 emotes
            topEmotes.slice(0, 5).forEach((item, index) => {
                const percent = Math.min(100, (item.count / (topEmotes[0].count || 1)) * 100);
                const emoteDisplay = item.url
                    ? `<img src="${item.url}" alt="${item.name}" class="trending-emote-img" />`
                    : `<span class="trending-emote-text">${item.name}</span>`;

                // Stagger delay
                const delayClass = `animate-hidden animate-in delay-${Math.min(index + 1, 5)}`;

                emotesHtml += `
                    <div class="trending-emote-item ${delayClass}">
                        <div class="trending-emote-display">${emoteDisplay}</div>
                        <div class="trending-emote-info">
                            <span class="trending-emote-name">${item.name}</span>
                            <span class="trending-emote-count tabular-nums">${item.count}x</span>
                        </div>
                        <div class="trend-bar-bg"><div class="trend-bar-fill fill-cyan" style="width: ${percent}%"></div></div>
                    </div>
                `;
            });
        } else {
            emotesHtml = '<div class="empty-message animate-hidden animate-in">SIN EMOTES AÚN</div>';
        }

        this._currentScreenContent.innerHTML = `
            <div class="idle-screen-title wide-spacing animate-hidden animate-in">EMOTES MÁS USADOS</div>
            <div class="trending-emotes-container">
                ${emotesHtml}
            </div>
            <div class="idle-footer-info animate-hidden animate-in delay-5">
                <span class="pulse-dot"></span> TOTAL: <span class="tabular-nums">${totalEmotes}</span> emotes
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
                <div class="big-stat-box animate-hidden animate-in delay-2">
                    <span class="big-stat-num tabular-nums" id="stat-levels">${data.levelUps}</span>
                    <span class="big-stat-label">NIVELES</span>
                </div>
                <div class="big-stat-box animate-hidden animate-in delay-3">
                    <span class="big-stat-num tabular-nums" id="stat-achievements">${data.achievements}</span>
                    <span class="big-stat-label">LOGROS</span>
                </div>
            </div>
            <div class="recent-section animate-hidden animate-in delay-4">
                <div class="section-label wide-spacing">ÚLTIMOS ASCENSOS</div>
                ${recentHtml}
            </div>
        `;

        // Animate count up
        this._animateValue('stat-levels', 0, parseInt(data.levelUps) || 0, 1500);
        this._animateValue('stat-achievements', 0, parseInt(data.achievements) || 0, 1500);
    }

    /**
     * Renderiza pantalla de rachas con estilo terminal
     * @private
     */
    /**
     * Renderiza pantalla del último logro desbloqueado
     * @private
     */
    _renderLastAchievementScreen(screenData) {
        const achievement = screenData.data;

        if (!achievement) {
             this._currentScreenContent.innerHTML = `
                <div class="idle-screen-title">ÚLTIMO LOGRO</div>
                <div class="empty-message">NADIE HA DESBLOQUEADO LOGROS AÚN</div>
            `;
            return;
        }

        const { username, achievement: achData, timestamp } = achievement;
        const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        this._currentScreenContent.innerHTML = `
            <div class="idle-screen-title">ÚLTIMO LOGRO DESBLOQUEADO</div>
            
            <div class="last-achievement-card">
                <div class="achievement-icon-wrapper">
                    <img src="${achData.image}" alt="${achData.name}" class="achievement-icon-large">
                    <div class="achievement-glow"></div>
                </div>
                <div class="achievement-details">
                    <div class="achievement-header">
                        <div class="achievement-name">${achData.name}</div>
                        <div class="achievement-rarity ${achData.rarity || 'common'}">${achData.rarity ? achData.rarity.toUpperCase() : 'COMÚN'}</div>
                    </div>
                    <div class="achievement-desc">${achData.description}</div>
                    
                    <div class="achievement-footer">
                        <div class="achievement-unlocker-info">
                             <div class="unlocker-label">DESBLOQUEADO POR</div>
                             <div class="unlocker-name">${username}</div>
                        </div>
                        <div class="achievement-time">
                            <span class="time-icon">🕒</span> ${timeStr}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza pantalla de rachas - diseño "Battle / Face Off"
     * @private
     */
    _renderStreaksScreen(screenData) {
        const { data } = screenData;
        const topStreaks = data.topStreaks || [];

        let streakContent = '';
        
        if (topStreaks.length >= 2) {
            // DISEÑO VS (BATTLE)
            const p1 = topStreaks[0];
            const p2 = topStreaks[1];
            
            streakContent = `
                <div class="streak-battle-container">
                    <div class="battle-side side-left animate-hidden animate-in delay-2">
                        <div class="battle-name">${p1.username}</div>
                        <div class="battle-days tabular-nums" id="stat-days-1">${p1.days}</div>
                        <div class="battle-label">DÍAS</div>
                    </div>
                    
                    <div class="vs-divider animate-hidden animate-in delay-3">VS</div>
                    
                    <div class="battle-side side-right animate-hidden animate-in delay-4">
                        <div class="battle-name">${p2.username}</div>
                        <div class="battle-days tabular-nums" id="stat-days-2">${p2.days}</div>
                        <div class="battle-label">DÍAS</div>
                    </div>
                </div>
            `;
        } else if (topStreaks.length === 1) {
            // DISEÑO HERO (UN SOLO LÍDER)
            const p1 = topStreaks[0];
            streakContent = `
                <div class="hero-streak-card animate-hidden animate-in delay-2">
                    <div class="streak-days tabular-nums" id="stat-days-1">${p1.days}</div>
                    <div class="streak-label wide-spacing">DÍAS CONSECUTIVOS</div>
                    <div class="streak-owner-badge">
                         ${p1.username}
                    </div>
                </div>
            `;
        } else {
            streakContent = '<div class="empty-message animate-hidden animate-in">SIN RACHAS ACTIVAS HOY</div>';
        }

        this._currentScreenContent.innerHTML = `
            <div class="idle-screen-title wide-spacing animate-hidden animate-in">FACE-OFF: RACHAS</div>
            <div class="idle-hero-container">
                ${streakContent}
                <div class="sub-stat animate-hidden animate-in delay-5">
                    <span class="highlight tabular-nums">${data.totalActive}</span> RACHAS ACTIVAS EN TOTAL
                </div>
            </div>
        `;
        
        // Animaciones de números
        if (topStreaks.length >= 1) {
             this._animateValue('stat-days-1', 0, parseInt(topStreaks[0].days) || 0, 1500);
        }
        if (topStreaks.length >= 2) {
             this._animateValue('stat-days-2', 0, parseInt(topStreaks[1].days) || 0, 1500);
        }
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
