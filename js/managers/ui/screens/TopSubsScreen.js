import BaseScreen from './BaseScreen.js';
import { IDLE } from '../../../constants/AppConstants.js';

export default class TopSubsScreen extends BaseScreen {
    constructor() {
        super();
        this.type = 'top_subscribers';
    }

    calculateDuration(data, baseDuration) {
        if (!data || !data.data) return baseDuration;
        const itemCount = data.data.length;
        if (itemCount > 5) {
            const multiplier = 1200; // 1.2s por item (más rápido para no demorar cierre)
            const calculatedTime = Math.max(baseDuration, itemCount * multiplier);
            return Math.min(calculatedTime, 30000); // Max 30s
        }
        return baseDuration;
    }

    render(screenData, container) {
        const users = screenData.data || [];
        
        let usersHtml = '';
        users.forEach((user, index) => {
            const rankClass = index === 0 ? 'top-1' : index < 3 ? 'top-3' : '';
            const delayClass = 'animate-hidden animate-in';
            const delayStyle = `animation-delay: ${index * 0.25}s`;
            
            usersHtml += `
                <div class="modern-list-item ${rankClass} ${delayClass}" style="${delayStyle}">
                    <div class="list-rank">#${index + 1}</div>
                    <div class="list-content">
                        <span class="list-name" style="${index === 0 ? 'color: #fff; text-shadow: 0 0 10px rgba(255,255,255,0.3);' : ''}">${user.username}</span>
                        <span class="list-sub tabular-nums">NIVEL ${user.level}</span>
                    </div>
                    <div class="list-stat">
                        <span class="stat-num tabular-nums" style="color: #fff;">${user.months}</span>
                        <span class="stat-unit" style="color: var(--cyber-red, #FF3B45); opacity: 0.8 !important;">meses</span>
                    </div>
                </div>
            `;
        });

        if (users.length === 0) {
            usersHtml = '<div class="empty-message animate-hidden animate-in">SIN EXPERTOS EN RED AUN</div>';
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
