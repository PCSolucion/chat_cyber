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

        // Estructura base estática (Safe)
        container.innerHTML = `
            <div class="idle-dashboard-top-row">
                <div class="stat-card mini-stat animate-hidden animate-in delay-1">
                    <div class="stat-icon timer-icon"></div>
                    <div class="stat-info">
                        <div class="stat-value small tabular-nums" id="stat-duration">--:--</div>
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
                            <div class="gauge-value-text cyan-glow tabular-nums" id="stat-mpm">0.0</div>
                            <div class="gauge-label-text">MESSAGES PER MINUTE</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="idle-footer-info animate-hidden animate-in delay-5" id="stat-footer">
                <span class="pulse-dot"></span> SESSION START: <span id="stat-start-time">--:--</span>h
            </div>
        `;

        // Inyección segura de datos dinámicos mediante textContent
        const durationEl = container.querySelector('#stat-duration');
        const mpmEl = container.querySelector('#stat-mpm');
        const startTimeEl = container.querySelector('#stat-start-time');

        if (durationEl) durationEl.textContent = data.duration || '--:--';
        if (mpmEl) mpmEl.textContent = data.avgMpm || '0.0';
        if (startTimeEl) startTimeEl.textContent = startTimeStr;

        this._renderTicks(container);
        this._animateValues(data, container);
    }

    _renderTicks(container) {
        const ticksContainer = container.querySelector('#gauge-ticks');
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

    _animateValues(data, container) {
        setTimeout(() => {
            const msgsEl = container.querySelector('#stat-msgs');
            const usersEl = container.querySelector('#stat-users');
            const mpmEl = container.querySelector('#stat-mpm');
            
            if (msgsEl) UIUtils.animateValue(msgsEl, 0, parseInt(data.messages) || 0, 2500);
            if (usersEl) UIUtils.animateValue(usersEl, 0, parseInt(data.users) || 0, 2500);
            if (mpmEl) UIUtils.animateValue(mpmEl, 0, parseFloat(data.avgMpm) || 0, 2500);
            
            // 18 es el factor si el máximo es 10 MPM. Si el máximo es 60, debería ser 3.
            // Para un look más Cyberpunk, permitimos que llegue a 180deg (10 MPM es un chat muy activo en este contexto)
            const targetRotation = Math.min(180, (parseFloat(data.avgMpm) || 0) * 18);
            const needle = container.querySelector('#gauge-needle');
            if (needle) {
                needle.style.transform = `rotate(${targetRotation}deg)`;
            }
        }, 800);
    }
}
