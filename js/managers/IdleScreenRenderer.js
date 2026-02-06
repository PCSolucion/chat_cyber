import UIUtils from '../utils/UIUtils.js';
import { IDLE } from '../constants/AppConstants.js';

/**
 * IdleScreenRenderer - Encargado de generar el HTML de las pantallas de inactividad
 * 
 * Extraído de IdleDisplayManager para mejorar la mantenibilidad y reducir el tamaño del archivo.
 * 
 * @class IdleScreenRenderer
 */
export default class IdleScreenRenderer {
    constructor(statsService) {
        this.statsService = statsService;
    }

    /**
     * Renderiza una pantalla específica en el contenedor
     * @param {Object} screenData Datos de la pantalla a renderizar
     * @param {HTMLElement} container Contenedor donde se insertará el contenido
     */
    render(screenData, container) {
        if (!container) return;
        if (!screenData) {
            container.innerHTML = '<div class="empty-message">ERROR: NO SCREEN DATA</div>';
            return;
        }

        // Limpiar contenedor
        container.innerHTML = '';

        // Crear contenedor para el contenido de la pantalla
        const screenContent = document.createElement('div');
        screenContent.className = 'idle-screen-content';
        container.appendChild(screenContent);

        // Crear contenido según tipo de pantalla con protección contra errores
        try {
            switch (screenData.type) {
                case 'summary':
                    this._renderSummaryScreen(screenData, screenContent);
                    break;
                case 'leaderboard':
                    this._renderLeaderboardScreen(screenData, screenContent);
                    break;
                case 'trending':
                    this._renderTrendingScreen(screenData, screenContent);
                    break;
                case 'achievements':
                    this._renderAchievementsScreen(screenData, screenContent);
                    break;
                case 'streaks':
                    this._renderStreaksScreen(screenData, screenContent);
                    break;
                case 'watchtime_session':
                case 'watchtime_total':
                    this._renderWatchTimeList(screenData, screenContent);
                    break;
                case 'last_achievement':
                    this._renderLastAchievementScreen(screenData, screenContent);
                    break;
                case 'top_subscribers':
                    this._renderTopSubsScreen(screenData, screenContent);
                    break;
                default:
                    this._renderSummaryScreen(screenData, screenContent);
            }
        } catch (error) {
            console.error(`❌ Error rendering idle screen of type ${screenData.type}:`, error);
            screenContent.innerHTML = `
                <div class="empty-message" style="font-size: 10px; opacity: 0.5;">
                    [INTERNAL_RENDER_ERROR]: ${screenData.type}<br>
                    FALLBACK_RECOVERY_ACTIVE
                </div>
            `;
            // Si falla la pantalla específica, mostrar al menos el resumen como fallback
            if (screenData.type !== 'summary') {
                setTimeout(() => {
                    try { this._renderSummaryScreen(screenData, screenContent); } catch(e) {}
                }, 1000);
            }
        }
    }

    /**
     * Calcula la duración óptima para una pantalla basada en su contenido
     * @param {Object} screenData Datos de la pantalla
     * @param {number} baseRotationMs Duración base configurada
     * @returns {number} Duración calculada en milisegundos
     */
    calculateScreenDuration(screenData, baseRotationMs) {
        // Asegurar que baseRotationMs es un número válido
        const rotationMs = (typeof baseRotationMs === 'number' && !isNaN(baseRotationMs)) 
            ? baseRotationMs 
            : (IDLE.DEFAULT_ROTATION_MS || 12000);
            
        let duration = rotationMs;
        
        if (!screenData || !screenData.type) return duration;

        // Si es una lista con scroll, calcular tiempo basado en items
        if (['leaderboard', 'top_subscribers', 'watchtime_total', 'watchtime_session'].includes(screenData.type)) {
            const itemCount = (screenData.data || []).length;
            
            // Si hay scroll (más de 5 items)
            if (itemCount > 5) {
                // Cálculo: Tiempo base + tiempo por item extra
                // Reducimos a 1.4s por item para que sea más dinámico
                let multiplier = 1400;
                
                // Si es Top Suscriptores (última pantalla), lo hacemos aún más rápido (1.2s) para no demorar el cierre
                if (screenData.type === 'top_subscribers') {
                    multiplier = 1200;
                }
                
                const calculatedTime = Math.max(rotationMs, itemCount * multiplier);
                
                // Cap a un máximo razonable (30s)
                duration = Math.min(calculatedTime, 30000);
            }
        }

        // Reducir duración para Trending, Tiempo Total y Progreso Global
        if (screenData.type === 'trending' || screenData.type === 'watchtime_total') {
            duration = Math.max(4000, duration - 4000);
        }
        
        if (screenData.type === 'achievements') {
            duration = Math.max(4000, duration - 5000);
        }

        return duration;
    }

    /**
     * Anima un valor numérico contando hacia arriba
     * @param {string} elementId ID del elemento DOM
     * @param {number} start Valor inicial
     * @param {number} end Valor final
     * @param {number} duration Duración de la animación
     */
    animateValue(elementId, start, end, duration) {
        const obj = document.getElementById(elementId);
        if (!obj) return;
        
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Easing easeOutExpo
            const ease = (progress === 1) ? 1 : 1 - Math.pow(2, -10 * progress);
            
            obj.textContent = Math.floor(ease * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                 obj.textContent = end; // Ensure final value
            }
        };
        window.requestAnimationFrame(step);
    }

    /**
     * Renderiza pantalla de Watch Time como lista (estilo Leaderboard)
     * @private
     */
    _renderWatchTimeList(screenData, container) {
        const users = screenData.data || [];
        const title = screenData.title || 'TIEMPO DE VISUALIZACIÓN';

        let usersHtml = '';
        users.forEach((user, index) => {
            const rankClass = index === 0 ? 'top-1' : index < 3 ? 'top-3' : '';
            const delayStyle = `animation-delay: ${index * 0.3}s`;
            const delayClass = 'animate-hidden animate-in';
            
            usersHtml += `
                <div class="modern-list-item ${rankClass} ${delayClass}" style="${delayStyle}">
                    <div class="list-rank">#${index + 1}</div>
                    <div class="list-content">
                        <span class="list-name">${user.username}</span>
                    </div>
                    <div class="list-stat">
                        <span class="stat-num tabular-nums" style="color: var(--cyber-cyan);">${user.formatted}</span>
                    </div>
                </div>
            `;
        });

        if (users.length === 0) {
            usersHtml = '<div class="empty-message animate-hidden animate-in">ESPERANDO DATOS...</div>';
        }

        const shouldScroll = users.length > 5;
        const baseRotation = IDLE.DEFAULT_ROTATION_MS || 12000;
        const scrollDuration = this.calculateScreenDuration(screenData, baseRotation) / 1000;

        const content = `
            <div class="idle-list-scroll-wrapper ${shouldScroll ? 'animate-scroll' : ''}" 
                 style="${shouldScroll ? `animation-duration: ${scrollDuration}s;` : ''}">
                ${usersHtml}
            </div>
        `;

        container.innerHTML = `
            <div class="idle-screen-title wide-spacing animate-hidden animate-in">${title}</div>
            <div class="idle-list-container">
                ${content}
            </div>
        `;
    }

    /**
     * Renderiza pantalla de resumen con estilo moderno (Dashboard)
     * @private
     */
    _renderSummaryScreen(screenData, container) {
        const { data } = screenData;

        // Obtener hora de inicio formateada con fallback seguro
        const sessionStart = this.statsService?.sessionStart || Date.now();
        const startTime = new Date(sessionStart);
        const startTimeStr = UIUtils.formatClockTime(startTime);

        container.innerHTML = `
            <div class="idle-screen-title wide-spacing animate-hidden animate-in">RESUMEN DE SESIÓN</div>
            
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

        // Generar ticks decorativos
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

        setTimeout(() => {
            this.animateValue('stat-msgs', 0, parseInt(data.messages) || 0, 2500);
            this.animateValue('stat-users', 0, parseInt(data.users) || 0, 2500);
            
            const targetRotation = Math.min(180, (parseFloat(data.avgMpm) || 0) * 18);
            const needle = document.getElementById('gauge-needle');
            if (needle) {
                needle.style.transform = `rotate(${targetRotation}deg)`;
            }
        }, 800);
    }

    /**
     * Renderiza pantalla de leaderboard con estilo lista moderna
     * @private
     */
    _renderLeaderboardScreen(screenData, container) {
        const allUsers = screenData.data || [];
        const users = allUsers.slice(0, 20);

        let usersHtml = '';
        users.forEach((user, index) => {
            const rankClass = index === 0 ? 'top-1' : index < 3 ? 'top-3' : '';
            const delayClass = 'animate-hidden animate-in';
            const delayStyle = `animation-delay: ${index * 0.3}s`;
            
            usersHtml += `
                <div class="modern-list-item ${rankClass} ${delayClass}" style="${delayStyle}">
                    <div class="list-rank">#${index + 1}</div>
                    <div class="list-content">
                        <span class="list-name">${user.username}</span>
                        <span class="list-sub tabular-nums">NIVEL ${user.level}</span>
                    </div>
                    <div class="list-stat">
                        <span class="stat-num tabular-nums">${user.messages}</span>
                        <span class="stat-unit">msg</span>
                    </div>
                </div>
            `;
        });

        if (users.length === 0) {
            usersHtml = '<div class="empty-message animate-hidden animate-in">ESPERANDO ACTIVIDAD...</div>';
        }

        const shouldScroll = users.length > 5;
        const scrollDuration = this.calculateScreenDuration(screenData, IDLE.DEFAULT_ROTATION_MS) / 1000;

        const content = `
            <div class="idle-list-scroll-wrapper ${shouldScroll ? 'animate-scroll' : ''}" 
                 style="${shouldScroll ? `animation-duration: ${scrollDuration}s;` : ''}">
                ${usersHtml}
            </div>
        `;

        container.innerHTML = `
            <div class="idle-screen-title wide-spacing animate-hidden animate-in">TOP ACTIVOS (${users.length})</div>
            <div class="idle-list-container">
                ${content}
            </div>
        `;
    }

    /**
     * Renderiza pantalla de Top Suscriptores
     * @private
     */
    _renderTopSubsScreen(screenData, container) {
        const users = screenData.data || [];
        
        let usersHtml = '';
        users.forEach((user, index) => {
            const rankClass = index === 0 ? 'top-1' : index < 3 ? 'top-3' : '';
            const delayClass = 'animate-hidden animate-in';
            const delayStyle = `animation-delay: ${index * 0.25}s`;
            
            usersHtml += `
                <div class="modern-list-item ${rankClass} ${delayClass}" style="${delayStyle}">
                    <div class="list-rank">#${index + 1}</div>
                    <div class="list-content">
                        <span class="list-name" style="${index === 0 ? 'color: #fff; text-shadow: 0 0 10px rgba(255,255,255,0.3);' : ''}">${user.username}</span>
                        <span class="list-sub tabular-nums">NIVEL ${user.level}</span>
                    </div>
                    <div class="list-stat">
                        <span class="stat-num tabular-nums" style="color: #fff;">${user.months}</span>
                        <span class="stat-unit" style="color: var(--cyber-red, #FF3B45); opacity: 0.8 !important;">meses</span>
                    </div>
                </div>
            `;
        });

        if (users.length === 0) {
            usersHtml = '<div class="empty-message animate-hidden animate-in">SIN EXPERTOS EN RED AUN</div>';
        }

        const shouldScroll = users.length > 5;
        const scrollDuration = this.calculateScreenDuration(screenData, IDLE.DEFAULT_ROTATION_MS) / 1000;

        const content = `
            <div class="idle-list-scroll-wrapper ${shouldScroll ? 'animate-scroll' : ''}" 
                 style="${shouldScroll ? `animation-duration: ${scrollDuration}s;` : ''}">
                ${usersHtml}
            </div>
        `;

        container.innerHTML = `
            <div class="idle-screen-title wide-spacing animate-hidden animate-in">TOP SUSCRIPTORES</div>
            <div class="idle-list-container">
                ${content}
            </div>
        `;
    }

    /**
     * Renderiza pantalla de trending (solo emotes populares)
     * @private
     */
    _renderTrendingScreen(screenData, container) {
        const { data } = screenData;
        const { topEmotes, totalEmotes } = data;

        let emotesHtml = '';
        if (topEmotes && topEmotes.length > 0) {
            topEmotes.slice(0, 5).forEach((item, index) => {
                const percent = Math.min(100, (item.count / (topEmotes[0].count || 1)) * 100);
                const emoteDisplay = item.url
                    ? `<img src="${item.url}" alt="${item.name}" class="trending-emote-img" />`
                    : `<span class="trending-emote-text">${item.name}</span>`;

                const delayClass = `animate-hidden animate-in delay-${Math.min(index + 1, 5)}`;

                emotesHtml += `
                    <div class="trending-emote-item ${delayClass}">
                        <div class="trending-emote-display">${emoteDisplay}</div>
                        <div class="trending-emote-info">
                            <span class="trending-emote-name">${item.name}</span>
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
            <div class="idle-screen-title wide-spacing animate-hidden animate-in">EMOTES MÁS USADOS</div>
            <div class="trending-emotes-container">
                ${emotesHtml}
            </div>
            <div class="idle-footer-info animate-hidden animate-in delay-5">
                <span class="pulse-dot"></span> TOTAL: <span class="tabular-nums">${totalEmotes}</span> emotes
            </div>
        `;
    }

    /**
     * Renderiza pantalla de logros y level-ups con estilo limpio
     * @private
     */
    _renderAchievementsScreen(screenData, container) {
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
            <div class="idle-screen-title">PROGRESO GLOBAL</div>
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

        this.animateValue('stat-levels', 0, parseInt(data.levelUps) || 0, 1500);
        this.animateValue('stat-achievements', 0, parseInt(data.achievements) || 0, 1500);
    }

    /**
     * Renderiza pantalla del último logro desbloqueado
     * @private
     */
    _renderLastAchievementScreen(screenData, container) {
        const achievement = screenData.data;

        if (!achievement) {
             container.innerHTML = `
                <div class="idle-screen-title">ÚLTIMO LOGRO</div>
                <div class="empty-message">NADIE HA DESBLOQUEADO LOGROS AÚN</div>
            `;
            return;
        }

        const { username, achievement: achData, timestamp } = achievement;
        const timeStr = UIUtils.formatClockTime(timestamp);

        container.innerHTML = `
            <div class="idle-screen-title">ÚLTIMO LOGRO DESBLOQUEADO</div>
            
            <div class="last-achievement-card">
                <div class="achievement-icon-wrapper">
                    <img src="${achData.image}" alt="${achData.name}" class="achievement-icon-large">
                    <div class="achievement-glow"></div>
                </div>
                <div class="achievement-details">
                    <div class="achievement-header">
                        <div class="achievement-name">${achData.name}</div>
                        <div class="achievement-rarity ${achData.rarity || 'common'}">${achData.rarity ? achData.rarity.toUpperCase() : 'COMÚN'}</div>
                    </div>
                    <div class="achievement-desc">${achData.description}</div>
                    
                    <div class="achievement-footer">
                        <div class="achievement-unlocker-info">
                             <div class="unlocker-label">DESBLOQUEADO POR</div>
                             <div class="unlocker-name">${username}</div>
                        </div>
                        <div class="achievement-time">
                            <span class="time-icon">🕒</span> ${timeStr}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza pantalla de rachas - diseño "Battle / Face Off"
     * @private
     */
    _renderStreaksScreen(screenData, container) {
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
            <div class="idle-screen-title wide-spacing animate-hidden animate-in">FACE-OFF: RACHAS</div>
            <div class="idle-hero-container">
                ${streakContent}
                <div class="sub-stat animate-hidden animate-in delay-5">
                    <span class="highlight tabular-nums">${data.totalActive}</span> RACHAS ACTIVAS EN TOTAL
                </div>
            </div>
        `;
        
        if (topStreaks.length >= 1) {
             this.animateValue('stat-days-1', 0, parseInt(topStreaks[0].days) || 0, 1500);
        }
        if (topStreaks.length >= 2) {
             this.animateValue('stat-days-2', 0, parseInt(topStreaks[1].days) || 0, 1500);
        }
    }
}
