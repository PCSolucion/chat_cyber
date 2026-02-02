import EventManager from '../utils/EventEmitter.js';

/**
 * XPDisplayManager - Gestión de UI para el Sistema de XP (Integrado en Widget)
 * 
 * Responsabilidades:
 * - Actualizar barra de progreso de XP en el widget
 * - Mostrar animaciones de Level Up inline
 * - Mostrar indicadores de XP ganado
 * 
 * @class XPDisplayManager
 */
export default class XPDisplayManager {
    /**
     * Constructor del manager de display de XP
     * @param {Object} config - Configuración global
     * @param {ExperienceService} experienceService - Servicio de XP
     * @param {AchievementService} achievementService - Servicio de Logros
     */
    constructor(config, experienceService, achievementService) {
        this.config = config;
        this.experienceService = experienceService;
        this.achievementService = achievementService;

        // Referencias DOM
        this.dom = {
            xpSection: null,
            xpLevel: null,
            xpProgressFill: null,
            xpCurrent: null,
            xpNext: null,
            xpTitle: null,
            xpGainContainer: null,
            levelUpInline: null,
            levelUpNumber: null,
            xpAchievements: null
        };

        // Cache de total logros
        this.totalAchievements = 0;
        if (this.achievementService && this.achievementService.achievements) {
            this.totalAchievements = Object.keys(this.achievementService.achievements).length;
        }

        // Estado
        this.levelUpTimeout = null;
        this.isShowingLevelUp = false;

        // Configuración de animaciones
        this.levelUpDisplayTime = config.XP_LEVELUP_DISPLAY_TIME || 3000;

        // Inicializar cuando DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Inicializa el manager
     */
    init() {
        this.initDOMReferences();
        this.bindToExperienceService();

        if (this.config.DEBUG) {
            console.log('✅ XPDisplayManager inicializado');
        }
    }

    /**
     * Inicializa referencias a elementos DOM
     */
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
            // Referencias del nuevo Overlay estilo Cyberpunk
            cpLevelOverlay: document.getElementById('cp-levelup-overlay'),
            cpNewLevel: document.getElementById('cp-new-level'),
            cpNewTitle: document.getElementById('cp-new-title'),
            cpUsername: document.getElementById('cp-username'),
            // Referencias antiguas (mantenidas por seguridad o si se usan en layouts legacy)
            levelUpInline: document.getElementById('xp-levelup-inline'),
            levelUpNumber: document.getElementById('levelup-number'),
            xpAchievements: document.getElementById('xp-achievements')
        };
    }

    /**
     * Registra callbacks en el sistema de eventos
     */
    bindToExperienceService() {
        // Suscribirse al evento global de level up
        EventManager.on('user:levelUp', (eventData) => {
            this.showLevelUp(eventData);
        });
    }

    /**
     * Actualiza toda la UI de XP para un usuario
     * @param {string} username - Nombre del usuario
     * @param {Object} xpResult - Resultado del tracking de XP (opcional)
     */
    updateXPDisplay(username, xpResult = null) {
        if (!this.experienceService) return;

        // Obtener info de XP - usar xpResult directamente si está disponible
        // trackMessage devuelve: { level, levelProgress, levelTitle, ... }
        // getUserXPInfo devuelve: { level, progress, title, ... }
        const xpInfo = xpResult || this.experienceService.getUserXPInfo(username);

        // Normalizar nombres de propiedades (trackMessage usa levelProgress, getUserXPInfo usa progress)
        const progress = xpInfo.levelProgress || xpInfo.progress;
        const title = xpInfo.levelTitle || xpInfo.title || 'CIVILIAN';
        const level = xpInfo.level || 1;

        // Actualizar nivel
        if (this.dom.xpLevel) {
            this.dom.xpLevel.textContent = level;
        }

        // Actualizar barra de progreso (Efecto Tipo Fighting Game)
        if (progress) {
            const percentage = Math.max(0, progress.percentage || 0);

            // 1. Ghost Bar (Blanca): Se mueve RÁPIDO al nuevo valor
            if (this.dom.xpProgressGhost) {
                this.dom.xpProgressGhost.style.width = `${percentage}%`;
            }

            // 2. Fill Bar (Roja): Se mueve VEINTA al nuevo valor, cubriendo el blanco
            if (this.dom.xpProgressFill) {
                this.dom.xpProgressFill.style.width = `${percentage}%`;

                // Trigger reflow just in case
                void this.dom.xpProgressFill.offsetWidth;
            }
        }

        // Actualizar texto de XP
        if (this.dom.xpCurrent && progress) {
            const currentXP = Math.max(0, progress.xpInCurrentLevel || 0);
            this.dom.xpCurrent.textContent = this.formatNumber(currentXP);
        }

        if (this.dom.xpNext && progress) {
            this.dom.xpNext.textContent = this.formatNumber(progress.xpNeededForNext || 100);
        }

        // Actualizar título
        if (this.dom.xpTitle) {
            this.dom.xpTitle.textContent = title;
        }

        // Actualizar Racha (Streak)
        const streakContainer = document.getElementById('xp-streak');
        if (streakContainer) {
            // Obtener días de racha y multiplicador del xpResult
            const streakDays = xpInfo.streakDays || (xpResult && xpResult.streakDays) || 0;
            const multiplier = xpInfo.streakMultiplier || (xpResult && xpResult.streakMultiplier) || 1;

            streakContainer.style.display = 'flex';

            // Formatear multiplicador: mostrar decimales solo si es necesario (x1.5 vs x2)
            const multDisplay = multiplier % 1 === 0 ? multiplier : multiplier.toFixed(1);

            // Mostrar con etiquetas descriptivas
            streakContainer.innerHTML = `
                <span class="streak-label">RACHA:</span>
                <span class="streak-days">${streakDays}d</span>
                <span class="streak-mult" style="font-size: 0.75em; ${multiplier <= 1 ? 'opacity: 0.5;' : ''}">x${multDisplay}</span>
            `;
            streakContainer.title = `Racha: ${streakDays} días consecutivos (Bonus de XP: x${multDisplay})`;
        }

        // Actualizar Contadores de Logros
        if (this.dom.xpAchievements && this.totalAchievements > 0) {
            const unlockedCount = (xpInfo.achievements || []).length;
            const percentage = Math.min(100, Math.max(0, (unlockedCount / this.totalAchievements) * 100));

            this.dom.xpAchievements.style.display = 'block';
            this.dom.xpAchievements.innerHTML = `
                <div class="achievement-bar-container" title="Logros: ${unlockedCount}/${this.totalAchievements} (${percentage.toFixed(1)}%)">
                    <span class="achievement-label">LOGROS</span>
                    <div class="achievement-bar-track">
                        <div class="achievement-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="achievement-bar-text">${unlockedCount}/${this.totalAchievements}</span>
                </div>
            `;
        }

        // Mostrar XP ganado si hay
        if (xpResult && xpResult.xpGained > 0) {
            this.showXPGain(xpResult.xpGained);
        }
    }

    /**
     * Muestra indicador de XP ganado (+XP)
     * @param {number} xpGained - Cantidad de XP ganado
     */
    showXPGain(xpGained) {
        if (!this.dom.xpGainContainer) return;

        const indicator = document.createElement('div');
        indicator.className = 'xp-gain-indicator';
        indicator.textContent = `+${xpGained}`;

        this.dom.xpGainContainer.appendChild(indicator);

        // Triggerear animación
        requestAnimationFrame(() => {
            indicator.classList.add('show');
        });

        // Remover después de la animación
        setTimeout(() => {
            indicator.classList.add('fade-out');
            setTimeout(() => {
                indicator.remove();
            }, 300);
        }, 1200);
    }

    /**
     * Muestra la animación de Level Up (Overlay estilo Cyberpunk 2077)
     * @param {Object} eventData - Datos del evento de level-up
     */
    showLevelUp(eventData) {
        // 1. NUEVO OVERLAY (Cyberpunk 2077 Full Screen)
        if (this.dom.cpLevelOverlay) {
            // Limpiar timeout anterior
            if (this.levelUpTimeout) {
                clearTimeout(this.levelUpTimeout);
            }

            // Actualizar datos en el overlay
            if (this.dom.cpNewLevel) {
                this.dom.cpNewLevel.textContent = eventData.newLevel;
            }
            if (this.dom.cpNewTitle) {
                this.dom.cpNewTitle.textContent = eventData.title || 'MERCENARY';
            }
            // Actualizar usuario
            if (this.dom.cpUsername) {
                this.dom.cpUsername.textContent = eventData.username || 'UNKNOWN';
            }

            // Mostrar Overlay
            this.dom.cpLevelOverlay.classList.remove('hidden');
            void this.dom.cpLevelOverlay.offsetWidth; // Force reflow
            this.dom.cpLevelOverlay.classList.add('show');

            this.isShowingLevelUp = true;

            // Añadir efecto global al container
            const container = document.querySelector('.container');
            if (container) {
                container.classList.add('level-up-effect');
            }

            // Ocultar después del tiempo configurado (Aumentado 2s extra)
            this.levelUpTimeout = setTimeout(() => {
                this.hideLevelUp();
            }, this.levelUpDisplayTime + 3000);

            if (this.config.DEBUG) {
                console.log(`🎉 CP2077 Level Up mostrado: ${eventData.username} → LVL ${eventData.newLevel}`);
            }
        }

        // 2. ANIMACIÓN LEGACY (Inline / Roja dentro del chat)
        // Ejecutar SIEMPRE, independientemente del overlay nuevo
        if (this.dom.levelUpInline) {
            if (this.dom.levelUpNumber) this.dom.levelUpNumber.textContent = eventData.newLevel;
            // El título ya se actualiza en el overlay, pero por si acaso

            this.dom.levelUpInline.classList.add('show');
            this.isShowingLevelUp = true;

            // Si no hay overlay nuevo controlando el timeout, usar este
            if (!this.dom.cpLevelOverlay) {
                this.levelUpTimeout = setTimeout(() => {
                    this.hideLevelUp();
                }, this.levelUpDisplayTime);
            }
        }

        // Audio is now handled by AudioManager listening to the same event
    }

    /**
     * Oculta la animación de Level Up
     */
    hideLevelUp() {
        // 1. Ocultar Overlay Nuevo
        if (this.dom.cpLevelOverlay) {
            this.dom.cpLevelOverlay.classList.remove('show');

            const container = document.querySelector('.container');
            if (container) {
                container.classList.remove('level-up-effect');
            }
        }

        // 2. Ocultar Animación Legacy
        if (this.dom.levelUpInline) {
            this.dom.levelUpInline.classList.remove('show');
            this.dom.levelUpInline.classList.add('hiding');

            // Si no estaba cubierto por el overlay nuevo (redundancia de seguridad)
            const container = document.querySelector('.container');
            if (container && !this.dom.cpLevelOverlay) container.classList.remove('level-up-effect');

            setTimeout(() => {
                this.dom.levelUpInline.classList.remove('hiding');
            }, 400);
        }

        // Reset global state
        setTimeout(() => {
            this.isShowingLevelUp = false;
        }, 400);
    }

    /**
     * Formatea números grandes (1000 -> 1K)
     * @param {number} num - Número a formatear
     * @returns {string}
     */
    formatNumber(num) {
        if (num === undefined || num === null) return '0';
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 10000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Reinicia la visualización de XP (para nuevo mensaje)
     */
    reset() {
        if (this.dom.xpGainContainer) {
            this.dom.xpGainContainer.innerHTML = '';
        }

        if (this.isShowingLevelUp) {
            this.hideLevelUp();
        }
    }

    /**
     * Muestra/oculta la sección de XP completa
     * @param {boolean} visible - Si debe ser visible
     */
    setVisible(visible) {
        if (this.dom.xpSection) {
            this.dom.xpSection.style.display = visible ? 'block' : 'none';
        }
    }
}
