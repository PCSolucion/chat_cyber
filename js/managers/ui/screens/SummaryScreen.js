import BaseScreen from './BaseScreen.js';
import UIUtils from '../../../utils/UIUtils.js';

export default class SummaryScreen extends BaseScreen {
    constructor() {
        super();
        this.type = 'summary';
    }

    render(screenData, container) {
        const { data } = screenData;
        const sessionStart = data.sessionStart || Date.now();
        const startTimeStr = UIUtils.formatClockTime(new Date(sessionStart));

        container.innerHTML = `
            <div class="idle-dashboard-top-row">
                <div class="stat-card mini-stat animate-hidden animate-in delay-1">
                    <div class="stat-icon timer-icon"></div>
                    <div class="stat-info">
                        <div class="stat-value small tabular-nums">${data.duration}</div>
                        <div class="stat-label">TIEMPO</div>
                    </div>
                </div>
                <div class="stat-card mini-stat animate-hidden animate-in delay-2">
                    <div class="stat-icon msg-icon"></div>
                    <div class="stat-info">
                        <div class="stat-value small mobile-highlight tabular-nums" id="stat-msgs">0</div>
                        <div class="stat-label">MSGS</div>
                    </div>
                </div>
                <div class="stat-card mini-stat animate-hidden animate-in delay-3">
                    <div class="stat-icon user-icon"></div>
                    <div class="stat-info">
                        <div class="stat-value small tabular-nums" id="stat-users">0</div>
                        <div class="stat-label">USERS</div>
                    </div>
                </div>
            </div>

            <div class="stat-card full-width-hero animate-hidden animate-in delay-4">
                <div class="speedometer-wrapper">
                    <div class="speedometer-gauge">
                        <div class="gauge-bg"></div>
                        <div class="gauge-ticks" id="gauge-ticks"></div>
                        <div class="gauge-fill" id="gauge-needle" style="transform: rotate(0deg)"></div>
                        <div class="gauge-cover">
                            <div class="gauge-value-text cyan-glow tabular-nums" id="stat-mpm">${data.avgMpm}</div>
                            <div class="gauge-label-text">MESSAGES PER MINUTE</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="idle-footer-info animate-hidden animate-in delay-5">
                <span class="pulse-dot"></span> SESSION START: ${startTimeStr}h
            </div>
        `;

        this._renderTicks();
        this._animateValues(data);
    }

    _renderTicks() {
        const ticksContainer = document.getElementById('gauge-ticks');
        if (ticksContainer) {
            for (let i = 0; i <= 10; i++) {
                const tick = document.createElement('div');
                tick.className = 'gauge-tick';
                const rotation = i * 18;
                tick.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 50%;
                    height: 1px;
                    background: ${i % 2 === 0 ? 'rgba(0, 246, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)'};
                    transform-origin: left center;
                    transform: rotate(${180 + rotation}deg) translateX(10px);
                    z-index: 1;
                `;
                if (i % 2 === 0) {
                    const label = document.createElement('div');
                    label.textContent = i;
                    label.style.cssText = `
                        position: absolute;
                        right: 15px;
                        top: -5px;
                        font-family: 'Share Tech Mono', monospace;
                        font-size: 8px;
                        color: rgba(255, 255, 255, 0.3);
                        transform: rotate(${-180 - rotation}deg);
                    `;
                    tick.appendChild(label);
                }
                ticksContainer.appendChild(tick);
            }
        }
    }

    _animateValues(data) {
        setTimeout(() => {
            UIUtils.animateValue('stat-msgs', 0, parseInt(data.messages) || 0, 2500);
            UIUtils.animateValue('stat-users', 0, parseInt(data.users) || 0, 2500);
            
            const targetRotation = Math.min(180, (parseFloat(data.avgMpm) || 0) * 18);
            const needle = document.getElementById('gauge-needle');
            if (needle) {
                needle.style.transform = `rotate(${targetRotation}deg)`;
            }
        }, 800);
    }
}
