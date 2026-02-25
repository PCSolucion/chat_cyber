import BaseScreen from './BaseScreen.js';
import { IDLE } from '../../../constants/AppConstants.js';

export default class LeaderboardScreen extends BaseScreen {
    constructor() {
        super();
        this.type = 'leaderboard';
    }

    calculateDuration(data, baseDuration) {
        if (!data || !data.data) return baseDuration;
        const itemCount = data.data.length;
        if (itemCount > 5) {
            const multiplier = 1400; // 1.4s por item
            const calculatedTime = Math.max(baseDuration, itemCount * multiplier);
            return Math.min(calculatedTime, 30000); // Max 30s
        }
        return baseDuration;
    }

    render(screenData, container) {
        const allUsers = screenData.data || [];
        const users = allUsers.slice(0, 20);

        let usersHtml = '';
        users.forEach((user, index) => {
            const rankClass = index === 0 ? 'top-1' : index < 3 ? 'top-3' : '';
            const delayClass = 'animate-hidden animate-in';
            const delayStyle = `animation-delay: ${index * 0.3}s`;
            const safeName = UIUtils.escapeHTML(user.username);
            
            usersHtml += `
                <div class="modern-list-item ${rankClass} ${delayClass}" style="${delayStyle}">
                    <div class="list-rank">#${index + 1}</div>
                    <div class="list-content">
                        <span class="list-name">${safeName}</span>
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

        const shouldScroll = users.length > 5;
        const scrollDuration = this.calculateDuration(screenData, IDLE.DEFAULT_ROTATION_MS) / 1000;

        const content = `
            <div class="idle-list-scroll-wrapper ${shouldScroll ? 'animate-scroll' : ''}" 
                 style="${shouldScroll ? `animation-duration: ${scrollDuration}s;` : ''}">
                ${usersHtml}
            </div>
        `;

        container.innerHTML = `
            <div class="idle-list-container">
                ${content}
            </div>
        `;
    }
}
