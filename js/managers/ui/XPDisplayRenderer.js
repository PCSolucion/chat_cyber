import UIUtils from "../../utils/UIUtils.js";

/**
 * XPDisplayRenderer - Gestión de UI y Animaciones para el Sistema de XP
 * 
 * Responsabilidades:
 * - Actualizar elementos DOM de la sección de XP
 * - Gestionar indicadores de ganancia (+XP)
 * - Ejecutar animaciones de Level Up (Inline y Overlay)
 * - Generar efectos de partículas visuales
 * 
 * @class XPDisplayRenderer
 */
export default class XPDisplayRenderer {
    constructor(config) {
        this.config = config;
        this.dom = {};
        this.currentGainElement = null;
        this.gainTimer = null;
        this.levelUpTimeout = null;
        this.levelUpDisplayTime = config.XP_LEVELUP_DISPLAY_TIME || 3000;
        
        this.initDOMReferences();
    }

    initDOMReferences() {
        this.dom = {
            xpSection: document.getElementById('xp-section'),
            xpLevel: document.getElementById('xp-level'),
            xpProgressFill: document.getElementById('xp-progress-fill'),
            xpProgressGhost: document.getElementById('xp-progress-ghost'),
            xpCurrent: document.getElementById('xp-current'),
            xpNext: document.getElementById('xp-next'),
            xpTitle: document.getElementById('xp-title'),
            xpGainContainer: document.getElementById('xp-gain-container'),
            cpLevelOverlay: document.getElementById('cp-levelup-overlay'),
            cpNewLevel: document.getElementById('cp-new-level'),
            cpNewTitle: document.getElementById('cp-new-title'),
            cpUsername: document.getElementById('cp-username'),
            cpParticles: document.getElementById('levelup-particles'),
            levelUpInline: document.getElementById('xp-levelup-inline'),
            levelUpNumber: document.getElementById('levelup-number'),
            xpAchievements: document.getElementById('xp-achievements'),
            xpStreak: document.getElementById('xp-streak')
        };
    }

    /**
     * Actualiza la visualización base de XP
     */
    renderXP(data) {
        const { level, title, progress, streak, achievements } = data;

        if (this.dom.xpSection && this.dom.xpSection.style.display === 'none') {
            this.dom.xpSection.style.display = 'block';
        }

        if (this.dom.xpLevel) this.dom.xpLevel.textContent = level;
        if (this.dom.xpTitle) this.dom.xpTitle.textContent = title;

        if (progress) {
            const percentage = Math.max(0, progress.percentage || 0);
            if (this.dom.xpProgressGhost) this.dom.xpProgressGhost.style.width = `${percentage}%`;
            if (this.dom.xpProgressFill) {
                this.dom.xpProgressFill.style.width = `${percentage}%`;
                void this.dom.xpProgressFill.offsetWidth;
            }
            if (this.dom.xpCurrent) this.dom.xpCurrent.textContent = this.formatNumber(progress.currentXP);
            if (this.dom.xpNext) this.dom.xpNext.textContent = this.formatNumber(progress.nextXP);
        }

        if (streak) {
            this.renderStreak(streak);
        }

        if (achievements) {
            this.renderAchievementProgress(achievements);
        }
    }

    /**
     * Renderiza la racha de días
     */
    renderStreak(streak) {
        if (!this.dom.xpStreak) return;

        let streakHTML = '';
        if (streak.isReturning && streak.daysAway > 0) {
            streakHTML += `
                <span class="reconnected-tag">
                    <span class="reconnected-icon">⟐</span>
                    <span class="reconnected-text">RECONNECTED</span>
                    <span class="reconnected-days">${streak.daysAway}d OFF</span>
                </span>
            `;
        }

        if (streak.days >= 1) {
            const multDisplay = streak.multiplier % 1 === 0 ? streak.multiplier : streak.multiplier.toFixed(1);
            streakHTML += `
                <span class="streak-label">RACHA:</span>
                <span class="streak-days">${streak.days}d</span>
                <span class="streak-mult" style="font-size: 0.75em;">x${multDisplay}</span>
            `;
        }

        this.dom.xpStreak.innerHTML = streakHTML;
        if (streakHTML) {
            this.dom.xpStreak.style.display = 'flex';
            this.dom.xpStreak.classList.add('active');
        } else {
            this.dom.xpStreak.style.display = 'none';
            this.dom.xpStreak.classList.remove('active');
        }
    }

    /**
     * Renderiza el progreso de logros en el widget
     */
    renderAchievementProgress(data) {
        if (!this.dom.xpAchievements) return;

        const { unlocked, total } = data;
        const percentage = Math.min(100, Math.max(0, (unlocked / total) * 100));

        this.dom.xpAchievements.style.display = 'block';
        this.dom.xpAchievements.innerHTML = `
            <div class="achievement-bar-container" title="Logros: ${unlocked}/${total} (${percentage.toFixed(1)}%)">
                <span class="achievement-label">LOGROS</span>
                <div class="achievement-bar-track">
                    <div class="achievement-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="achievement-bar-text">${unlocked}/${total}</span>
            </div>
        `;
    }

    /**
     * Muestra indicador de XP ganado (+XP)
     */
    renderXPGain(amount) {
        if (!this.dom.xpGainContainer || amount <= 0) return;

        if (this.currentGainElement && !this.currentGainElement.classList.contains('fade-out')) {
            const currentAmount = parseInt(this.currentGainElement.dataset.amount || 0);
            const newTotal = currentAmount + amount;
            
            this.currentGainElement.dataset.amount = newTotal;
            this.currentGainElement.textContent = `+${newTotal}`;
            
            this.currentGainElement.classList.remove('show');
            void this.currentGainElement.offsetWidth;
            this.currentGainElement.classList.add('show');
        } else {
            if (this.currentGainElement) {
                this.currentGainElement.remove();
                clearTimeout(this.gainTimer);
            }
            
            const indicator = document.createElement('div');
            indicator.className = 'xp-gain-indicator';
            indicator.textContent = `+${amount}`;
            indicator.dataset.amount = amount;

            this.dom.xpGainContainer.appendChild(indicator);
            this.currentGainElement = indicator;

            requestAnimationFrame(() => {
                indicator.classList.add('show');
            });
        }

        if (this.gainTimer) clearTimeout(this.gainTimer);
        this.gainTimer = setTimeout(() => {
            if (this.currentGainElement) {
                this.currentGainElement.classList.add('fade-out');
                setTimeout(() => {
                    if (this.currentGainElement && this.currentGainElement.classList.contains('fade-out')) {
                        this.currentGainElement.remove();
                        this.currentGainElement = null;
                    }
                }, 300);
            }
        }, 1200);
    }

    /**
     * Muestra la animación de Level Up Inline
     */
    renderLevelUpInline(newLevel) {
        if (this.dom.xpSection) this.dom.xpSection.style.display = 'block';

        if (this.dom.levelUpInline) {
            if (this.dom.levelUpNumber) {
                this.dom.levelUpNumber.textContent = newLevel;
            }

            this.dom.levelUpInline.classList.add('show');

            setTimeout(() => {
                this.hideLevelUpInline();
            }, this.levelUpDisplayTime);
        }
    }

    /**
     * Muestra la animación de Level Up en el Overlay Superior
     */
    renderTopLevelUp(eventData) {
        if (!this.dom.cpLevelOverlay) return;

        if (this.levelUpTimeout) clearTimeout(this.levelUpTimeout);

        if (this.dom.cpNewLevel) this.dom.cpNewLevel.textContent = eventData.newLevel;
        if (this.dom.cpNewTitle) UIUtils.scrambleText(this.dom.cpNewTitle, eventData.title || 'MERCENARY', 30, false);
        if (this.dom.cpUsername) UIUtils.scrambleText(this.dom.cpUsername, eventData.username || 'UNKNOWN', 40, false);

        this.dom.cpLevelOverlay.classList.remove('hidden');
        void this.dom.cpLevelOverlay.offsetWidth;
        this.dom.cpLevelOverlay.classList.add('show');

        const container = document.querySelector('.container');
        if (container) {
            container.classList.add('level-up-effect');
            container.classList.add('shake-impact');
            setTimeout(() => container.classList.remove('shake-impact'), 1000);
        }

        this.createLevelUpParticles();

        this.levelUpTimeout = setTimeout(() => {
            this.hideTopLevelUp();
        }, this.levelUpDisplayTime + 4000);
    }

    hideTopLevelUp() {
        if (this.dom.cpLevelOverlay) {
            this.dom.cpLevelOverlay.classList.add('hiding');
            this.dom.cpLevelOverlay.classList.remove('show');

            setTimeout(() => {
                this.dom.cpLevelOverlay.classList.remove('hiding');
                const container = document.querySelector('.container');
                if (container) container.classList.remove('level-up-effect');
            }, 250);
        }
    }

    hideLevelUpInline() {
        if (this.dom.levelUpInline) {
            this.dom.levelUpInline.classList.remove('show');
            this.dom.levelUpInline.classList.add('hiding');
            setTimeout(() => {
                this.dom.levelUpInline.classList.remove('hiding');
            }, 400);
        }
    }

    createLevelUpParticles() {
        if (!this.dom.cpParticles) return;
        this.dom.cpParticles.innerHTML = '';

        for (let i = 0; i < 40; i++) {
            const bit = document.createElement('div');
            bit.className = 'data-bit';
            const angle = Math.random() * Math.PI * 2;
            const velocity = 100 + Math.random() * 300;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;
            bit.style.setProperty('--tx', `${tx}px`);
            bit.style.setProperty('--ty', `${ty}px`);
            bit.style.left = '0px';
            bit.style.top = '0px';
            const duration = 0.5 + Math.random() * 1.5;
            bit.style.animation = `bit-explode ${duration}s cubic-bezier(0.19, 1, 0.22, 1) forwards`;
            this.dom.cpParticles.appendChild(bit);
        }
    }

    formatNumber(num) {
        if (num === undefined || num === null) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 10000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    /**
     * Efecto visual para suscriptores (Gold Mode)
     */
    renderGoldMode(subInfo) {
        if (!this.dom.xpTitle) return;

        const subValue = subInfo.badgeInfo?.subscriber || '1';
        
        // Efecto Scramble para resaltar estatus
        UIUtils.scrambleText(this.dom.xpTitle, 'EXCELSIOR USER', 30, false);
        
        setTimeout(() => {
            if (this.dom.xpTitle) {
                UIUtils.scrambleText(this.dom.xpTitle, `SUB ${subValue} MESES`, 30, false);
            }
        }, 2000);
    }

    reset() {
        if (this.dom.xpGainContainer) this.dom.xpGainContainer.innerHTML = '';
        this.hideTopLevelUp();
        this.hideLevelUpInline();
    }

    setVisible(visible) {
        if (this.dom.xpSection) this.dom.xpSection.style.display = visible ? 'block' : 'none';
    }
}
