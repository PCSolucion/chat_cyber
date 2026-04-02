import EventManager from '../../utils/EventEmitter.js';
import UIUtils from '../../utils/UIUtils.js';
import Logger from '../../utils/Logger.js';
import { DEFAULTS } from '../../constants/AppConstants.js';

/**
 * F1DriverCardOverlay - Floating F1 TV-style "Driver Card" overlay
 * 
 * Shows a broadcast-style graphic spotlighting a featured user during idle mode.
 * Renders OUTSIDE the main widget container, floating independently on screen.
 * 
 * Design: Mimics the F1 TV live broadcast driver comparison graphics —
 * driver number, name, team/rank, speed-like telemetry stats.
 * 
 * @class F1DriverCardOverlay
 */
export default class F1DriverCardOverlay {
    constructor(sessionStatsService) {
        this.statsService = sessionStatsService;
        this.overlayEl = null;
        this.isVisible = false;
        this.rotationTimer = null;
        this.currentUserIndex = 0;
        this.DISPLAY_DURATION = 10000; // 10s per card (as requested)
        this.CARD_COUNT = 1; // Only 1 user max per cycle (as requested)

        Logger.info('F1DriverCard', '🏎️ Overlay initialized');
        this._createOverlayContainer();
        this._setupEventListeners();
    }

    // ─── LIFECYCLE ───────────────────────────────────────

    _createOverlayContainer() {
        if (document.getElementById('f1-driver-card-overlay')) {
            this.overlayEl = document.getElementById('f1-driver-card-overlay');
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'f1-driver-card-overlay';
        overlay.className = 'f1-driver-card-overlay';
        document.body.appendChild(overlay);
        this.overlayEl = overlay;
        Logger.debug('F1DriverCard', 'Overlay container created in DOM');
    }

    _setupEventListeners() {
        // No longer using global events, IdleDisplayManager calls methods directly
    }

    // ─── PUBLIC API ──────────────────────────────────────

    /**
     * Force-shows a driver card with given data (for testing)
     */
    showTestCard(userData = null) {
        clearTimeout(this.rotationTimer);
        const data = userData || this._generateTestData();
        this._renderCard(data);
        this._animateIn();

        // Auto-hide after duration
        this.rotationTimer = setTimeout(() => {
            this._animateOut();
            this.currentUserIndex = this.CARD_COUNT; // Fake reaching the end so it doesn't loop
        }, this.DISPLAY_DURATION);
    }

    /**
     * Starts the idle rotation cycle
     */
    startRotation() {
        clearTimeout(this.rotationTimer);
        this.currentUserIndex = 0;
        this._showNextCard();
    }

    /**
     * Hides and stops rotation
     */
    hide() {
        clearTimeout(this.rotationTimer);
        this._animateOut();
        this.currentUserIndex = this.CARD_COUNT;
    }

    // ─── ROTATION LOGIC ──────────────────────────────────

    _showNextCard() {
        if (this.currentUserIndex >= this.CARD_COUNT) {
            return;
        }

        const users = this._getTopUsers();
        if (!users || users.length === 0) {
            this.showTestCard();
            return;
        }

        const userIndex = this.currentUserIndex % users.length;
        const user = users[userIndex];
        const cardData = this._buildCardData(user, userIndex + 1);

        this._renderCard(cardData);
        this._animateIn();

        this.currentUserIndex++;

        // Schedule exit and potential next card
        this.rotationTimer = setTimeout(() => {
            this._animateOut();
            
            // Only schedule another if we haven't reached the limit
            if (this.currentUserIndex < this.CARD_COUNT) {
                setTimeout(() => this._showNextCard(), 600); 
            }
        }, this.DISPLAY_DURATION);
    }

    // ─── DATA ────────────────────────────────────────────

    _getTopUsers() {
        if (!this.statsService) return [];

        try {
            const stats = this.statsService.getDisplayStats();
            return (stats?.topUsers || []).slice(0, 5);
        } catch {
            return [];
        }
    }

    _buildCardData(user, position) {
        // Calculate "speed" metrics from user stats
        const msgsPerMin = user.messages > 0
            ? (user.messages / Math.max(1, this._getSessionMinutes())).toFixed(1)
            : '0.0';

        const level = user.level || 1;
        const title = user.title || 'SPECTATOR';

        // Resolve user icon (team logo) based on logic from IdentityComponent
        const uiConfig = window.appConfig?.UI || DEFAULTS.UI;
        const isAdmin = user.username?.toLowerCase() === (window.appConfig?.BROADCASTER_USERNAME || DEFAULTS.BROADCASTER_USERNAME).toLowerCase();
        
        let icon = null;
        if (isAdmin) icon = uiConfig.SPECIAL_ICONS?.ADMIN;
        else if (level >= 1 && level <= 10) icon = 'williams.png';
        else icon = uiConfig.RANK_ICONS?.[title.toUpperCase()] || 'ferrari.png';

        // Determine team background color based on the selected icon
        let teamBgColor = '#181b1f'; // Default for all others
        if (icon === 'ferrari.png') {
            teamBgColor = '#e10600'; // Ferrari Red
        } else if (icon === 'mercedes-logo.png') {
            teamBgColor = '#479D9B'; // Mercedes Teal
        }

        return {
            position,
            username: user.username || 'UNKNOWN',
            teamColor: teamBgColor,
            teamIcon: `img/${icon}`,
            level,
            stats: {
                msgs: user.messages || 0,
                mpm: msgsPerMin,
                title: title,
                level: level
            }
        };
    }

    _generateTestData() {
        return {
            position: 1,
            username: 'ESTE_ES_UN_NOMBRE_MUY_LARGO_PARA_TESTEAR',
            team: 'P1 — LÍDER DE SESIÓN',
            teamColor: '#e10600',
            teamStripe: '#ff2d22',
            level: 42,
            stats: {
                msgs: 287,
                mpm: '4.2',
                xp: '12.4K',
                level: 42
            }
        };
    }

    _getSessionMinutes() {
        if (!this.statsService?.sessionStart) return 1;
        return Math.max(1, (Date.now() - this.statsService.sessionStart) / 60000);
    }

    _formatNumber(n) {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return String(n);
    }

    // ─── RENDERING ───────────────────────────────────────

    _renderCard(data) {
        if (!this.overlayEl) return;

        const safeName = UIUtils.escapeHTML(data.username).toUpperCase();

        this.overlayEl.innerHTML = `
            <div class="driver-card" style="--team-color: ${data.teamColor};">
                <!-- Header: Title -->
                <div class="dc-header">
                    PIT LANE
                </div>
                
                <!-- Middle: Identity -->
                <div class="dc-middle">
                    <div class="dc-rank">${data.position}</div>
                    <div class="dc-team-block">
                        <img src="${data.teamIcon}" class="dc-team-logo" onerror="this.style.display='none'" />
                    </div>
                    <div class="dc-name" id="dc-name-wrapper">
                        <span class="dc-name-inner" id="dc-name-inner" style="display:inline-block; transform-origin:left center; white-space:nowrap;">${safeName}</span>
                    </div>
                </div>

                <!-- Footer: Stats -->
                <div class="dc-footer">
                    <div class="dc-label-group">
                        <span class="dc-label-line">MSG</span>
                        <span class="dc-label-line">TODAY</span>
                    </div>
                    <div class="dc-stat-value">${data.stats.msgs}</div>
                </div>
            </div>
        `;

        // Apply scale logic immediately after rendering into DOM
        this._fitUsername();
    }

    _fitUsername() {
        const wrapper = this.overlayEl.querySelector('#dc-name-wrapper');
        const inner = this.overlayEl.querySelector('#dc-name-inner');
        if (!wrapper || !inner) return;

        // Reset to initial state to measure
        inner.style.fontSize = '';
        inner.style.transform = '';
        
        // Let the browser calculate the layout before measuring
        requestAnimationFrame(() => {
            // Temporarily use block display for measurement to avoid flex constraints interfering
            wrapper.style.display = 'block';
            const availableWidth = wrapper.clientWidth - 28; // Account for padding (14px L + 14px R)
            wrapper.style.display = ''; // Restore flex

            // If still no width (not attached/rendered), wait
            if (availableWidth <= 0) {
                if (this.isVisible) {
                    setTimeout(() => this._fitUsername(), 50);
                }
                return;
            }

            const textWidth = inner.scrollWidth;
            if (textWidth <= availableWidth) return;

            // 1. Reduce font size
            let currentFontSize = parseFloat(window.getComputedStyle(inner).fontSize) || 22.4; // 1.4rem approx
            const minFontSize = 10; // Reduced minimum readable font size for very long names

            while (inner.scrollWidth > availableWidth && currentFontSize > minFontSize) {
                currentFontSize -= 0.5;
                inner.style.fontSize = `${currentFontSize}px`;
                
                // Safety break
                if (currentFontSize <= minFontSize) break;
            }

            // 2. Lateral compression (scaleX) if it still doesn't fit
            // Use current scrollWidth after font reduction
            const finalScrollWidth = inner.scrollWidth;
            if (finalScrollWidth > availableWidth) {
                const ratio = availableWidth / finalScrollWidth;
                const boundedScale = Math.max(0.3, ratio * 0.98); // Allow tighter squeeze
                inner.style.transform = `scaleX(${boundedScale})`;
            }
        });
    }

    // ─── ANIMATIONS ──────────────────────────────────────

    _animateIn() {
        if (!this.overlayEl) return;
        
        // GUARD: If already visible, don't re-trigger animation classes
        if (this.isVisible && this.overlayEl.classList.contains('dc-visible')) {
            console.log('[F1DriverCard] Animation skipped (already visible)');
            return;
        }

        console.log('[F1DriverCard] Triggering entrance animation...');
        this.isVisible = true;
        this.overlayEl.classList.remove('dc-exit');
        this.overlayEl.classList.add('dc-visible', 'dc-enter');

        // Removing the 'dc-enter' class causes a layout reflow on some browsers, triggering a flash.
        // We keep it until we explicitly animate out.
        // setTimeout(() => { ... }, 700);
    }

    _animateOut() {
        if (!this.overlayEl) return;
        this.overlayEl.classList.remove('dc-enter');
        this.overlayEl.classList.add('dc-exit');

        setTimeout(() => {
            if (this.overlayEl) {
                this.overlayEl.classList.remove('dc-visible', 'dc-exit');
                this.isVisible = false;
            }
        }, 500);
    }

    // ─── CLEANUP ─────────────────────────────────────────

    destroy() {
        this.hide();

        if (this.overlayEl?.parentNode) {
            this.overlayEl.parentNode.removeChild(this.overlayEl);
        }
    }
}
