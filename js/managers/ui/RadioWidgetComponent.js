import UIUtils from '../../utils/UIUtils.js';

/**
 * RadioWidgetComponent - Controla la UI del mensaje de radio estilo F1
 * DESIGN: F1 TV Broadcast Faithful (Big Cyan Text)
 */
export default class RadioWidgetComponent {
    constructor(config) {
        this.config = config;
        this.dom = this._createDOM();
        this.isActive = false;
        this.timer = null;
        
        // Elementos internos
        this.els = {
            username: this.dom.querySelector('.radio-widget__username'),
            message: this.dom.querySelector('.radio-widget__message'),
            icon: this.dom.querySelector('.radio-widget__team-logo img'),
            waveContainer: this.dom.querySelector('.radio-widget__wave-strip'),
            waveBars: []
        };

        this._createWaveBars(38); // 38 bars for audio wave
        this._setupWaveAnimations();
    }

    _createDOM() {
        const div = document.createElement('div');
        div.id = 'f1-radio-widget';
        div.className = 'radio-widget';
        div.innerHTML = `
            <div class="radio-widget__top">
                <div class="radio-widget__username">HAMILTON</div>
                <div class="radio-widget__subtitle">
                    <div class="radio-widget__team-logo">
                        <img src="img/mercedes-logo.png" alt="Team Logo">
                    </div>
                    <span class="radio-widget__label">RADIO</span>
                </div>
            </div>
            <div class="radio-widget__wave-strip">
                <!-- Bars injected by JS -->
            </div>
            <div class="radio-widget__divider"></div>
            <div class="radio-widget__body">
                <div class="radio-widget__message">
                    TEAM, GET READY FOR THE PIT STOP.
                </div>
            </div>
        `;
        document.body.appendChild(div);
        return div;
    }

    _createWaveBars(count) {
        this.els.waveContainer.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const bar = document.createElement('div');
            bar.className = 'radio-widget__wave-bar';
            this.els.waveContainer.appendChild(bar);
            this.els.waveBars.push(bar);
        }
    }

    _setupWaveAnimations() {
        this.els.waveBars.forEach((bar, i) => {
            const delay = (Math.random() * 0.8).toFixed(2);
            // Animación más fluida y un poco más rápida (0.7s - 1.4s)
            const duration = (0.7 + Math.random() * 0.7).toFixed(2);
            bar.style.animationDelay = `-${delay}s`;
            bar.style.animationDuration = `${duration}s`;
            
            const initialHeight = 15 + Math.random() * 85;
            bar.style.height = `${initialHeight}%`;
        });
    }

    /**
     * Muestra el widget de radio con los datos del usuario
     * @param {string} username 
     * @param {string} message 
     * @param {number} displayTime 
     * @param {Object} userRole 
     */
    show(username, message, displayTime = 6000, userRole = null) {
        if (this.timer) clearTimeout(this.timer);
        
        const cleanName = UIUtils.cleanUsername(username);
        this.els.username.textContent = cleanName;
        
        // Ajustar tamaño del nombre según su longitud para evitar desbordes
        this.els.username.classList.remove('small-text', 'extra-small-text');
        if (cleanName.length > 15) {
            this.els.username.classList.add('extra-small-text');
        } else if (cleanName.length > 10) {
            this.els.username.classList.add('small-text');
        }
        // 1. Logo y Color dinámico según la escudería
        const TEAM_COLORS = {
            'mercedes-logo.png': '#00d2be',
            'ferrari.png': '#ef1a2d',
            'mclaren-logo.png': '#ff8700',
            'redbull-logo.png': '#0600ef',
            'alpine.png': '#0090ff',
            'williams.png': '#00a0de',
            'aston.png': '#006f62',
            'haas.png': '#ffffff',
            'sauber.png': '#52e252',
            'alphatauri.png': '#ffffff'
        };

        const uiConfig = this.config.UI || { RANK_ICONS: {}, SPECIAL_ICONS: {} };
        const isAdmin = username.toLowerCase() === (this.config.BROADCASTER_USERNAME || '').toLowerCase();
        
        let icon = null;
        if (isAdmin) {
            icon = uiConfig.SPECIAL_ICONS?.ADMIN || 'mercedes-logo.png';
        } else if (username.toUpperCase() === 'SYSTEM') {
            icon = uiConfig.SPECIAL_ICONS?.SYSTEM || 'redbull-logo.png';
        } else if (userRole) {
            const title = (userRole.rankTitle?.title || '').toUpperCase();
            if (userRole.level >= 1 && userRole.level <= 10) {
                icon = 'williams.png';
            } else {
                icon = uiConfig.RANK_ICONS?.[title];
            }
        }
        
        // Fallback
        if (!icon) icon = 'mercedes-logo.png';
        
        this.els.icon.src = `img/${icon}`;

        // Aplicar color de equipo a la UI
        const teamColor = TEAM_COLORS[icon] || '#00d2be';
        this.dom.style.setProperty('--team-color', teamColor);

        // 2. Efecto de descifrado (scramble) para el mensaje en doble comillas
        const formattedMessage = `"${message}"`;
        // Pasamos false para que scrambleText no añada comillas extra
        UIUtils.scrambleText(this.els.message, formattedMessage, 30, false);

        // Activar visualmente
        this.dom.classList.add('active');
        this.isActive = true;

        // Programar cierre
        this.timer = setTimeout(() => {
            this.hide();
        }, displayTime);
    }

    hide() {
        this.dom.classList.remove('active');
        this.isActive = false;
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
    }

    isVisible() {
        return this.isActive;
    }
}
