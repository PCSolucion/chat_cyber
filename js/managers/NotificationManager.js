import EventManager from "../utils/EventEmitter.js";
import { EVENTS } from "../utils/EventTypes.js";
import { NOTIFICATIONS, XP } from "../constants/AppConstants.js";
import UIUtils from "../utils/UIUtils.js";
import FXManager from "../utils/FXManager.js";

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

    // Buffer para agrupar logros (Smart Batching)
    this.achievementBuffer = new Map(); // username -> [achievements]
    this.bufferTimers = new Map();      // username -> timeoutId
    this.BATCH_WINDOW_MS = 2000;        // Ventana de 2 segundos para agrupar

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
      if (this.config.DEBUG) {
        console.log(`[NotificationManager] Received Achievement Event:`, eventData);
      }
      this.showAchievement(eventData);
    });

    // Escuchar progreso de "Bro"
    EventManager.on(EVENTS.USER.BRO_PROGRESS, ({ current, max }) => {
      this.showBroProgress(current, max);
    });

    // Escuchar level ups para mostrarlos en la cola superior sin solaparse
    EventManager.on(EVENTS.USER.LEVEL_UP, (eventData) => {
      this.showLevelUp(eventData);
    });

    // Escuchar resultados de predicción
    EventManager.on(EVENTS.USER.PREDICTION_RESULT, (eventData) => {
      this.showPredictionResult(eventData);
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
   * Añade una notificación de logro a la cola de procesamiento (Bufferizado)
   * @param {Object} eventData - { username, achievement }
   */
  showAchievement(eventData) {
    const { username, achievement } = eventData;
    const lowerUser = username.toLowerCase();

    // 1. Inicializar buffer si no existe
    if (!this.achievementBuffer.has(lowerUser)) {
      this.achievementBuffer.set(lowerUser, []);
    }

    // 2. Añadir logro al buffer
    this.achievementBuffer.get(lowerUser).push(achievement);

    // 3. Gestionar timer de batch
    if (this.bufferTimers.has(lowerUser)) {
      // Ya hay un timer corriendo, el logro se procesará cuando termine.
      // Opcional: Reiniciar timer para extender ventana (debounce) -> No, mejor fixed window para no retrasar mucho.
      return;
    }

    // 4. Iniciar timer
    const timerId = setTimeout(() => {
      this._flushAchievementBuffer(lowerUser, username);
    }, this.BATCH_WINDOW_MS);

    this.bufferTimers.set(lowerUser, timerId);
  }

  /**
   * Procesa el buffer de logros de un usuario y lo envía a la cola real
   * @private
   */
  _flushAchievementBuffer(lowerKey, displayUsername) {
    const achievements = this.achievementBuffer.get(lowerKey);
    this.achievementBuffer.delete(lowerKey);
    this.bufferTimers.delete(lowerKey);

    if (!achievements || achievements.length === 0) return;

    if (this.queue.length >= this.queueMaxSize) {
      if (this.config.DEBUG) console.log(`🏆 Cola llena, batch de logros descartado para ${displayUsername}`);
      return;
    }

    // Encolar como batch
    if (this.config.DEBUG) {
      console.log(`[NotificationManager] Enqueuing achievement batch for ${displayUsername}:`, achievements.map(a => a.name));
    }
    this.queue.push({
      type: "achievement_batch",
      data: {
        username: displayUsername,
        achievements: achievements // Array de logros
      },
    });

    this._processQueue();
  }
 
  /**
   * Añade una notificación de level-up a la cola
   * @param {Object} eventData - { username, newLevel, title }
   */
  showLevelUp(eventData) {
    this.queue.push({
      type: "levelup",
      data: eventData,
    });
  
    this._processQueue();
  }

  /**
   * Añade una notificación de resultado de predicción a la cola
   * @param {Object} eventData - { username, xp, isWinner }
   */
  showPredictionResult(eventData) {
    console.log('📢 [NotificationManager] Received prediction result event:', eventData);
    this.queue.push({
      type: "prediction_result",
      data: eventData,
    });

    this._processQueue();
  }

  /**
   * Procesa la cola de notificaciones una a una
   * @private
   */
  _processQueue() {
    if (this.config.DEBUG && this.queue.length > 0) {
      console.log(`[Queue] Checking: isShowing=${this.isShowingNotification}, items=${this.queue.length}`);
    }

    if (this.isShowingNotification || this.queue.length === 0) {
      return;
    }

    this.isShowingNotification = true;
    const notification = this.queue.shift();

    // Dispatch según tipo
    let totalWaitTime = this.displayTime + this.fadeTime;

    switch (notification.type) {
      case "achievement_batch":
        // Maneja tanto singles como múltiples
        this._displayAchievementBatch(notification.data);
        this._displayTopOverlayAchievementBatch(notification.data);
        
        // Tiempo base del Xbox Achievement (11s) + margen
        totalWaitTime = Math.max(totalWaitTime, 11500);
        break;

      case "levelup":
        // Llamar al XPDisplayManager para mostrar ambos overlays
        if (this.uiManager && this.uiManager.xpDisplay) {
          this.uiManager.xpDisplay.showTopLevelUp(notification.data);
          this.uiManager.xpDisplay.showLevelUp(notification.data);
        }
        
        // Emitir evento para sincronizar sonido con la animación real
        EventManager.emit(EVENTS.UI.LEVEL_UP_DISPLAYED, notification.data);

        // Tiempo base del Level Up Overlay (6s) + margen
        totalWaitTime = 6500;
        break;

      case "prediction_result":
        this._displayPredictionResult(notification.data);
        totalWaitTime = 3500;
        break;

      default:
        console.warn("Unknown notification type:", notification.type);
        this.isShowingNotification = false;
        this._processQueue();
        return;
    }

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
   * Renderiza un batch de logros (Single o Múltiple) en el widget lateral
   */
  _displayAchievementBatch(data) {
    const { username, achievements } = data;
    
    // Caso simple: Solo 1 logro -> Usar diseño original
    if (achievements.length === 1) {
        if (this.config.DEBUG) console.log(`[NotificationManager] Single achievement batch, forwarding to _displayAchievement`);
        return this._displayAchievement({ username, achievement: achievements[0] });
    }

    if (this.config.DEBUG) console.log(`[NotificationManager] Displaying multiple achievement batch (count: ${achievements.length})`);

    // Caso múltiple: Diseño agrupado
    const container = document.getElementById("achievement-notifications");
    if (!container) return;

    const notification = document.createElement("div");
    // Usamos una clase especial para batches o reutilizamos la base
    notification.className = "achievement-notification achievement-batch";
    notification.setAttribute("data-count", achievements.length);

    // Construir lista de iconos
    // Limitamos a 5 iconos para no romper el layout
    const displayAchievements = achievements.slice(0, 5);
    const iconsHTML = displayAchievements.map(ach => 
        `<img class="batch-icon" src="${ach.image || 'img/logros/default.png'}" title="${ach.name}" onerror="this.src='img/logros/default.png'">`
    ).join('');
    
    // Nombres resumidos (ej. "Novato, Constante...")
    const names = achievements.map(a => a.name).join(', ');

    notification.innerHTML = `
            <div class="achievement-content" style="padding-left: 5px;">
                <div class="achievement-label" style="color: var(--cyber-yellow); margin-bottom: 0px;">¡RACHA DE LOGROS!</div>
                <div class="achievement-name" style="margin-bottom: 0px;"><span>${achievements.length} DESBLOQUEADOS</span></div>
                <div class="achievement-desc batch-names" style="margin-bottom: 0px;"><span>${names}</span></div>
                <div class="achievement-icons-row" style="margin-top: 5px; height: 24px;">
                    ${iconsHTML}
                    ${achievements.length > 5 ? `<span class="more-badge">+${achievements.length - 5}</span>` : ''}
                </div>
            </div>
            <div class="achievement-timer"></div>
        `;

    this._mountNotification(notification, container, username, "Multiple Achievements");
  }

  /**
   * Muestra físicamente la notificación de logro (Single)
   * @private
   */
  _displayAchievement(eventData) {
    if (this.config.DEBUG) console.log(`[NotificationManager] _displayAchievement called with:`, eventData);
    const container = document.getElementById("achievement-notifications");
    if (!container) {
        console.error(`[NotificationManager] container 'achievement-notifications' NOT FOUND!`);
        return;
    }

    const safeData = UIUtils.decorate(eventData);
    const { username, achievement } = safeData;

    const notification = document.createElement("div");
    notification.className = "achievement-notification";
    notification.setAttribute("data-rarity", eventData.achievement.rarity);

    const imagePath = eventData.achievement.image || "img/logros/default.png";

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

    this._mountNotification(notification, container, username, achievement.name);
  }

  /**
   * Helper común para montar animación y cleanup de notificación
   */
  _mountNotification(notification, container, username, debugLabel) {
    container.appendChild(notification);
    this._checkOverflow(notification);

    requestAnimationFrame(() => {
      notification.classList.add("show");
    });

    if (this.uiManager) {
      this.uiManager.extendDisplayTime(this.displayTime + 1000);
    }

    setTimeout(() => {
      notification.classList.remove("show");
      notification.classList.add("hiding");

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, this.fadeTime);
    }, this.displayTime);

    if (this.config.DEBUG) {
      console.log(`🏆 Notification shown: ${username} -> ${debugLabel}`);
    }
  }

  /**
   * Renderiza overlay Top para batch (Single o Múltiple)
   */
  _displayTopOverlayAchievementBatch(data) {
    const { username, achievements } = data;
    if (this.config.DEBUG) console.log(`[NotificationManager] _displayTopOverlayAchievementBatch for ${username}, count: ${achievements.length}`);
    if (achievements.length === 1) {
        return this._displayTopOverlayAchievement({ username, achievement: achievements[0] });
    }

    // Lógica para Batch en Overlay Top
    const overlay = document.getElementById("cp-achievement-overlay");
    if (!overlay) {
        console.error(`[NotificationManager] overlay 'cp-achievement-overlay' NOT FOUND!`);
        return;
    }

    const totalXP = achievements.reduce((sum, ach) => sum + (XP.ACHIEVEMENT_REWARDS[ach.rarity] || 50), 0);
    const titleText = `${username} está ON FIRE! 🔥`;
    // Lista scrolleable o concatenada
    const namesList = achievements.map(a => a.name).join(' • ');

    // Ancho dinámico
    const maxChars = Math.max(titleText.length, namesList.length);
    let bannerWidth = 532;
    if (maxChars > 30) {
      bannerWidth = 532 + (maxChars - 30) * 11;
    }
    bannerWidth = Math.min(Math.round(bannerWidth), 900);
    const textWidth = bannerWidth - 150;
    const circleTranslate = -1 * (bannerWidth / 2 - 56.25);

    overlay.innerHTML = `
      <div class="achievement rare" style="--banner-width: ${bannerWidth}px; --text-width: ${textWidth}px; --circle-translate: ${circleTranslate}px;">
        <div class="animation">
          <div class="circle">
            <div class="img trophy_animate trophy_img">
              <img class="trophy_1" src="img/trophy_full.svg" alt="Trophy"/>
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
                <span class="unlocked">${titleText}</span>
                <div class="score_disp">
                  <div class="gamerscore">
                    <img width="30px" src="img/G.svg" alt="G"/>
                    <span class="acheive_score">${totalXP}</span>
                  </div>
                  <span class="hyphen_sep">-</span>
                  <span class="achiev_name">${namesList}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this._animateOverlay(overlay, namesList, 'rare');
  }

  /**
   * Muestra la notificación de logro en el overlay superior (Single)
   */
  _displayTopOverlayAchievement(eventData) {
    if (this.config.DEBUG) console.log(`[NotificationManager] _displayTopOverlayAchievement called with:`, eventData);
    const overlay = document.getElementById("cp-achievement-overlay");
    if (!overlay) {
        console.error(`[NotificationManager] overlay 'cp-achievement-overlay' NOT FOUND!`);
        return;
    }

    const safeData = UIUtils.decorate(eventData);
    const { username, achievement } = safeData;
    
    const xpReward = XP.ACHIEVEMENT_REWARDS[achievement.rarity] || 50;
    const isRare = true; // Always rare animation
    const unlockedText = `${username} ha desbloqueado el logro`;

    const nameLength = eventData.achievement.name.length;
    const maxChars = Math.max(unlockedText.length, (nameLength + 15));
    
    let bannerWidth = 532;
    if (maxChars > 34) {
      bannerWidth = 532 + (maxChars - 34) * 12.75;
    }
    
    bannerWidth = Math.min(Math.round(bannerWidth), 825);
    const textWidth = bannerWidth - 150;
    const circleTranslate = -1 * (bannerWidth / 2 - 56.25);

    overlay.innerHTML = `
      <div class="achievement ${isRare ? 'rare' : ''}" style="--banner-width: ${bannerWidth}px; --text-width: ${textWidth}px; --circle-translate: ${circleTranslate}px;">
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
                    <img width="30px" src="img/G.svg" alt="G"/>
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

    this._animateOverlay(overlay, achievement.name, achievement.rarity);
  }

  /**
   * Lógica de animación común para overlays
   */
  _animateOverlay(overlay, scrambleText, rarity = 'common') {
    const circle = overlay.querySelector('.circle');
    const banner = overlay.querySelector('.banner');
    const display = overlay.querySelector('.achieve_disp');

    // Emit sound immediately as the animation sequence starts
    if (this.config.DEBUG) console.log(`🏆 [Notification] Emitiendo sonido de logro (Rareza: ${rarity})`);
    EventManager.emit(EVENTS.UI.ACHIEVEMENT_DISPLAYED, { achievement: { rarity: rarity } });

    requestAnimationFrame(() => {
      overlay.classList.add("show");
      circle.classList.add("circle_animate");
      banner.classList.add("banner-animate");
      display.classList.add("achieve_disp_animate");

      const nameElement = overlay.querySelector('.achiev_name');
      if (nameElement) {
        setTimeout(() => {
          FXManager.scramble(nameElement, scrambleText, 1500);
          FXManager.createDataParticles(overlay.querySelector('.animation'), { count: 10 });
        }, 2600);
      }

      setTimeout(() => {
        FXManager.createDataParticles(overlay.querySelector('.animation'), { count: 15 });
      }, 1200);
    });

    const animationDuration = 11000;

    setTimeout(() => {
      overlay.classList.remove("show");
      setTimeout(() => {
        circle.classList.remove("circle_animate");
        banner.classList.remove("banner-animate");
        display.classList.remove("achieve_disp_animate");
        overlay.innerHTML = "";
      }, 1000);
    }, this.displayTime > animationDuration ? this.displayTime : animationDuration);
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

  /**
   * Renderiza el resultado de la predicción en el flujo del chat
   * @private
   */
  _displayPredictionResult(data) {
    const { username, xp, isWinner, xpResult } = data;
    
    // Configuración visual basada en el resultado
    const icon = isWinner ? '🏆' : '🎫';
    const message = isWinner 
        ? `¡He ganado +${xp} XP en la última predicción! ${icon}🦾` 
        : `He recibido +${xp} XP por participar en la predicción. ${icon}`;

    if (this.config.DEBUG) {
        console.log(`📢 [NotificationManager] Injecting prediction message for ${username}`);
    }

    // Inyectar el mensaje en el flujo normal del chat
    // Esto disparará la animación de la barra de XP en el widget principal
    this.uiManager.displayMessage(
        null, 
        username, 
        message, 
        {}, 
        { isSubscriber: false }, // Info básica, el UIManager buscará roles reales
        xpResult
    );

    // Emitir sonido
    EventManager.emit(EVENTS.AUDIO.PLAY, { id: isWinner ? 'level-up' : 'achievement' });
  }
}
