import BaseScreen from './BaseScreen.js';
import UIUtils from '../../../utils/UIUtils.js';
import { IDLE } from '../../../constants/AppConstants.js';

export default class WatchTimeScreen extends BaseScreen {
    constructor() {
        super();
        this.type = 'watchtime'; // Shared for both session and total
    }

    calculateDuration(data, baseDuration) {
        // Reducir duración para Total (4000ms menos que el default)
        if (data.type === 'watchtime_total') {
            return Math.max(4000, baseDuration - 4000);
        }

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
        const users = screenData.data || [];
        // screenData.title is usually provided by the orchestrator
        
        let usersHtml = '';
        users.forEach((user, index) => {
            const rankClass = index === 0 ? 'top-1' : index < 3 ? 'top-3' : '';
            const delayStyle = `animation-delay: ${index * 0.3}s`;
            const delayClass = 'animate-hidden animate-in';
            
            usersHtml += `
                <div class="modern-list-item ${rankClass} ${delayClass}" style="${delayStyle}">
                    <div class="list-rank">#${index + 1}</div>
                    <div class="list-content">
                        <span class="list-name">${UIUtils.escapeHTML(user.username)}</span>
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
