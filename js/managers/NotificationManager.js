import EventManager from "../utils/EventEmitter.js";
import { EVENTS } from "../utils/EventTypes.js";
import { NOTIFICATIONS } from "../constants/AppConstants.js";
import NotificationRenderer from "./ui/NotificationRenderer.js";
import Logger from "../utils/Logger.js";

/**
 * NotificationManager - Gestor de Notificaciones (Orquestador)
 *
 * Responsabilidades:
 * - Gestionar cola de notificaciones (logros, level-ups, etc.)
 * - Coordinar el flujo de display (Smart Batching)
 * - Delegar el renderizado a NotificationRenderer
 *
 * @class NotificationManager
 */
export default class NotificationManager {
  /**
   * Constructor del NotificationManager
   * @param {Object} config - Configuración global
   * @param {UIManager} uiManager - Referencia al UIManager
   */
  constructor(config, uiManager = null) {
    this.config = config;
    this.uiManager = uiManager;

    // Inicializar Renderer (UI)
    this.renderer = new NotificationRenderer(config, uiManager);

    // Cola de notificaciones
    this.queue = [];
    this.isShowingNotification = false;

    // Configuración de tiempos centralizada
    this.displayTime = NOTIFICATIONS.DISPLAY_TIME_MS;
    this.fadeTime = NOTIFICATIONS.FADE_TIME_MS;
    this.queueMaxSize = NOTIFICATIONS.QUEUE_MAX_SIZE;

    // Buffer para agrupar logros (Smart Batching)
    this.achievementBuffer = new Map(); // username -> [achievements]
    this.bufferTimers = new Map();      // username -> timeoutId
    this.BATCH_WINDOW_MS = 2000;        // Ventana de 2 segundos para agrupar

    this._handlers = {};

    Logger.info('NotificationManager', "📢 NotificationManager (Orchestrator) initialized");
    this._setupEventListeners();
  }

  /**
   * Configura los listeners de eventos centralizados
   * @private
   */
  _setupEventListeners() {
    // Logros desbloqueados
    this._handlers.achievementUnlocked = EventManager.on(EVENTS.USER.ACHIEVEMENT_UNLOCKED, (eventData) => {
      this.showAchievement(eventData);
    });

    // Progreso de "Bro" (Usa renderizado inmediato fuera de la cola principal)
    this._handlers.broProgress = EventManager.on(EVENTS.USER.BRO_PROGRESS, ({ current, max }) => {
      this.showBroProgress(current, max);
    });

    // Level ups
    this._handlers.levelUp = EventManager.on(EVENTS.USER.LEVEL_UP, (eventData) => {
      this.showLevelUp(eventData);
    });

    // Resultados de predicción
    this._handlers.predictionResult = EventManager.on(EVENTS.USER.PREDICTION_RESULT, (eventData) => {
      this.showPredictionResult(eventData);
    });
  }

  /**
   * Limpia y destruye el manager (previene memory leaks)
   */
  destroy() {
      // 1. Limpiar eventos
      if (this._handlers) {
          Object.values(this._handlers).forEach(unsubscribe => {
              if (typeof unsubscribe === 'function') unsubscribe();
          });
      }

      // 2. Limpiar timers de buffer
      this.bufferTimers.forEach(timerId => clearTimeout(timerId));
      this.bufferTimers.clear();
      this.achievementBuffer.clear();

      // 3. Limpiar cola
      this.clearQueue();

      // 4. Limpiar renderer
      if (this.renderer && typeof this.renderer.destroy === 'function') {
          this.renderer.destroy();
      }
  }

  /**
   * Configura la referencia al UIManager
   * @param {UIManager} uiManager
   */
  setUIManager(uiManager) {
    this.uiManager = uiManager;
    this.renderer.setUIManager(uiManager);
  }

  /**
   * Añade una notificación de logro a la cola de procesamiento (Bufferizado)
   * @param {Object} eventData
   */
  showAchievement(eventData) {
    const { username, achievement } = eventData;
    const lowerUser = username.toLowerCase();

    if (!this.achievementBuffer.has(lowerUser)) {
      this.achievementBuffer.set(lowerUser, []);
    }

    this.achievementBuffer.get(lowerUser).push(achievement);

    if (this.bufferTimers.has(lowerUser)) return;

    const timerId = setTimeout(() => {
      this._flushAchievementBuffer(lowerUser, username);
    }, this.BATCH_WINDOW_MS);

    this.bufferTimers.set(lowerUser, timerId);
  }

  /**
   * Procesa el buffer de logros y lo envía a la cola real
   * @private
   */
  _flushAchievementBuffer(lowerKey, displayUsername) {
    const achievements = this.achievementBuffer.get(lowerKey);
    this.achievementBuffer.delete(lowerKey);
    this.bufferTimers.delete(lowerKey);

    if (!achievements || achievements.length === 0) return;

    if (this.queue.length >= this.queueMaxSize) {
      if (this.config.DEBUG) Logger.info('NotificationManager', `🏆 Cola llena, batch descartado para ${displayUsername}`);
      return;
    }

    this.queue.push({
      type: "achievement_batch",
      data: { username: displayUsername, achievements },
    });

    this._processQueue();
  }
 
  /**
   * Añade una notificación de level-up a la cola
   * @param {Object} eventData
   */
  showLevelUp(eventData) {
    // 1. Verificar si es el usuario que actualmente tiene el "foco" en el widget de XP
    const isCurrentFocus = this.uiManager?.xpDisplay?.currentUsername?.toLowerCase() === eventData.username?.toLowerCase();

    // 2. [FILTRO CRÍTICO] Solo mostrar visuales si el usuario está PRESENTE o si es el foco actual
    // Esto evita animaciones de usuarios que ganaron una predicción pero ya se fueron del stream.
    if (!eventData.isPresent && !isCurrentFocus) { 
        if (this.config.DEBUG) Logger.info('UI', `⏭️ Saltando animación LevelUp: ${eventData.username} no está presente.`);
        return;
    }

    if (this.config.DEBUG) Logger.debug('UI', `📥 Encolando LevelUp para: ${eventData.username}`);
    this.queue.push({ type: "levelup", data: eventData });
    this._processQueue();
  }

  /**
   * Añade una notificación de predicción a la cola
   * @param {Object} eventData
   */
  showPredictionResult(eventData) {
    this.queue.push({ type: "prediction_result", data: eventData });
    this._processQueue();
  }

  /**
   * Procesa la cola de notificaciones una a una
   * @private
   */
  _processQueue() {
    if (this.isShowingNotification || this.queue.length === 0) return;

    this.isShowingNotification = true;
    const notification = this.queue.shift();

    let totalWaitTime = this.displayTime + this.fadeTime;

    try {
      switch (notification.type) {
        case "achievement_batch":
          this.renderer.renderAchievementBatch(notification.data);
          this.renderer.renderTopOverlayAchievementBatch(notification.data);
          totalWaitTime = Math.max(totalWaitTime, 11500);
          break;

        case "levelup":
          if (this.uiManager && this.uiManager.xpDisplay) {
            this.uiManager.xpDisplay.showTopLevelUp(notification.data);
            this.uiManager.xpDisplay.showLevelUp(notification.data);
          }
          EventManager.emit(EVENTS.UI.LEVEL_UP_DISPLAYED, notification.data);
          totalWaitTime = 6500;
          break;

        case "prediction_result":
          this.renderer.renderPredictionResult(notification.data);
          totalWaitTime = 3500;
          break;

        default:
          this.isShowingNotification = false;
          this._processQueue();
          return;
      }
    } catch (e) {
      Logger.error('NotificationManager', `❌ [NotificationManager] Error processing "${notification.type}":`, e);
    }

    setTimeout(() => {
      this.isShowingNotification = false;
      this._processQueue();
    }, totalWaitTime);
  }

  /**
   * Muestra el progreso de "Bro"
   */
  showBroProgress(current, max) {
    this.renderer.renderBroProgress(current, max);
  }

  /**
   * Limpia la cola de notificaciones
   */
  clearQueue() {
    this.queue = [];
  }

  /**
   * Obtiene el tamaño actual de la cola
   * @returns {number}
   */
  getQueueSize() {
    return this.queue.length;
  }
}
