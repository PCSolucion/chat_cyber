import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import IdleScreenRenderer from './IdleScreenRenderer.js';
import IdleDataOrchestrator from './IdleDataOrchestrator.js';

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

        // Renderer delegado
        this.renderer = new IdleScreenRenderer(sessionStatsService);
        
        // Orquestador de datos delegado
        this.orchestrator = new IdleDataOrchestrator(sessionStatsService);

        // Configuración de idle
        this.idleTimeoutMs = config.IDLE_TIMEOUT_MS || 30000;  // 30 segundos sin actividad
        this.screenRotationMs = config.IDLE_ROTATION_MS || 12000;  // 12 segundos por pantalla
        this.totalScreensInCycle = 9;  // Número de pantallas diferentes en el ciclo (actualizado dinámicamente)
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
     * Configura los listeners de eventos
     * @private
     */
    _setupEventListeners() {
        // Escuchar actividad de usuarios para salir de modo idle
        EventManager.on(EVENTS.USER.ACTIVITY, () => {
            this.onActivity();
        });
        // Escuchar cuando se oculta el mensaje para entrar en idle inmediatamente
        EventManager.on(EVENTS.UI.MESSAGE_HIDDEN, () => {
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
        const currentScreenData = this.orchestrator.getData(this.currentCycleIndex);

        // Calcular delay dinámico delegando al renderer
        const delay = this.renderer.calculateScreenDuration(currentScreenData, this.screenRotationMs);

        this.rotationInterval = setTimeout(() => {
            if (!this.isIdle) return;

            this.currentCycleIndex++;
            this.screensShown++;

            // Verificar si hemos completado los ciclos máximos
            const totalScreens = currentScreenData.totalScreens || 9;
            const maxScreens = totalScreens * this.maxCycles;

            if (this.screensShown >= maxScreens) {
                this._hideAfterCycles();
                return;
            }

            this._updateIdleDisplay();
            this._scheduleNextRotation();

        }, delay);
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
            clearTimeout(this.rotationInterval);
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

        const screenData = this.orchestrator.getData(this.currentCycleIndex);

        // Delegar el renderizado al renderer especializado
        this.renderer.render(screenData, this.idleContainer);

        // Añadir clase de animación al contenedor principal para la transición entre pantallas
        this.idleContainer.classList.add('idle-screen-enter');
        setTimeout(() => {
            this.idleContainer.classList.remove('idle-screen-enter');
        }, 500);
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
            clearTimeout(this.rotationInterval);
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
