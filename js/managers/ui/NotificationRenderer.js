import EventManager from "../../utils/EventEmitter.js";
import { EVENTS } from "../../utils/EventTypes.js";
import { NOTIFICATIONS, XP } from "../../constants/AppConstants.js";
import UIUtils from "../../utils/UIUtils.js";
import FXManager from "../../utils/FXManager.js";
import Logger from '../../utils/Logger.js';

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

        // Header
        const header = document.createElement("div");
        header.className = "bro-header";

        const title = document.createElement("div");
        title.className = "bro-title";
        const titleSpan = document.createElement("span");
        titleSpan.textContent = "👊 BRO COUNT";
        title.appendChild(titleSpan);

        const count = document.createElement("div");
        count.className = "bro-count";
        count.textContent = `${current} / ${max}`;
        
        header.append(title, count);

        // Progress
        const progressContainer = document.createElement("div");
        progressContainer.className = "bro-progress-container";
        const progressFill = document.createElement("div");
        progressFill.className = "bro-progress-fill";
        progressFill.style.width = "0%";
        progressContainer.appendChild(progressFill);

        notification.append(header, progressContainer);

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
        // Solicitud usuario: no mostrar banner de batch en el widget si ya sale el overlay arriba.
        if (this.config.DEBUG) {
            Logger.info('NotificationRenderer', `🏆 Batch of ${data.achievements.length} achievements skipped in widget (Overlay only).`);
        }
    }

    /**
     * Muestra físicamente la notificación de logro (Single)
     */
    renderAchievement(eventData) {
        const container = document.getElementById("achievement-notifications");
        if (!container) return;

        const { username, achievement } = eventData;

        const notification = document.createElement("div");
        notification.className = "achievement-notification";
        notification.setAttribute("data-rarity", achievement.rarity);

        // Icono
        const iconDiv = document.createElement("div");
        iconDiv.className = "achievement-icon";
        const iconImg = document.createElement("img");
        iconImg.src = achievement.image || "img/logros/default.png";
        iconImg.alt = "Achievement Icon";
        iconImg.onerror = () => {
            iconImg.onerror = null;
            iconImg.src = 'img/logros/default.png';
        };
        iconDiv.appendChild(iconImg);

        // Contenido
        const contentDiv = document.createElement("div");
        contentDiv.className = "achievement-content";

        const labelDiv = document.createElement("div");
        labelDiv.className = "achievement-label";
        labelDiv.textContent = "LOGRO DESBLOQUEADO";

        const nameDiv = document.createElement("div");
        nameDiv.className = "achievement-name";
        const nameSpan = document.createElement("span");
        nameSpan.textContent = achievement.name;
        nameDiv.appendChild(nameSpan);

        const descDiv = document.createElement("div");
        descDiv.className = "achievement-desc";
        const descSpan = document.createElement("span");
        descSpan.textContent = achievement.description + " ";
        
        const condSpan = document.createElement("span");
        condSpan.style.color = "var(--cyber-cyan)";
        condSpan.style.opacity = "0.9";
        condSpan.textContent = `[${achievement.condition}]`;
        
        descSpan.appendChild(condSpan);
        descDiv.appendChild(descSpan);

        contentDiv.appendChild(labelDiv);
        contentDiv.appendChild(nameDiv);
        contentDiv.appendChild(descDiv);

        // Timer bar
        const timerDiv = document.createElement("div");
        timerDiv.className = "achievement-timer";

        // Ensamblaje
        notification.appendChild(iconDiv);
        notification.appendChild(contentDiv);
        notification.appendChild(timerDiv);

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
            Logger.info('NotificationRenderer', `🏆 Notification shown: ${username} -> ${debugLabel}`);
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

        const totalXP = achievements.reduce((sum, ach) => sum + (XP.ACHIEVEMENT_REWARDS[ach.rarity] || 50), 0);
        const titleText = `${username} está ON FIRE! 🔥`;
        const namesList = achievements.map(a => a.name).join(' • ');

        this._renderOverlayContent(titleText, namesList, totalXP, 'rare');
    }

    /**
     * Muestra la notificación de logro en el overlay superior
     */
    renderTopOverlayAchievement(eventData) {
        const { username, achievement } = eventData;
        const xpReward = XP.ACHIEVEMENT_REWARDS[achievement.rarity] || 50;
        const unlockedText = `${username} ha desbloqueado el logro`;

        this._renderOverlayContent(unlockedText, achievement.name, xpReward, achievement.rarity);
    }

    /**
     * Método privado unificado para construir el contenido del overlay usando DOM API
     * @private
     */
    _renderOverlayContent(titleText, subTitleText, xpValue, rarity) {
        const overlay = document.getElementById("cp-achievement-overlay");
        if (!overlay) return;

        // Limpiar previo
        overlay.replaceChildren();

        // Cálculos de layout (Preservando lógica original)
        const maxChars = Math.max(titleText.length, subTitleText.length);
        let bannerWidth = 532;
        if (maxChars > 30) {
            bannerWidth = 532 + (maxChars - 30) * 11;
        }
        bannerWidth = Math.min(Math.round(bannerWidth), 900);
        const textWidth = bannerWidth - 150;
        const circleTranslate = -1 * (bannerWidth / 2 - 56.25);

        // Construcción de elementos
        const achievementDiv = document.createElement("div");
        achievementDiv.className = `achievement ${rarity === 'common' ? '' : 'rare'}`;
        achievementDiv.style.setProperty("--banner-width", `${bannerWidth}px`);
        achievementDiv.style.setProperty("--text-width", `${textWidth}px`);
        achievementDiv.style.setProperty("--circle-translate", `${circleTranslate}px`);

        const animationDiv = document.createElement("div");
        animationDiv.className = "animation";

        // Círculo y Trofeos
        const circleDiv = document.createElement("div");
        circleDiv.className = "circle";

        const trophyDiv = document.createElement("div");
        trophyDiv.className = "img trophy_animate trophy_img";
        const trophyImg1 = document.createElement("img");
        trophyImg1.className = "trophy_1";
        trophyImg1.src = "img/trophy_full.svg";
        trophyImg1.alt = "Trophy";
        trophyDiv.appendChild(trophyImg1);

        const xboxImgDiv = document.createElement("div");
        xboxImgDiv.className = "img xbox_img";
        const arasakaImg = document.createElement("img");
        arasakaImg.src = "img/arasaka.png";
        arasakaImg.alt = "Arasaka";
        xboxImgDiv.appendChild(arasakaImg);

        const brilliantWrap = document.createElement("div");
        brilliantWrap.className = "brilliant-wrap";
        const brilliantDiv = document.createElement("div");
        brilliantDiv.className = "brilliant";
        brilliantWrap.appendChild(brilliantDiv);

        circleDiv.append(trophyDiv, xboxImgDiv, brilliantWrap);

        // Banner
        const bannerOuter = document.createElement("div");
        bannerOuter.className = "banner-outer";
        const banner = document.createElement("div");
        banner.className = "banner";

        const dispDiv = document.createElement("div");
        dispDiv.className = "achieve_disp";
        const unlockedSpan = document.createElement("span");
        unlockedSpan.className = "unlocked";
        unlockedSpan.textContent = titleText;

        const scoreDisp = document.createElement("div");
        scoreDisp.className = "score_disp";
        
        const gamerscore = document.createElement("div");
        gamerscore.className = "gamerscore";
        const gImg = document.createElement("img");
        gImg.width = 30;
        gImg.src = "img/G.svg";
        gImg.alt = "G";
        const scoreSpan = document.createElement("span");
        scoreSpan.className = "acheive_score";
        scoreSpan.textContent = xpValue;
        gamerscore.append(gImg, scoreSpan);

        const hyphen = document.createElement("span");
        hyphen.className = "hyphen_sep";
        hyphen.textContent = "-";

        const nameSpan = document.createElement("span");
        nameSpan.className = "achiev_name";
        nameSpan.textContent = subTitleText;

        scoreDisp.append(gamerscore, hyphen, nameSpan);
        dispDiv.append(unlockedSpan, scoreDisp);
        banner.appendChild(dispDiv);
        bannerOuter.appendChild(banner);

        animationDiv.append(circleDiv, bannerOuter);
        achievementDiv.appendChild(animationDiv);
        overlay.appendChild(achievementDiv);

        this.animateOverlay(overlay, subTitleText, rarity);
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
                overlay.replaceChildren();
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
            Logger.warn('NotificationRenderer', "Error checking overflow:", e);
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
