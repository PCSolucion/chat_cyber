import BaseScreen from './BaseScreen.js';
import UIUtils from '../../../utils/UIUtils.js';

export default class StreaksScreen extends BaseScreen {
    constructor() {
        super();
        this.type = 'streaks';
    }

    render(screenData, container) {
        const { data } = screenData;
        const topStreaks = data.topStreaks || [];

        let streakContent = '';
        
        if (topStreaks.length >= 2) {
            const p1 = topStreaks[0];
            const p2 = topStreaks[1];
            
            streakContent = `
                <div class="streak-battle-container">
                    <div class="battle-side side-left animate-hidden animate-in delay-2">
                        <div class="battle-name">${p1.username}</div>
                        <div class="battle-days tabular-nums" id="stat-days-1">${p1.days}</div>
                        <div class="battle-label">DÍAS</div>
                    </div>
                    
                    <div class="vs-divider animate-hidden animate-in delay-3">VS</div>
                    
                    <div class="battle-side side-right animate-hidden animate-in delay-4">
                        <div class="battle-name">${p2.username}</div>
                        <div class="battle-days tabular-nums" id="stat-days-2">${p2.days}</div>
                        <div class="battle-label">DÍAS</div>
                    </div>
                </div>
            `;
        } else if (topStreaks.length === 1) {
            const p1 = topStreaks[0];
            streakContent = `
                <div class="hero-streak-card animate-hidden animate-in delay-2">
                    <div class="streak-days tabular-nums" id="stat-days-1">${p1.days}</div>
                    <div class="streak-label wide-spacing">DÍAS CONSECUTIVOS</div>
                    <div class="streak-owner-badge">
                         ${p1.username}
                    </div>
                </div>
            `;
        } else {
            streakContent = '<div class="empty-message animate-hidden animate-in">SIN RACHAS ACTIVAS HOY</div>';
        }

        container.innerHTML = `
            <div class="idle-hero-container">
                ${streakContent}
                <div class="sub-stat animate-hidden animate-in delay-5">
                    <span class="highlight tabular-nums">${data.totalActive}</span> RACHAS ACTIVAS EN TOTAL
                </div>
            </div>
        `;
        
        if (topStreaks.length >= 1) {
             UIUtils.animateValue('stat-days-1', 0, parseInt(topStreaks[0].days) || 0, 1500);
        }
        if (topStreaks.length >= 2) {
             UIUtils.animateValue('stat-days-2', 0, parseInt(topStreaks[1].days) || 0, 1500);
        }
    }
}
