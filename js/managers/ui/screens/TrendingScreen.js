import BaseScreen from './BaseScreen.js';
import UIUtils from '../../../utils/UIUtils.js';

export default class TrendingScreen extends BaseScreen {
    constructor() {
        super();
        this.type = 'trending';
    }

    calculateDuration(data, baseDuration) {
        // Reducir duración para Trending (6000ms menos que el default, solicitado: 2s menos que antes)
        return Math.max(4000, baseDuration - 6000);
    }

    render(screenData, container) {
        const { data } = screenData;
        const { topEmotes, totalEmotes } = data;

        let emotesHtml = '';
        if (topEmotes && topEmotes.length > 0) {
            topEmotes.slice(0, 5).forEach((item, index) => {
                const percent = Math.min(100, (item.count / (topEmotes[0].count || 1)) * 100);
                const emoteDisplay = item.url
                    ? `<img src="${item.url}" alt="${UIUtils.escapeHTML(item.name)}" class="trending-emote-img" />`
                    : `<span class="trending-emote-text">${UIUtils.escapeHTML(item.name)}</span>`;

                const delayClass = `animate-hidden animate-in delay-${Math.min(index + 1, 5)}`;

                emotesHtml += `
                    <div class="trending-emote-item ${delayClass}">
                        <div class="trending-emote-display">${emoteDisplay}</div>
                        <div class="trending-emote-info">
                            <span class="trending-emote-name">${UIUtils.escapeHTML(item.name)}</span>
                            <span class="trending-emote-count tabular-nums">${item.count}x</span>
                        </div>
                        <div class="trend-bar-bg"><div class="trend-bar-fill fill-cyan" style="width: ${percent}%"></div></div>
                    </div>
                `;
            });
        } else {
            emotesHtml = '<div class="empty-message animate-hidden animate-in">SIN EMOTES AÚN</div>';
        }

        container.innerHTML = `
            <div class="trending-emotes-container">
                ${emotesHtml}
            </div>
            <div class="idle-footer-info animate-hidden animate-in delay-5">
                <span class="pulse-dot"></span> TOTAL: <span class="tabular-nums">${totalEmotes}</span> emotes
            </div>
        `;
    }
}
