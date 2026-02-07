import BaseScreen from './BaseScreen.js';
import UIUtils from '../../../utils/UIUtils.js';

export default class AchievementsScreen extends BaseScreen {
    constructor() {
        super();
        this.type = 'achievements';
    }

    calculateDuration(data, baseDuration) {
        // Reducir duración para Achievements (5000ms menos que el default)
        return Math.max(4000, baseDuration - 5000);
    }

    render(screenData, container) {
        const { data } = screenData;

        let recentHtml = '';
        if (data.recent && data.recent.length > 0) {
            data.recent.slice(0, 3).forEach(levelUp => {
                recentHtml += `
                    <div class="recent-levelup-item">
                        <span class="levelup-user">${levelUp.username}</span>
                        <div class="levelup-badge">LVL ${levelUp.newLevel}</div>
                    </div>
                `;
            });
        } else {
            recentHtml = '<div class="empty-message small">NINGUNO RECIENTEMENTE</div>';
        }

        container.innerHTML = `
            <div class="idle-stats-row">
                <div class="big-stat-box animate-hidden animate-in delay-2">
                    <span class="big-stat-num tabular-nums" id="stat-levels">${data.levelUps}</span>
                    <span class="big-stat-label">NIVELES</span>
                </div>
                <div class="big-stat-box animate-hidden animate-in delay-3">
                    <span class="big-stat-num tabular-nums" id="stat-achievements">${data.achievements}</span>
                    <span class="big-stat-label">LOGROS</span>
                </div>
            </div>
            <div class="recent-section animate-hidden animate-in delay-4">
                <div class="section-label wide-spacing">ÚLTIMOS ASCENSOS</div>
                ${recentHtml}
            </div>
        `;

        UIUtils.animateValue('stat-levels', 0, parseInt(data.levelUps) || 0, 1500);
        UIUtils.animateValue('stat-achievements', 0, parseInt(data.achievements) || 0, 1500);
    }
}
