import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

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
        this._updateTotalAchievements();

        // Estado
        this.levelUpTimeout = null;
        this.isShowingLevelUp = false;

        // Configuración de animaciones
        this.levelUpDisplayTime = config.XP_LEVELUP_DISPLAY_TIME || 3000;
        
        // El usuario que se está mostrando actualmente en el widget
        this.currentUsername = null;

        // Inicializar cuando DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Actualiza el total de logros disponibles desde el servicio
     * @private
     */
    _updateTotalAchievements() {
        if (this.achievementService) {
            this.totalAchievements = this.achievementService.getTotalAchievements();
            if (this.totalAchievements === 0 && this.config.DEBUG) {
                console.warn('⚠️ XPDisplayManager: Total de logros detectado como 0. Verifique la carga de AchievementsData.js');
            }
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
        // La animación de Level Up ahora se maneja exclusivamente a través 
        // de NotificationManager para asegurar el orden y sincronización.

        // Suscribirse a ganancias de XP
        EventManager.on(EVENTS.USER.XP_GAINED, (data) => {
            // SOLO actualizar si el usuario que ganó XP es el que está actualmente en el mensaje
            // O si no hay nadie pero la sección de XP está activa (poco probable con el nuevo sistema de colas)
            if (this.currentUsername && data.username === this.currentUsername) {
                if (this.dom.xpSection && this.dom.xpSection.style.display !== 'none') {
                    this.updateXPDisplay(data.username);
                }
            }
        });
    }

    /**
     * Actualiza toda la UI de XP para un usuario
     * @param {string} username - Nombre del usuario
     * @param {Object} xpResult - Resultado del tracking de XP (opcional)
     */
    updateXPDisplay(username, xpResult = null) {
        if (!this.experienceService) return;
        
        // Registrar quién es el usuario activo para futuros eventos
        this.currentUsername = username;

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

        // Actualizar Racha (Streak) - Solo mostrar si es relevante (> 1 día)
        const streakContainer = document.getElementById('xp-streak');
        if (streakContainer) {
            // Obtener días de racha y multiplicador del xpResult
            const streakDays = xpInfo.streakDays || (xpResult && xpResult.streakDays) || 0;
            const multiplier = xpInfo.streakMultiplier || (xpResult && xpResult.streakMultiplier) || 1;

            // Determinar si es usuario que vuelve
            const isReturning = xpResult && xpResult.isReturning;
            const daysAway = xpResult && xpResult.daysAway || 0;

            // Construir contenido del streak container
            let streakHTML = '';

            // Welcome Back tag (prioridad visual sobre streak)
            if (isReturning && daysAway > 0) {
                streakHTML += `
                    <span class="reconnected-tag">
                        <span class="reconnected-icon">⟐</span>
                        <span class="reconnected-text">RECONNECTED</span>
                        <span class="reconnected-days">${daysAway}d OFF</span>
                    </span>
                `;
            }

            // Solo mostrar streak si la racha es relevante (> 1 día)
            if (streakDays > 1) {
                // Formatear multiplicador: mostrar decimales solo si es necesario (x1.5 vs x2)
                const multDisplay = multiplier % 1 === 0 ? multiplier : multiplier.toFixed(1);

                streakHTML += `
                    <span class="streak-label">RACHA:</span>
                    <span class="streak-days">${streakDays}d</span>
                    <span class="streak-mult" style="font-size: 0.75em;">x${multDisplay}</span>
                `;
                streakContainer.title = `Racha: ${streakDays} días consecutivos (Bonus de XP: x${multDisplay})`;
            }

            if (streakHTML) {
                streakContainer.style.display = 'flex';
                streakContainer.innerHTML = streakHTML;
            } else {
                streakContainer.style.display = 'none';
                streakContainer.innerHTML = '';
            }
        }

        // Actualizar Contadores de Logros
        if (this.dom.xpAchievements && this.totalAchievements > 0) {
            // Siempre obtener los logros reales del servicio para evitar datos incompletos en xpResult
            const realUserData = this.experienceService.getUserData(null, username);
            const unlockedCount = (realUserData.achievements || []).length;
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
     * Muestra indicador de XP ganado de forma acumulativa (+XP)
     * Si ya hay un indicador visible, suma la cantidad y reinicia el temporizador.
     * @param {number} xpGained - Cantidad de XP ganado
     */
    showXPGain(xpGained) {
        if (!this.dom.xpGainContainer || xpGained <= 0) return;

        // Si ya hay un indicador activo y no se está desvaneciendo, acumulamos
        if (this.currentGainElement && !this.currentGainElement.classList.contains('fade-out')) {
            this._updateExistingGain(xpGained);
        } else {
            // Si no hay o se está yendo, creamos uno nuevo (limpiando el anterior si existe)
            if (this.currentGainElement) {
                this.currentGainElement.remove();
                clearTimeout(this.gainTimer);
            }
            this._createNewGain(xpGained);
        }
    }

    _createNewGain(amount) {
        const indicator = document.createElement('div');
        indicator.className = 'xp-gain-indicator';
        indicator.textContent = `+${amount}`;
        indicator.dataset.amount = amount; // Guardamos valor base para sumar

        this.dom.xpGainContainer.appendChild(indicator);
        this.currentGainElement = indicator;

        // Triggerear animación inicial
        requestAnimationFrame(() => {
            indicator.classList.add('show');
        });

        this._scheduleGainRemoval();
    }

    _updateExistingGain(amount) {
        const currentAmount = parseInt(this.currentGainElement.dataset.amount || 0);
        const newTotal = currentAmount + amount;
        
        this.currentGainElement.dataset.amount = newTotal;
        this.currentGainElement.textContent = `+${newTotal}`;
        
        // Pequeño efecto de "pulso" al actualizar
        this.currentGainElement.classList.remove('show');
        void this.currentGainElement.offsetWidth; // Trigger reflow
        this.currentGainElement.classList.add('show');

        // Reiniciar el temporizador de desaparición
        this._scheduleGainRemoval();
    }

    _scheduleGainRemoval() {
        if (this.gainTimer) clearTimeout(this.gainTimer);

        this.gainTimer = setTimeout(() => {
            if (this.currentGainElement) {
                this.currentGainElement.classList.add('fade-out');
                
                // Limpieza final tras la transición CSS
                setTimeout(() => {
                    if (this.currentGainElement && this.currentGainElement.classList.contains('fade-out')) {
                        this.currentGainElement.remove();
                        this.currentGainElement = null;
                    }
                }, 300);
            }
        }, 1200); // 1.2 segundos de visibilidad antes de desvanecer
    }

    /**
     * Muestra la animación de Level Up Inline (dentro del widget)
     * Se ejecuta de forma inmediata al detectar el evento.
     * @param {Object} eventData - Datos del evento de level-up
     */
    showLevelUp(eventData) {
        // SOLO ANIMACIÓN INLINE (Roja dentro del chat)
        // Aseguramos visibilidad del componente de XP (importante para el test panel)
        if (this.dom.xpSection) {
            this.dom.xpSection.style.display = 'block';
        }

        if (this.dom.levelUpInline) {
            if (this.dom.levelUpNumber) {
                this.dom.levelUpNumber.textContent = eventData.newLevel;
            }

            this.dom.levelUpInline.classList.add('show');
            this.isShowingLevelUp = true;

            // Ocultar después del tiempo base
            setTimeout(() => {
                this.hideLevelUpInline();
            }, this.levelUpDisplayTime);

            if (this.config.DEBUG) {
                console.log(`✨ Level Up Inline: ${eventData.username} → LVL ${eventData.newLevel}`);
            }
        }
    }

    /**
     * Muestra la animación de Level Up en el Overlay Superior (Estilo Cyberpunk 2077)
     * Llamado por NotificationManager para evitar solapamientos con logros.
     * @param {Object} eventData 
     */
    showTopLevelUp(eventData) {
        if (!this.dom.cpLevelOverlay) return;

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
        if (this.dom.cpUsername) {
            this.dom.cpUsername.textContent = eventData.username || 'UNKNOWN';
        }

        // Mostrar Overlay
        this.dom.cpLevelOverlay.classList.remove('hidden');
        void this.dom.cpLevelOverlay.offsetWidth; // Force reflow
        this.dom.cpLevelOverlay.classList.add('show');

        // Añadir efecto global al container
        const container = document.querySelector('.container');
        if (container) {
            container.classList.add('level-up-effect');
        }

        // Ocultar después del tiempo configurado (Aumentado 2s extra)
        this.levelUpTimeout = setTimeout(() => {
            this.hideTopLevelUp();
        }, this.levelUpDisplayTime + 3000);

        if (this.config.DEBUG) {
            console.log(`🚀 CP2077 Top Level Up: ${eventData.username} → LVL ${eventData.newLevel}`);
        }
    }

    /**
     * Oculta el Overlay Superior de Level Up
     */
    hideTopLevelUp() {
        if (this.dom.cpLevelOverlay) {
            this.dom.cpLevelOverlay.classList.remove('show');

            const container = document.querySelector('.container');
            if (container) {
                container.classList.remove('level-up-effect');
            }
        }
    }

    /**
     * Oculta la Animación Inline
     */
    hideLevelUpInline() {
        if (this.dom.levelUpInline) {
            this.dom.levelUpInline.classList.remove('show');
            this.dom.levelUpInline.classList.add('hiding');

            setTimeout(() => {
                this.dom.levelUpInline.classList.remove('hiding');
                this.isShowingLevelUp = false;
            }, 400);
        }
    }

    /**
     * Oculta ambas animaciones (Legacy compatibility)
     */
    hideLevelUp() {
        this.hideTopLevelUp();
        this.hideLevelUpInline();
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
        this.currentUsername = null;
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
