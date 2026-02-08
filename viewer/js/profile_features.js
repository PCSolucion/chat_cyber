/**
 * Profile Advanced Features Module
 * Activity Heatmap, Radar Chart, Next Achievements
 */
const ProfileFeatures = (function () {
    'use strict';

    // State
    let _currentUser = null;
    let _activeYear = new Date().getFullYear();

    // ========================================
    // ACTIVITY HEATMAP
    // ========================================

    /**
     * Get available years from user activity
     * @param {Object} user 
     * @returns {Array<number>} Sorted years (descending)
     */
    function getAvailableYears(user) {
        const years = new Set();
        const currentYear = new Date().getFullYear();
        years.add(currentYear); // Always include current

        if (user.activityHistory) {
            Object.keys(user.activityHistory).forEach(date => {
                const y = parseInt(date.split('-')[0]);
                if (!isNaN(y)) years.add(y);
            });
        }

        // Also check achievements
        if (user.achievementsWithDates) {
            user.achievementsWithDates.forEach(ach => {
                if (ach.unlockedAt) {
                    const y = new Date(ach.unlockedAt).getFullYear();
                    if (!isNaN(y)) years.add(y);
                }
            });
        }

        return Array.from(years).sort((a, b) => b - a);
    }

    /**
     * Generate activity heatmap data for a specific calendar year
     * @param {Object} user - User data
     * @param {number} year - Year to generate
     * @returns {Array} - Array of week columns with day cells
     */
    function generateHeatmapData(user, year) {
        year = year || new Date().getFullYear();
        const data = [];

        // Get real activity history from user data
        const activityHistory = user.activityHistory || {};

        // Create a map of achievement unlock dates
        const achievementDates = new Map();
        const achievementsWithDates = user.achievementsWithDates || [];

        achievementsWithDates.forEach(ach => {
            if (ach.unlockedAt) {
                const dateKey = ach.unlockedAt.split('T')[0];
                if (!achievementDates.has(dateKey)) {
                    achievementDates.set(dateKey, []);
                }
                achievementDates.get(dateKey).push(ach.id);
            }
        });

        // Calculate thresholds based on history
        const activityValues = Object.values(activityHistory).map(d => d.messages || 0);
        const avgActivity = activityValues.length > 0
            ? activityValues.reduce((a, b) => a + b, 0) / activityValues.length
            : 5;

        // Calendar Logic: Start from Jan 1st of requested year
        // We want to align to Sunday as start of week row
        const jan1 = new Date(year, 0, 1);
        const dayOfWeek = jan1.getDay(); // 0 = Sunday

        // Start date is the Sunday before or on Jan 1
        const startDate = new Date(year, 0, 1 - dayOfWeek);

        const now = new Date();
        // 53 weeks to cover full year
        const weeks = 53;

        for (let w = 0; w < weeks; w++) {
            const weekData = [];
            let hasYearDays = false;

            for (let d = 0; d < 7; d++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + (w * 7) + d);

                // Format YYYY-MM-DD manually
                const y = currentDate.getFullYear();
                const m = String(currentDate.getMonth() + 1).padStart(2, '0');
                const dd = String(currentDate.getDate()).padStart(2, '0');
                const dateKey = `${y}-${m}-${dd}`;

                const isRequestedYear = (y === year);
                const isFuture = currentDate > now;

                if (isFuture) {
                    weekData.push({
                        date: dateKey,
                        level: 0, activity: 0, xp: 0, watchTime: 0, achievements: [],
                        isFuture: true,
                        inYear: isRequestedYear
                    });
                    continue;
                }

                // Get REAL activity
                const dayActivity = activityHistory[dateKey] || { messages: 0, xp: 0, watchTime: 0 };
                const activity = dayActivity.messages || 0;
                const xp = dayActivity.xp || 0;
                const watchTime = dayActivity.watchTime || 0;

                // Calculate level
                let level = 0;
                if (activity > 0) level = 1;
                if (activity > avgActivity * 0.5) level = 2;
                if (activity > avgActivity) level = 3;
                if (activity > avgActivity * 2) level = 4;

                const achievements = achievementDates.get(dateKey) || [];

                weekData.push({
                    date: dateKey,
                    level: isRequestedYear ? level : 0,
                    realLevel: level,
                    activity, xp, watchTime, achievements,
                    isFuture: false,
                    inYear: isRequestedYear
                });

                if (isRequestedYear) hasYearDays = true;
            }
            data.push(weekData);
        }

        return data;
    }

    /**
     * Generate HTML for the grid part only
     */
    function generateHeatmapGridHTML(user, year) {
        const heatmapData = generateHeatmapData(user, year);
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const days = ['Dom', '', 'Mar', '', 'Jue', '', 'Sáb'];

        // Calculate month labels positions
        const monthLabels = [];
        let currentMonth = -1;

        heatmapData.forEach((week, weekIndex) => {
            const firstDay = new Date(week[0].date);
            const month = firstDay.getMonth();

            if (month !== currentMonth && week[0].inYear) {
                currentMonth = month;
                monthLabels.push({ month: months[month], weekIndex });
            }
        });

        // Calculate stats for this year
        let totalActivity = 0;
        let activeDays = 0;
        let achievementDays = 0;

        heatmapData.forEach(week => {
            week.forEach(day => {
                if (!day.isFuture && day.realLevel > 0 && day.inYear) {
                    totalActivity += day.activity;
                    activeDays++;
                }
                if (day.achievements.length > 0 && day.inYear) {
                    achievementDays++;
                }
            });
        });

        // Generate cells HTML
        let cellsHTML = '';
        heatmapData.forEach((week, weekIndex) => {
            let weekHTML = `<div class="heatmap-column" data-week="${weekIndex}">`;
            week.forEach(day => {
                const hasAch = day.achievements.length > 0 ? 'has-achievement' : '';
                const futureClass = day.isFuture ? 'future' : '';
                const dimClass = !day.inYear ? 'dimmed' : '';

                weekHTML += `
                    <div class="heatmap-cell ${hasAch} ${futureClass} ${dimClass}" 
                         data-level="${day.realLevel}" 
                         data-date="${day.date}"
                         data-activity="${day.activity}"
                         data-xp="${day.xp || 0}"
                         data-watch-time="${day.watchTime || 0}"
                         data-achievements="${day.achievements.join(',')}"
                         title="${day.date}"
                         style="${!day.inYear ? 'opacity: 0.1; background: transparent; border: none;' : ''}"
                         ></div>
                `;
            });
            weekHTML += '</div>';
            cellsHTML += weekHTML;
        });

        return `
            <div class="stats-summary-row">
                <div class="summary-stat-box">
                    <span class="summary-stat-value">${activeDays}</span>
                    <span class="summary-stat-label">Días Activos (${year})</span>
                </div>
                <div class="summary-stat-box">
                    <span class="summary-stat-value">${achievementDays}</span>
                    <span class="summary-stat-label">Días con Logros (${year})</span>
                </div>
                <div class="summary-stat-box">
                    <span class="summary-stat-value">${user.streakDays || 0}</span>
                    <span class="summary-stat-label">Racha Actual</span>
                </div>
                <div class="summary-stat-box">
                    <span class="summary-stat-value">${user.bestStreak || 0}</span>
                    <span class="summary-stat-label">Mejor Racha</span>
                </div>
            </div>

            <div class="activity-heatmap-container">
                <div class="heatmap-months">
                    ${monthLabels.map(m => `<span class="heatmap-month-label" style="left: ${m.weekIndex * 12}px">${m.month}</span>`).join('')}
                </div>
                <div class="heatmap-wrapper">
                    <div class="heatmap-days">
                        ${days.map(d => `<span class="heatmap-day-label">${d}</span>`).join('')}
                    </div>
                    <div class="activity-heatmap" id="activity-heatmap">
                        ${cellsHTML}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Public method to switch year
     */
    function switchYear(year) {
        if (!_currentUser) return;
        _activeYear = year;

        // Update Tabs
        document.querySelectorAll('.heatmap-tab').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.year) === year);
        });

        // Update Content
        const container = document.getElementById('heatmap-container-dynamic');
        if (container) {
            container.innerHTML = generateHeatmapGridHTML(_currentUser, year);
            // Re-bind tooltips after DOM update
            if (typeof ProfileFeatures !== 'undefined' && ProfileFeatures.initializeFeatures) {
                // We just need to re-run tooltip setup, not everything
                setupHeatmapTooltips();
            } else {
                setupHeatmapTooltips();
            }
        }
    }

    /**
     * Create activity heatmap HTML
     * @param {Object} user - User data
     * @returns {string} - HTML string
     */
    function createActivityHeatmap(user) {
        _currentUser = user;
        _activeYear = new Date().getFullYear(); // Default

        const years = getAvailableYears(user);

        // Tabs
        const tabsHTML = years.map(y => `
            <button class="heatmap-tab ${y === _activeYear ? 'active' : ''}" 
                    data-year="${y}" onclick="ProfileFeatures.switchYear(${y})">
                ${y}
            </button>
        `).join('');

        const contentHTML = generateHeatmapGridHTML(user, _activeYear);

        return `
            <div class="profile-advanced-section" id="activity-heatmap-section">
                <div class="section-header-row" style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h3 class="advanced-section-title">Actividad en el Tiempo</h3>
                        <p class="advanced-section-subtitle">Tu historial de participación por año</p>
                    </div>
                    <div class="heatmap-tabs">
                        ${tabsHTML}
                    </div>
                </div>
                
                <div id="heatmap-container-dynamic">
                    ${contentHTML}
                </div>
                
                <div class="heatmap-legend">
                    <span>Menos</span>
                    <div class="legend-scale">
                        <div class="legend-cell heatmap-cell" data-level="0"></div>
                        <div class="legend-cell heatmap-cell" data-level="1"></div>
                        <div class="legend-cell heatmap-cell" data-level="2"></div>
                        <div class="legend-cell heatmap-cell" data-level="3"></div>
                        <div class="legend-cell heatmap-cell" data-level="4"></div>
                    </div>
                    <span>Más</span>
                    <span style="margin-left: 1rem;">● = Logro desbloqueado</span>
                </div>
            </div>
        `;
    }

    /**
     * Setup heatmap tooltip interactions
     */
    function setupHeatmapTooltips() {
        const cells = document.querySelectorAll('.heatmap-cell:not(.future)');
        let tooltip = document.getElementById('heatmap-tooltip');

        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'heatmap-tooltip';
            tooltip.className = 'heatmap-tooltip';
            tooltip.style.display = 'none';
            document.body.appendChild(tooltip);
        }

        cells.forEach(cell => {
            cell.addEventListener('mouseenter', (e) => {
                const date = cell.dataset.date;
                const activity = parseInt(cell.dataset.activity) || 0;
                const xp = parseInt(cell.dataset.xp) || 0;
                const watchTime = parseInt(cell.dataset.watchTime) || 0;
                const achievements = cell.dataset.achievements ? cell.dataset.achievements.split(',').filter(Boolean) : [];

                const formattedDate = new Date(date).toLocaleDateString('es-ES', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });

                let html = `<span class="date">${formattedDate}</span>`;

                // Build activity string
                const parts = [];
                if (activity > 0) parts.push(`${activity} mensajes`);
                if (watchTime > 0) parts.push(Utils.formatTime(watchTime));
                if (xp > 0) parts.push(`+${xp} XP`);

                if (parts.length > 0) {
                    html += `<span class="activity">${parts.join(' | ')}</span>`;
                } else {
                    html += `<span class="activity" style="opacity: 0.5">Sin actividad</span>`;
                }

                if (achievements.length > 0) {
                    html += `<span class="achievements">🏆 ${achievements.length} logro(s)</span>`;
                }

                tooltip.innerHTML = html;
                tooltip.style.display = 'block';

                const rect = cell.getBoundingClientRect();
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
                tooltip.style.transform = 'translateX(-50%)';
            });

            cell.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        });
    }

    // ========================================
    // RADAR CHART (Category Distribution)
    // ========================================

    /**
     * Calculate achievements by category for radar chart
     * @param {Object} user - User data
     * @param {Object} allAchievements - All achievements data
     * @returns {Array} - Category data with counts
     */
    function calculateCategoryDistribution(user, allAchievements) {
        const categories = VIEWER_CONFIG.CATEGORIES;
        const distribution = {};

        // Initialize all categories
        Object.keys(categories).forEach(cat => {
            distribution[cat] = {
                key: cat,
                name: categories[cat].name,
                icon: categories[cat].icon,
                count: 0,
                total: 0
            };
        });

        // Count total achievements per category
        Object.entries(allAchievements.achievements || {}).forEach(([id, ach]) => {
            const cat = ach.category || 'special';
            if (distribution[cat]) {
                distribution[cat].total++;
            }
        });

        // Count user's achievements per category
        if (user.achievements) {
            user.achievements.forEach(achId => {
                const ach = allAchievements.achievements[achId];
                if (ach && distribution[ach.category]) {
                    distribution[ach.category].count++;
                }
            });
        }

        // Calculate percentages and filter
        return Object.values(distribution)
            .filter(cat => {
                // Exclude game-specific categories from the radar chart as requested
                const isGameCategory = cat.key === 'cyberpunk2077' || cat.key === 'witcher3';
                return cat.total > 0 && !isGameCategory;
            })
            .map(cat => {
                cat.percentage = (cat.count / cat.total) * 100;
                return cat;
            });
    }

    /**
     * Determine player profile type based on category distribution
     * @param {Array} distribution - Category distribution data
     * @returns {Object} - Profile type info
     */
    function determinePlayerProfile(distribution) {
        if (!distribution || distribution.length === 0) {
            return { name: 'NEWBIE', description: 'Aún sin perfil definido' };
        }

        // Sort by percentage
        const sorted = [...distribution].sort((a, b) => b.percentage - a.percentage);
        const top = sorted[0];

        const profiles = {
            messages: { name: 'COMUNICADOR', description: 'Maestro de la conversación' },
            streaks: { name: 'DEVOTO', description: 'La constancia es tu fuerza' },
            levels: { name: 'ESCALADOR', description: 'Siempre subiendo de nivel' },
            xp: { name: 'GRINDER', description: 'Acumulador de experiencia' },
            ranking: { name: 'COMPETIDOR', description: 'El ranking es tu objetivo' },
            stream: { name: 'FIEL ESPECTADOR', description: 'Siempre presente en los streams' },
            holidays: { name: 'CELEBRADOR', description: 'No te pierdes ningún evento' },
            special: { name: 'CAZADOR DE RAREZAS', description: 'Buscas lo extraordinario' },
            bro: { name: 'SOCIALITE', description: 'El alma de la comunidad' },
            cyberpunk2077: { name: 'CHOOMBA', description: 'Night City corre por tus venas' },
            witcher3: { name: 'BRUJO', description: 'El camino del Witcher' }
        };

        // If no clear winner, check for balanced profile
        const avg = sorted.reduce((sum, c) => sum + c.percentage, 0) / sorted.length;
        const variance = sorted.reduce((sum, c) => sum + Math.pow(c.percentage - avg, 2), 0) / sorted.length;

        if (variance < 100 && sorted[0].percentage < 40) {
            return { name: 'EQUILIBRADO', description: 'Dominas todas las categorías' };
        }

        return profiles[top.key] || { name: 'NETRUNNER', description: 'Perfil único' };
    }

    /**
     * Create radar chart SVG
     * @param {Array} distribution - Category distribution data
     * @returns {string} - SVG HTML string
     */
    function createRadarChartSVG(distribution) {
        const size = 300;
        const center = size / 2;
        const maxRadius = center - 40;
        const levels = 4;

        if (!distribution || distribution.length < 3) {
            return `<div class="predictions-empty">
                <div class="predictions-empty-icon">📊</div>
                <h4>DATOS INSUFICIENTES</h4>
                <p>Necesitas más logros para generar el gráfico de categorías</p>
            </div>`;
        }

        const angleStep = (2 * Math.PI) / distribution.length;

        // Generate grid circles
        let gridCircles = '';
        for (let i = 1; i <= levels; i++) {
            const r = (maxRadius / levels) * i;
            gridCircles += `<circle class="radar-grid" cx="${center}" cy="${center}" r="${r}"/>`;
        }

        // Generate grid lines and labels
        let gridLines = '';
        let labels = '';
        distribution.forEach((cat, i) => {
            const angle = (i * angleStep) - Math.PI / 2;
            const x = center + Math.cos(angle) * maxRadius;
            const y = center + Math.sin(angle) * maxRadius;

            gridLines += `<line class="radar-grid-line" x1="${center}" y1="${center}" x2="${x}" y2="${y}"/>`;

            // Label position (slightly outside the chart)
            const labelRadius = maxRadius + 25;
            const lx = center + Math.cos(angle) * labelRadius;
            const ly = center + Math.sin(angle) * labelRadius;

            labels += `
                <text class="radar-label" x="${lx}" y="${ly}">${cat.icon}</text>
                <text class="radar-label-value" x="${lx}" y="${ly + 12}">${cat.count}/${cat.total}</text>
            `;
        });

        // Generate data polygon
        let polygonPoints = '';
        let dataPoints = '';
        distribution.forEach((cat, i) => {
            const angle = (i * angleStep) - Math.PI / 2;
            const valueRadius = (cat.percentage / 100) * maxRadius;
            const x = center + Math.cos(angle) * valueRadius;
            const y = center + Math.sin(angle) * valueRadius;

            polygonPoints += `${x},${y} `;
            dataPoints += `<circle class="radar-point" cx="${x}" cy="${y}" r="5" data-category="${cat.key}" data-count="${cat.count}" data-total="${cat.total}"/>`;
        });

        return `
            <svg class="radar-chart-svg" viewBox="0 0 ${size} ${size}">
                ${gridCircles}
                ${gridLines}
                <polygon class="radar-area" points="${polygonPoints.trim()}"/>
                ${dataPoints}
                ${labels}
            </svg>
        `;
    }

    /**
     * Create radar chart section HTML
     * @param {Object} user - User data
     * @returns {string} - HTML string
     */
    function createRadarChart(user) {
        const allAchievements = API.getAchievementsData();
        const distribution = calculateCategoryDistribution(user, allAchievements);
        const playerProfile = determinePlayerProfile(distribution);
        const radarSVG = createRadarChartSVG(distribution);

        // Generate legend
        let legendHTML = '';
        distribution.forEach(cat => {
            const percentage = cat.percentage.toFixed(0);
            legendHTML += `
                <div class="radar-legend-item">
                    <span class="legend-icon">${cat.icon}</span>
                    <div class="legend-info">
                        <span class="legend-name">${cat.name}</span>
                        <span class="legend-count">${cat.count}/${cat.total} (${percentage}%)</span>
                    </div>
                </div>
            `;
        });

        return `
            <div class="profile-advanced-section" id="category-radar-section">
                <h3 class="advanced-section-title">Perfil de Jugador</h3>
                <p class="advanced-section-subtitle">Distribución de logros por categoría</p>
                
                <div class="radar-chart-container">
                    <div class="radar-chart-wrapper">
                        ${radarSVG}
                    </div>
                    <div class="radar-legend">
                        ${legendHTML}
                    </div>
                </div>
                
                <div class="player-profile-type">
                    <span class="profile-type-label">Tipo de Perfil</span>
                    <span class="profile-type-name">${playerProfile.name}</span>
                    <p style="color: var(--text-dim); font-size: 0.85rem; margin-top: 0.25rem;">
                        ${playerProfile.description}
                    </p>
                </div>
            </div>
        `;
    }

    // ========================================
    // NEXT ACHIEVEMENTS (Predictions)
    // ========================================

    /**
     * Calculate progress towards unachieved achievements
     * @param {Object} user - User data
     * @param {Object} allAchievements - All achievements data
     * @returns {Array} - Sorted list of achievable achievements with progress
     */
    function calculatePredictions(user, allAchievements) {
        const predictions = [];
        const userAchievements = new Set(user.achievements || []);

        Object.entries(allAchievements.achievements || {}).forEach(([id, ach]) => {
            // Skip already unlocked
            if (userAchievements.has(id)) return;

            // Try to calculate progress based on rule
            if (!ach.rule) return;

            const rule = ach.rule;
            let currentValue = 0;
            let targetValue = rule.value;
            let canTrack = false;

            // Map field to user data
            if (rule.field.startsWith('userData.')) {
                const field = rule.field.replace('userData.', '');
                switch (field) {
                    case 'totalMessages':
                        currentValue = user.totalMessages || 0;
                        canTrack = true;
                        break;
                    case 'level':
                        currentValue = user.level || 1;
                        canTrack = true;
                        break;
                    case 'xp':
                        currentValue = user.xp || 0;
                        canTrack = true;
                        break;
                    case 'streakDays':
                        currentValue = user.streakDays || 0;
                        canTrack = true;
                        break;
                }
            } else if (rule.field.startsWith('stats.')) {
                const field = rule.field.replace('stats.', '');
                const stats = user.achievementStats || {};
                switch (field) {
                    case 'firstMessageDays':
                        currentValue = stats.firstMessageDays || 0;
                        canTrack = true;
                        break;
                    case 'messagesWithEmotes':
                        currentValue = stats.messagesWithEmotes || 0;
                        canTrack = true;
                        break;
                    case 'mentionCount':
                        currentValue = stats.mentionCount || 0;
                        canTrack = true;
                        break;
                    case 'nightMessages':
                        currentValue = stats.nightMessages || 0;
                        canTrack = true;
                        break;
                    case 'streakResets':
                        currentValue = stats.streakResets || 0;
                        canTrack = true;
                        break;
                    case 'bestRank':
                        // Lower is better for rank
                        currentValue = stats.bestRank || 999;
                        canTrack = true;
                        break;
                }
            }

            if (!canTrack) return;

            // Only include achievements with >= and > operators for progress tracking
            if (rule.operator === '>=' || rule.operator === '>') {
                const progress = Math.min(100, (currentValue / targetValue) * 100);
                const remaining = Math.max(0, targetValue - currentValue);

                predictions.push({
                    id,
                    ...ach,
                    currentValue,
                    targetValue,
                    progress,
                    remaining,
                    isClose: progress >= 70
                });
            }
        });

        // Sort by progress (highest first), then by target value (lowest first for ties)
        predictions.sort((a, b) => {
            if (b.progress !== a.progress) return b.progress - a.progress;
            return a.targetValue - b.targetValue;
        });

        // Return top 6 predictions
        return predictions.slice(0, 6);
    }

    /**
     * Create prediction card HTML
     * @param {Object} prediction - Prediction data
     * @returns {string} - HTML string
     */
    function createPredictionCard(prediction) {
        const imageUrl = Utils.getImagePath(prediction.image || 'img/logros/default.png');
        const closeBadge = prediction.isClose ? '<span class="close-badge">¡Casi!</span>' : '';

        // Format remaining value
        let remainingText = prediction.remaining.toLocaleString();
        let remainingLabel = '';

        if (prediction.rule?.field?.includes('Messages')) {
            remainingLabel = 'mensajes';
        } else if (prediction.rule?.field?.includes('level')) {
            remainingLabel = 'niveles';
        } else if (prediction.rule?.field?.includes('xp')) {
            remainingLabel = 'XP';
        } else if (prediction.rule?.field?.includes('streak') || prediction.rule?.field?.includes('Days')) {
            remainingLabel = 'días';
        } else if (prediction.rule?.field?.includes('Rank')) {
            remainingLabel = 'posiciones';
        }

        return `
            <div class="prediction-card" data-achievement="${prediction.id}" data-rarity="${prediction.rarity}">
                ${closeBadge}
                <div class="prediction-header">
                    <div class="prediction-icon">
                        <img src="${imageUrl}" alt="${prediction.name}" onerror="this.style.display='none'; this.parentElement.textContent='${prediction.icon}'">
                    </div>
                    <div class="prediction-info">
                        <h4 class="prediction-name">${prediction.name}</h4>
                        <span class="prediction-rarity">${Utils.getRarityName(prediction.rarity)}</span>
                    </div>
                </div>
                
                <div class="prediction-progress">
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${prediction.progress}%"></div>
                    </div>
                    <div class="progress-text">
                        <span class="progress-current">${Utils.formatNumber(prediction.currentValue)}</span>
                        <span class="progress-target">/ ${Utils.formatNumber(prediction.targetValue)}</span>
                    </div>
                </div>
                
                <div class="prediction-details">
                    <div class="prediction-condition">
                        Te faltan <span class="prediction-remaining">${remainingText}</span> ${remainingLabel}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create next achievements section HTML
     * @param {Object} user - User data
     * @returns {string} - HTML string
     */
    function createNextAchievements(user) {
        const allAchievements = API.getAchievementsData();
        const predictions = calculatePredictions(user, allAchievements);

        if (predictions.length === 0) {
            return `
                <div class="profile-advanced-section" id="next-achievements-section">
                    <h3 class="advanced-section-title">Próximos Logros</h3>
                    <p class="advanced-section-subtitle">Logros cercanos a desbloquear basados en tu progreso</p>
                    
                    <div class="predictions-empty">
                        <div class="predictions-empty-icon">🎯</div>
                        <h4>¡INCREÍBLE!</h4>
                        <p>Has desbloqueado todos los logros rastreables o aún no hay suficientes datos</p>
                    </div>
                </div>
            `;
        }

        const cardsHTML = predictions.map(p => createPredictionCard(p)).join('');

        // Count achievements close to unlock
        const closeCount = predictions.filter(p => p.isClose).length;

        return `
            <div class="profile-advanced-section" id="next-achievements-section">
                <h3 class="advanced-section-title">
                    Próximos Logros
                    ${closeCount > 0 ? `<span style="font-size: 0.7rem; color: var(--cyber-yellow); margin-left: 0.5rem;">🔥 ${closeCount} CERCA</span>` : ''}
                </h3>
                <p class="advanced-section-subtitle">Logros cercanos a desbloquear basados en tu progreso actual</p>
                
                <div class="next-achievements-grid">
                    ${cardsHTML}
                </div>
            </div>
        `;
    }

    // ========================================
    // PUBLIC API
    // ========================================

    /**
     * Create all advanced profile sections
     * @param {Object} user - User data
     * @returns {string} - Combined HTML string
     */
    function createAdvancedProfileSections(user) {
        const heatmap = createActivityHeatmap(user);
        const radar = createRadarChart(user);
        const predictions = createNextAchievements(user);

        return `
            <div class="profile-advanced-features">
                ${heatmap}
                ${radar}
                ${predictions}
            </div>
        `;
    }

    /**
     * Initialize all interactive features
     */
    /**
     * Initialize all interactive features
     */
    function initializeFeatures() {
        setupHeatmapTooltips();
        // Heatmap now uses tabs/year view, no auto-scroll needed
    }

    return {
        createActivityHeatmap,
        createRadarChart,
        createNextAchievements,
        createAdvancedProfileSections,
        initializeFeatures,
        switchYear, // Exposed for tabs
        // Expose individual functions for testing
        generateHeatmapData,
        calculateCategoryDistribution,
        calculatePredictions
    };
})();
