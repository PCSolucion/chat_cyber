import EventManager from "../utils/EventEmitter.js";
import { EVENTS } from "../utils/EventTypes.js";
import { NOTIFICATIONS, XP } from "../constants/AppConstants.js";

/**
 * NotificationManager - Gestor de Notificaciones
 *
 * Responsabilidades:
 * - Gestionar cola de notificaciones (logros, level-ups, etc.)
 * - Controlar animaciones y tiempos de display
 * - Generar HTML de notificaciones
 * - Reproducir sonidos asociados
 *
 * Extraído de MessageProcessor para Single Responsibility Principle
 *
 * @class NotificationManager
 */
export default class NotificationManager {
  /**
   * Constructor del NotificationManager
   * @param {Object} config - Configuración global
   * @param {UIManager} uiManager - Referencia al UIManager para extender tiempos
   */
  constructor(config, uiManager = null) {
    this.config = config;
    this.uiManager = uiManager;

    // Cola de notificaciones
    this.queue = [];
    this.isShowingNotification = false;

    // Configuración de tiempos
    // Configuración de tiempos centralizada
    this.displayTime = NOTIFICATIONS.DISPLAY_TIME_MS;
    this.fadeTime = NOTIFICATIONS.FADE_TIME_MS;
    this.queueMaxSize = NOTIFICATIONS.QUEUE_MAX_SIZE;

    // Mapeo de rareza a iconos
    this.rarityIconMap = {
      common: "tier1.png",
      uncommon: "tier2.png",
      rare: "tier3.png",
      epic: "tier4.png",
      legendary: "tier5.png",
    };

    console.log("📢 NotificationManager initialized");
    this._setupEventListeners();
  }

  /**
   * Configura los listeners de eventos centralizados
   * @private
   */
  _setupEventListeners() {
    // Escuchar logros desbloqueados
    EventManager.on(EVENTS.USER.ACHIEVEMENT_UNLOCKED, (eventData) => {
      this.showAchievement(eventData);
    });

    // Escuchar progreso de "Bro"
    EventManager.on(EVENTS.USER.BRO_PROGRESS, ({ current, max }) => {
      this.showBroProgress(current, max);
    });

    // Escuchar level ups para mostrarlos también como notificación (opcional, pero mejora UX)
    EventManager.on(EVENTS.USER.LEVEL_UP, (eventData) => {
      // Podríamos añadir una notificación especial para level ups aquí si quisiéramos
      // Por ahora, el XPDisplayManager ya lo maneja de forma visual directa.
    });
  }

  /**
   * Configura la referencia al UIManager
   * (Útil si no se tiene al momento de construcción)
   * @param {UIManager} uiManager
   */
  setUIManager(uiManager) {
    this.uiManager = uiManager;
  }

  /**
   * Añade una notificación de logro a la cola
   * @param {Object} eventData - { username, achievement }
   */
  showAchievement(eventData) {
    if (this.queue.length >= this.queueMaxSize) {
      if (this.config.DEBUG) {
        console.log(
          `🏆 Cola llena, logro descartado: ${eventData.achievement.name}`,
        );
      }
      return;
    }

    this.queue.push({
      type: "achievement",
      data: eventData,
    });

    this._processQueue();
  }

  /**
   * Procesa la cola de notificaciones una a una
   * @private
   */
  _processQueue() {
    if (this.isShowingNotification || this.queue.length === 0) {
      return;
    }

    this.isShowingNotification = true;
    const notification = this.queue.shift();

    // Dispatch según tipo
    switch (notification.type) {
      case "achievement":
        // Mostramos ambas: la del widget y la de Xbox (que ahora es parte de la cola)
        this._displayAchievement(notification.data);
        this._displayTopOverlayAchievement(notification.data);
        break;
      default:
        console.warn("Unknown notification type:", notification.type);
        this.isShowingNotification = false;
        this._processQueue();
        return;
    }

    // El tiempo total de espera antes de permitir la siguiente notificación
    // Calculamos el tiempo base del Xbox Achievement (11s) ya que es el más largo
    const xboxDuration = 11000;
    const totalWaitTime = Math.max(this.displayTime + this.fadeTime, xboxDuration + 500);

    // Programar siguiente notificación
    setTimeout(() => {
      this.isShowingNotification = false;
      this._processQueue();
    }, totalWaitTime);
  }

  /**
   * Muestra una barra de progreso para el contador de "Bro"
   * @param {number} current - Contador actual
   * @param {number} max - Meta del siguiente logro
   */
  showBroProgress(current, max) {
    const container = document.getElementById("achievement-notifications");
    if (!container) return;

    // Crear elemento
    const notification = document.createElement("div");
    notification.className = "bro-notification";

    // Calcular porcentaje
    const percent = Math.min(100, Math.max(0, (current / max) * 100));

    notification.innerHTML = `
            <div class="bro-header">
                <div class="bro-title">
                    <span>👊 BRO COUNT</span>
                </div>
                <div class="bro-count">${current} / ${max}</div>
            </div>
            <div class="bro-progress-container">
                <div class="bro-progress-fill" style="width: 0%"></div>
            </div>
        `;

    container.appendChild(notification);

    // Animar barra
    requestAnimationFrame(() => {
      const fill = notification.querySelector(".bro-progress-fill");
      if (fill) fill.style.width = `${percent}%`;
    });

    // Extender tiempo widget
    if (this.uiManager) {
      this.uiManager.extendDisplayTime(
        NOTIFICATIONS.BRO_PROGRESS_DISPLAY_TIME_MS,
      );
    }

    // Remover después de 3-4 segundos
    setTimeout(() => {
      notification.classList.add("hiding");
      setTimeout(() => {
        if (notification.parentNode)
          notification.parentNode.removeChild(notification);
      }, 500);
    }, 3500);
  }

  /**
   * Muestra físicamente la notificación de logro
   * @private
   * @param {Object} eventData - { username, achievement }
   */
  _displayAchievement(eventData) {
    const { username, achievement } = eventData;
    const container = document.getElementById("achievement-notifications");

    if (!container) {
      console.warn("Achievement notifications container not found");
      return;
    }

    const notification = document.createElement("div");
    notification.className = "achievement-notification";
    notification.setAttribute("data-rarity", achievement.rarity);

    // Usamos la imagen del logro (que ya viene con default.png si no tiene específica)
    const imagePath = achievement.image || "img/logros/default.png";

    notification.innerHTML = `
            <div class="achievement-icon">
                <img src="${imagePath}" alt="Achievement Icon" onerror="this.onerror=null;this.src='img/logros/default.png';">
            </div>
            <div class="achievement-content">
                <div class="achievement-label">LOGRO DESBLOQUEADO</div>
                <div class="achievement-name"><span>${achievement.name}</span></div>
                <div class="achievement-desc"><span>${achievement.description} <span style="color: var(--cyber-cyan); opacity: 0.9;">[${achievement.condition}]</span></span></div>
            </div>
            <div class="achievement-timer"></div>
        `;

    // Añadir al container
    container.appendChild(notification);

    // Check for text overflow to enable marquee
    this._checkOverflow(notification);

    // Trigger animation
    requestAnimationFrame(() => {
      notification.classList.add("show");
    });

    // Extender tiempo del widget para que se vea el logro
    if (this.uiManager) {
      this.uiManager.extendDisplayTime(this.displayTime + 1000);
    }

    // Remover después del tiempo de display
    setTimeout(() => {
      notification.classList.remove("show");
      notification.classList.add("hiding");

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, this.fadeTime);
    }, this.displayTime);

    // Log para debug
    if (this.config.DEBUG) {
      console.log(
        `🏆 Achievement notification shown: ${username} -> ${achievement.name}`,
      );
    }

    // Play Sound (Del widget Cyberpunk)
    this._playAchievementSound();
  }

  /**
   * Muestra la notificación de logro en el overlay superior (Fuera del widget)
   * @private
   * @param {Object} eventData
   */
  _displayTopOverlayAchievement(eventData) {
    const overlay = document.getElementById("cp-achievement-overlay");
    if (!overlay) return;

    const { username, achievement } = eventData;
    const xpReward = XP.ACHIEVEMENT_REWARDS[achievement.rarity] || 50;
    
    // Forzamos que siempre sea la animación de logro raro (con diamante)
    const isRare = true;
    const unlockedText = `${username} ha desbloqueado el logro`;

    // Estructura estilo Xbox One (Refinada v3 con soporte de rareza siempre activo)
    overlay.innerHTML = `
      <div class="achievement ${isRare ? 'rare' : ''}">
        <div class="animation">
          <div class="circle">
            <div class="img trophy_animate trophy_img">
              <img class="trophy_1" src="img/trophy_full.svg" alt="Trophy"/>
              <img class="trophy_2" src="img/trophy_no_handles.svg" alt="Trophy"/>
            </div>
            <div class="img xbox_img">
              <img src="img/arasaka.png" alt="Arasaka"/>
            </div>
            <div class="brilliant-wrap">
              <div class="brilliant"></div>
            </div>
          </div>
          <div class="banner-outer">
            <div class="banner">
              <div class="achieve_disp">
                <span class="unlocked">${unlockedText}</span>
                <div class="score_disp">
                  <div class="gamerscore">
                    <img width="20px" src="img/G.svg" alt="G"/>
                    <span class="acheive_score">${xpReward}</span>
                  </div>
                  <span class="hyphen_sep">-</span>
                  <span class="achiev_name">${achievement.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const circle = overlay.querySelector('.circle');
    const banner = overlay.querySelector('.banner');
    const display = overlay.querySelector('.achieve_disp');

    // Reproducir sonido de logro raro
    this._playXboxSound();

    // Trigger show animation
    requestAnimationFrame(() => {
      overlay.classList.add("show");
      circle.classList.add("circle_animate");
      banner.classList.add("banner-animate");
      display.classList.add("achieve_disp_animate");
    });

    // Duración extendida para la animación completa del Codepen (10.5s)
    const animationDuration = 11000;

    // Hide after display time
    setTimeout(() => {
      overlay.classList.remove("show");
      
      // Cleanup
      setTimeout(() => {
        circle.classList.remove("circle_animate");
        banner.classList.remove("banner-animate");
        display.classList.remove("achieve_disp_animate");
        overlay.innerHTML = "";
      }, 1000);
    }, this.displayTime > animationDuration ? this.displayTime : animationDuration);
  }

  /**
   * Reproduce el sonido de logro raro de Xbox
   * @private
   */
  _playXboxSound() {
    const soundUrl = 'sounds/logro3.mp3';
    
    try {
      const audio = new Audio(soundUrl);
      audio.volume = 0.4;
      audio.play().catch(e => console.warn("Audio play failed:", e));
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  /**
   * Verifica overflow de texto para activar marquee
   * @private
   * @param {HTMLElement} notification
   */
  _checkOverflow(notification) {
    try {
      const nameSpan = notification.querySelector(".achievement-name span");
      const nameContainer = notification.querySelector(".achievement-name");
      if (
        nameSpan &&
        nameContainer &&
        nameSpan.scrollWidth > nameContainer.clientWidth
      ) {
        nameSpan.classList.add("marquee-active");
      }

      const descSpan = notification.querySelector(".achievement-desc > span");
      const descContainer = notification.querySelector(".achievement-desc");
      if (
        descSpan &&
        descContainer &&
        descSpan.scrollWidth > descContainer.clientWidth
      ) {
        descSpan.classList.add("marquee-active");
      }
    } catch (e) {
      console.warn("Error checking overflow:", e);
    }
  }

  /**
   * Reproduce el sonido de logro
   * @private
   */
  _playAchievementSound() {
    // Verificar si hay configuración de sonidos (asumiendo que podría estar en this.config)
    // Si no hay flag específica, reproducimos por defecto
    try {
        const audio = new Audio('sounds/logro2.mp3');
        audio.volume = 0.5; // Volumen moderado
        audio.play().catch(e => {
            // Ignorar errores de autoplay (comunes si no hubo interacción previa)
            if (this.config.DEBUG) console.warn('Sound play failed:', e);
        });
    } catch (e) {
        console.warn('Audio error:', e);
    }
  }

  /**
   * Limpia la cola de notificaciones
   */
  clearQueue() {
    this.queue = [];
    if (this.config.DEBUG) {
      console.log("📢 Notification queue cleared");
    }
  }

  /**
   * Obtiene el tamaño actual de la cola
   * @returns {number}
   */
  getQueueSize() {
    return this.queue.length;
  }
}
