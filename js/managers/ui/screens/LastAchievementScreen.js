import BaseScreen from './BaseScreen.js';
import UIUtils from '../../../utils/UIUtils.js';

export default class LastAchievementScreen extends BaseScreen {
    constructor() {
        super();
        this.type = 'last_achievement';
    }

    render(screenData, container) {
        const achievement = screenData.data;

        if (!achievement) {
             container.innerHTML = `
                <div class="empty-message">NADIE HA DESBLOQUEADO LOGROS AÚN</div>
            `;
            return;
        }

        const { username, achievement: achData, timestamp } = achievement;
        const timeStr = UIUtils.formatClockTime(timestamp);

        container.innerHTML = `
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
}
