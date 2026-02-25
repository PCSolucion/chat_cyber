import EventManager from "../../utils/EventEmitter.js";
import { EVENTS } from "../../utils/EventTypes.js";
import { NOTIFICATIONS, XP } from "../../constants/AppConstants.js";
import UIUtils from "../../utils/UIUtils.js";
import FXManager from "../../utils/FXManager.js";

/**
 * NotificationRenderer - Gestión de UI y Animaciones para Notificaciones
 * 
 * Responsabilidades:
 * - Construir elementos DOM para notificaciones
 * - Gestionar animaciones y transiciones
 * - Manejar overlays superiores (estilo Cyberpunk)
 * 
 * @class NotificationRenderer
 */
export default class NotificationRenderer {
    constructor(config, uiManager = null) {
        this.config = config;
        this.uiManager = uiManager;
    }

    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Escapa caracteres HTML para prevenir XSS (Especialmente util en OBS widgets)
     */
    _escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag));
    }

    /**
     * Muestra una barra de progreso para el contador de "Bro"
     */
    renderBroProgress(current, max) {
        const container = document.getElementById("achievement-notifications");
        if (!container) return;

        const notification = document.createElement("div");
        notification.className = "bro-notification";

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

        requestAnimationFrame(() => {
            const fill = notification.querySelector(".bro-progress-fill");
            if (fill) fill.style.width = `${percent}%`;
        });

        if (this.uiManager) {
            this.uiManager.extendDisplayTime(NOTIFICATIONS.BRO_PROGRESS_DISPLAY_TIME_MS);
        }

        setTimeout(() => {
            notification.classList.add("hiding");
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3500);
    }

    /**
     * Renderiza un batch de logros en el widget lateral
     */
    renderAchievementBatch(data) {
        const { username, achievements } = data;
        
        if (achievements.length === 1) {
            return this.renderAchievement({ username, achievement: achievements[0] });
        }

        const container = document.getElementById("achievement-notifications");
        if (!container) return;

        const notification = document.createElement("div");
        notification.className = "achievement-notification achievement-batch";
        notification.setAttribute("data-count", achievements.length);

        const displayAchievements = achievements.slice(0, 5);
        const iconsHTML = displayAchievements.map(ach => 
            `<img class="batch-icon" src="${this._escapeHTML(ach.image || 'img/logros/default.png')}" title="${this._escapeHTML(ach.name)}" onerror="this.src='img/logros/default.png'">`
        ).join('');
        
        const names = achievements.map(a => this._escapeHTML(a.name)).join(', ');

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

        this.mountNotification(notification, container, username, "Multiple Achievements");
    }

    /**
     * Muestra físicamente la notificación de logro (Single)
     */
    renderAchievement(eventData) {
        const container = document.getElementById("achievement-notifications");
        if (!container) return;

        const safeData = UIUtils.decorate(eventData);
        const { username, achievement } = safeData;

        const notification = document.createElement("div");
        notification.className = "achievement-notification";
        notification.setAttribute("data-rarity", eventData.achievement.rarity);

        const imagePath = this._escapeHTML(eventData.achievement.image || "img/logros/default.png");
        const safeName = this._escapeHTML(achievement.name);
        const safeDesc = this._escapeHTML(achievement.description);
        const safeCond = this._escapeHTML(achievement.condition);

        notification.innerHTML = `
            <div class="achievement-icon">
                <img src="${imagePath}" alt="Achievement Icon" onerror="this.onerror=null;this.src='img/logros/default.png';">
            </div>
            <div class="achievement-content">
                <div class="achievement-label">LOGRO DESBLOQUEADO</div>
                <div class="achievement-name"><span>${safeName}</span></div>
                <div class="achievement-desc"><span>${safeDesc} <span style="color: var(--cyber-cyan); opacity: 0.9;">[${safeCond}]</span></span></div>
            </div>
            <div class="achievement-timer"></div>
        `;

        this.mountNotification(notification, container, username, achievement.name);
    }

    /**
     * Helper común para montar animación y cleanup
     */
    mountNotification(notification, container, username, debugLabel) {
        container.appendChild(notification);
        this.checkOverflow(notification);

        requestAnimationFrame(() => {
            notification.classList.add("show");
        });

        if (this.uiManager) {
            this.uiManager.extendDisplayTime(NOTIFICATIONS.DISPLAY_TIME_MS + 1000);
        }

        setTimeout(() => {
            notification.classList.remove("show");
            notification.classList.add("hiding");

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, NOTIFICATIONS.FADE_TIME_MS);
        }, NOTIFICATIONS.DISPLAY_TIME_MS);

        if (this.config.DEBUG) {
            console.log(`🏆 Notification shown: ${username} -> ${debugLabel}`);
        }
    }

    /**
     * Renderiza overlay Top para batch
     */
    renderTopOverlayAchievementBatch(data) {
        const { username, achievements } = data;
        if (achievements.length === 1) {
            return this.renderTopOverlayAchievement({ username, achievement: achievements[0] });
        }

        const overlay = document.getElementById("cp-achievement-overlay");
        if (!overlay) return;

        const totalXP = achievements.reduce((sum, ach) => sum + (XP.ACHIEVEMENT_REWARDS[ach.rarity] || 50), 0);
        const titleText = `${username} está ON FIRE! 🔥`;
        const namesList = achievements.map(a => a.name).join(' • ');

        const safeTitle = this._escapeHTML(titleText);
        const safeNamesList = this._escapeHTML(namesList);

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
                    <span class="unlocked">${safeTitle}</span>
                    <div class="score_disp">
                      <div class="gamerscore">
                        <img width="30px" src="img/G.svg" alt="G"/>
                        <span class="acheive_score">${totalXP}</span>
                      </div>
                      <span class="hyphen_sep">-</span>
                      <span class="achiev_name">${safeNamesList}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        this.animateOverlay(overlay, safeNamesList, 'rare');
    }

    /**
     * Muestra la notificación de logro en el overlay superior
     */
    renderTopOverlayAchievement(eventData) {
        const overlay = document.getElementById("cp-achievement-overlay");
        if (!overlay) return;

        const safeData = UIUtils.decorate(eventData);
        const { username, achievement } = safeData;
        
        const xpReward = XP.ACHIEVEMENT_REWARDS[achievement.rarity] || 50;
        const unlockedText = `${username} ha desbloqueado el logro`;

        const safeUnlockedText = this._escapeHTML(unlockedText);
        const safeAchievementName = this._escapeHTML(achievement.name);

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
          <div class="achievement rare" style="--banner-width: ${bannerWidth}px; --text-width: ${textWidth}px; --circle-translate: ${circleTranslate}px;">
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
                    <span class="unlocked">${safeUnlockedText}</span>
                    <div class="score_disp">
                      <div class="gamerscore">
                        <img width="30px" src="img/G.svg" alt="G"/>
                        <span class="acheive_score">${xpReward}</span>
                      </div>
                      <span class="hyphen_sep">-</span>
                      <span class="achiev_name">${safeAchievementName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        this.animateOverlay(overlay, safeAchievementName, achievement.rarity);
    }

    /**
     * Lógica de animación común para overlays
     */
    animateOverlay(overlay, scrambleText, rarity = 'common') {
        const circle = overlay.querySelector('.circle');
        const banner = overlay.querySelector('.banner');
        const display = overlay.querySelector('.achieve_disp');

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
        const displayTime = NOTIFICATIONS.DISPLAY_TIME_MS;

        setTimeout(() => {
            overlay.classList.remove("show");
            setTimeout(() => {
                circle.classList.remove("circle_animate");
                banner.classList.remove("banner-animate");
                display.classList.remove("achieve_disp_animate");
                overlay.innerHTML = "";
            }, 1000);
        }, displayTime > animationDuration ? displayTime : animationDuration);
    }

    /**
     * Verifica overflow de texto para activar marquee
     */
    checkOverflow(notification) {
        try {
            const nameSpan = notification.querySelector(".achievement-name span");
            const nameContainer = notification.querySelector(".achievement-name");
            if (nameSpan && nameContainer && nameSpan.scrollWidth > nameContainer.clientWidth) {
                nameSpan.classList.add("marquee-active");
            }

            const descSpan = notification.querySelector(".achievement-desc > span");
            const descContainer = notification.querySelector(".achievement-desc");
            if (descSpan && descContainer && descSpan.scrollWidth > descContainer.clientWidth) {
                descSpan.classList.add("marquee-active");
            }
        } catch (e) {
            console.warn("Error checking overflow:", e);
        }
    }

    /**
     * Renderiza el resultado de la predicción en el flujo del chat
     */
    renderPredictionResult(data) {
        const { username, xp, isWinner, xpResult } = data;
        
        const icon = isWinner ? '🏆' : '🎫';
        const message = isWinner 
            ? `¡He ganado +${xp} XP en la última predicción! ${icon}🦾` 
            : `He recibido +${xp} XP por participar en la predicción. ${icon}`;

        if (this.uiManager) {
            this.uiManager.displayMessage(
                null, 
                username, 
                message, 
                {}, 
                { isSubscriber: false },
                xpResult
            );
        }

        EventManager.emit(EVENTS.AUDIO.PLAY, { id: isWinner ? 'level-up' : 'achievement' });
    }
}
