/**
 * Components Module
 * UI component generators
 */
const Components = (function () {

    /**
     * Create podium HTML for top 3 users
     * @param {Array} users - Top 3 users
     * @returns {string}
     */
    function createPodium(users) {
        if (!users || users.length === 0) {
            return `
                <div class="podium-empty">
                    <span class="empty-icon">⚠</span>
                    <span>No hay datos disponibles</span>
                </div>
            `;
        }

        const positions = ['first', 'second', 'third'];
        const medals = ['🥇', '🥈', '🥉'];

        return users.slice(0, 3).map((user, index) => `
            <div class="podium-place ${positions[index]}" data-username="${Utils.escapeHTML(user.username)}">
                <div class="podium-medal">${medals[index]}</div>
                <div class="podium-avatar">${Utils.getInitial(user.username)}</div>
                <div class="podium-username">${Utils.escapeHTML(user.username)}</div>
                <div class="podium-rank">${Utils.escapeHTML(user.rankTitle)}</div>
                <div class="podium-stats">
                    <div class="podium-stat">
                        <span class="label">LOGROS:</span>
                        <span class="value">${user.achievementCount}</span>
                    </div>
                    <div class="podium-stat">
                        <span class="label">NIVEL:</span>
                        <span class="value">${user.level}</span>
                    </div>
                    <div class="podium-stat">
                        <span class="label">XP:</span>
                        <span class="value">${Utils.formatNumber(user.xp)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Create ranking table rows
     * @param {Array} users
     * @param {number} startRank
     * @returns {string}
     */
    function createRankingRows(users, startRank = 1) {
        if (!users || users.length === 0) {
            return `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2rem;">
                        No hay datos para mostrar
                    </td>
                </tr>
            `;
        }

        return users.map((user, index) => {
            const rank = startRank + index;
            const isTop3 = rank <= 3;

            return `
                <tr data-username="${Utils.escapeHTML(user.username)}">
                    <td class="col-rank">
                        <span class="rank-number ${isTop3 ? 'top-3' : ''}">${rank}</span>
                    </td>
                    <td class="col-user">
                        <div class="user-cell">
                            <div class="user-avatar-small">${Utils.getInitial(user.username)}</div>
                            <span class="user-name">${Utils.escapeHTML(user.username)}</span>
                        </div>
                    </td>
                    <td class="col-rank-title">
                        <span class="rank-title-cell">${Utils.escapeHTML(user.rankTitle)}</span>
                    </td>
                    <td class="col-level">
                        <span class="level-cell">${user.level}</span>
                    </td>
                    <td class="col-achievements">
                        <span class="achievements-cell">${user.achievementCount}</span>
                    </td>
                    <td class="col-time">
                        <span class="time-cell" style="font-family: 'Share Tech Mono'; color: var(--cyber-cyan);">${Utils.formatTime(user.watchTimeMinutes || 0)}</span>
                    </td>
                    <td class="col-xp">
                        <span class="xp-cell">${Utils.formatNumberFull(user.xp)}</span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Create category filter buttons
     * @param {Array} categories
     * @returns {string}
     */
    function createCategoryFilters(categories) {
        const buttons = categories.map(category => {
            const info = Utils.getCategoryInfo(category);
            return `
                <button class="filter-btn" data-category="${category}">
                    <span class="filter-icon">${info.icon}</span>
                    ${Utils.escapeHTML(info.name)}
                </button>
            `;
        });

        // Add "All" button at the start
        return `
            <button class="filter-btn active" data-category="all">
                <span class="filter-icon">◈</span>
                TODOS
            </button>
            ${buttons.join('')}
        `;
    }

    /**
     * Create achievement card
     * @param {Object} achievement
     * @returns {string}
     */
    function createAchievementCard(achievement) {
        const iconContent = achievement.image
            ? `<img src="${achievement.image}" alt="${Utils.escapeHTML(achievement.name)}">`
            : (achievement.icon || '🏆');

        // Determine if this is a game-specific achievement
        let gameBadge = '';
        if (achievement.gameCategory) {
            const gameLabel = achievement.gameCategory.includes('Cyberpunk') ? 'CP2077' :
                achievement.gameCategory.includes('Witcher') ? 'TW3' : '';
            gameBadge = `<div class="card-game-badge">${gameLabel}</div>`;
        }

        return `
            <div class="achievement-card" 
                 data-id="${achievement.id}" 
                 data-rarity="${achievement.rarity}"
                 data-category="${achievement.category}">
                <div class="card-header">
                    <div class="card-icon">${iconContent}</div>
                    <div class="card-info">
                        <div class="card-name">${Utils.escapeHTML(achievement.name)}</div>
                        <div class="card-rarity">${Utils.getRarityName(achievement.rarity)}</div>
                    </div>
                </div>
                <div class="card-description">${Utils.escapeHTML(achievement.description)}</div>
                <div class="card-condition">${Utils.escapeHTML(achievement.condition)}</div>
                ${gameBadge}
            </div>
        `;
    }

    /**
     * Create achievement detail for modal
     * @param {Object} achievement
     * @param {Array} holders - List of users who unlocked it
     * @returns {string}
     */
    function createAchievementDetail(achievement, holders = []) {
        const iconContent = achievement.image
            ? `<img src="${achievement.image}" alt="${Utils.escapeHTML(achievement.name)}">`
            : (achievement.icon || '🏆');

        // Game requirement notice
        let gameRequirement = '';
        if (achievement.gameCategory) {
            const gameIcon = achievement.gameCategory.includes('Cyberpunk') ? '🌃' : '🐺';
            gameRequirement = `
                <div class="achievement-detail-game-req">
                    ${gameIcon} Requiere: <strong>${Utils.escapeHTML(achievement.gameCategory)}</strong>
                </div>
            `;
        }

        // Holders List
        let holdersHtml = '';
        if (holders && holders.length > 0) {
            holdersHtml = `
                <div class="achievement-holders-section" style="margin-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
                    <h4 class="holders-title" style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px;">
                        DESBLOQUEADO POR (${holders.length})
                    </h4>
                    <div class="holders-grid" style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center;">
                        ${holders.map(user => `
                            <div class="holder-item" title="${Utils.escapeHTML(user.username)} - Nivel ${user.level}" 
                                 style="display: flex; align-items: center; gap: 5px; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05); cursor: pointer;"
                                 onclick="window.location.hash = 'user/${encodeURIComponent(user.username)}'; document.querySelector('#achievement-modal').style.display='none';">
                                <div class="holder-avatar" style="width: 20px; height: 20px; border-radius: 50%; background: var(--bg-dark); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: bold;">
                                    ${Utils.getInitial(user.username)}
                                </div>
                                <span class="holder-name" style="font-size: 0.8rem; font-family: 'Share Tech Mono', monospace; color: var(--text-dim);">${Utils.escapeHTML(user.username)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            holdersHtml = `
                <div class="achievement-holders-section" style="margin-top: 1.5rem; text-align: center;">
                    <span style="font-size: 0.8rem; color: var(--text-muted);">NADIE HA DESBLOQUEADO ESTO AÚN</span>
                </div>
            `;
        }

        return `
            <div class="achievement-detail" data-rarity="${achievement.rarity}">
                <div class="achievement-detail-icon" style="--card-rarity-color: var(--rarity-${achievement.rarity});">
                    ${iconContent}
                </div>
                <h3 class="achievement-detail-name">${Utils.escapeHTML(achievement.name)}</h3>
                <div class="achievement-detail-rarity" style="--card-rarity-color: var(--rarity-${achievement.rarity});">
                    ${Utils.getRarityName(achievement.rarity)}
                </div>
                <p class="achievement-detail-description">${Utils.escapeHTML(achievement.description)}</p>
                <div class="achievement-detail-condition">${Utils.escapeHTML(achievement.condition)}</div>
                ${gameRequirement}
                ${holdersHtml}
            </div>
        `;
    }

    /**
     * Create user profile
     * @param {Object} user
     * @returns {string}
     */
    function createUserProfile(user) {
        const progress = Utils.calculateLevelProgress(user.xp, user.level);
        const topEmotes = Utils.getTopEmotes(user.achievementStats);

        // Get unlocked achievements details
        const allAchievements = API.getAchievementsData().achievements || {};
        const unlockedDetails = user.achievements.map(id => {
            const ach = allAchievements[id];
            return ach ? { id, ...ach } : null;
        }).filter(Boolean);

        // Count by rarity
        const rarityCounts = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
        unlockedDetails.forEach(ach => {
            if (rarityCounts[ach.rarity] !== undefined) {
                rarityCounts[ach.rarity]++;
            }
        });

        // Find rarest unlocked achievement
        let rarestUnlocked = null;
        const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

        for (const rarity of rarityOrder) {
            const found = unlockedDetails.find(a => a.rarity === rarity);
            if (found) {
                rarestUnlocked = found;
                break;
            }
        }

        return `
            <!-- Profile Header -->
            <div class="profile-header">
                <div class="profile-avatar">${Utils.getInitial(user.username)}</div>
                <div class="profile-info">
                    <h2 class="profile-username">${Utils.escapeHTML(user.username)}</h2>
                    <div class="profile-rank">
                        Rango: <span class="rank-name">${Utils.escapeHTML(user.rankTitle)}</span>
                    </div>
                    
                    <!-- XP Bar inside Header (Widget Style) -->
                    <div class="profile-xp-section" style="margin-top: 1rem; max-width: 600px;">
                        <div class="xp-bar-inline">
                            <div class="xp-level-container">
                                <span class="xp-level-label">LVL</span>
                                <span class="xp-level-value">${user.level}</span>
                            </div>
                            <div class="xp-progress-container">
                                <div class="xp-progress-bar">
                                    <div class="xp-progress-fill" style="width: ${progress.percentage}%"></div>
                                </div>
                                <div class="xp-progress-text">
                                    <span class="xp-current">${Utils.formatNumberFull(progress.current)}</span>
                                    <span class="xp-divider">/</span>
                                    <span class="xp-next">${Utils.formatNumberFull(progress.required)}</span>
                                    <span class="xp-suffix">XP</span>
                                </div>
                            </div>
                        </div>
                        <div class="xp-motivational">
                            ⚠ NECESITAS ${Utils.formatNumberFull(progress.required - progress.current)} XP MÁS PARA EL NIVEL ${user.level + 1}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Stats Grid -->
            <div class="profile-stats-grid">
                <!-- General Stats -->
                <div class="stats-card">
                    <h4 class="stats-card-title">General</h4>
                    <ul class="stats-list">
                         <li>
                            <span class="label">XP Total</span>
                            <span class="value">${Utils.formatNumberFull(user.xp)}</span>
                        </li>
                        <li>
                            <span class="label">Mensajes</span>
                            <span class="value">${Utils.formatNumberFull(user.totalMessages)}</span>
                        </li>
                        <li>
                            <span class="label">Racha Actual</span>
                            <span class="value">${user.streakDays} días</span>
                        </li>
                        <li>
                            <span class="label">Mejor Racha</span>
                            <span class="value">${user.bestStreak} días</span>
                        </li>
                        <li>
                            <span class="label">Tiempo Visto</span>
                            <span class="value" style="color: var(--cyber-cyan);">${Utils.formatTime(user.watchTimeMinutes || 0)}</span>
                        </li>
                    </ul>
                </div>
                
                 <!-- Achievement Stats -->
                <div class="stats-card">
                    <h4 class="stats-card-title">Logros (${user.achievementCount})</h4>
                    <ul class="stats-list small-text">
                        <li>
                            <span class="label" style="color: var(--rarity-legendary);">Legendarios</span>
                            <span class="value">${rarityCounts.legendary}</span>
                        </li>
                        <li>
                            <span class="label" style="color: var(--rarity-epic);">Épicos</span>
                            <span class="value">${rarityCounts.epic}</span>
                        </li>
                        <li>
                            <span class="label" style="color: var(--rarity-rare);">Raros</span>
                            <span class="value">${rarityCounts.rare}</span>
                        </li>
                        <li>
                            <span class="label">Comunes/Poco</span>
                            <span class="value">${rarityCounts.common + rarityCounts.uncommon}</span>
                        </li>
                    </ul>
                </div>

                <!-- Rarest & Emotes Combined -->
                <div class="stats-card">
                    <h4 class="stats-card-title">Destacados</h4>
                     ${rarestUnlocked ? `
                        <div class="rarest-highlight" style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <div class="label" style="display:block; margin-bottom:5px; font-size: 0.8rem;">💎 LOGRO MÁS RARO</div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="value" style="color: var(--text-bright); font-size: 0.9rem;">${Utils.escapeHTML(rarestUnlocked.name)}</div>
                            </div>
                        </div>` : ''}
                    
                    <div class="label" style="display:block; margin-bottom:5px; font-size: 0.8rem;">📺 TOP EMOTE</div>
                     ${topEmotes.length > 0 ? `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="value" style="color: var(--cyber-cyan);">${Utils.escapeHTML(topEmotes[0].emote)}</span>
                            <span class="label">${topEmotes[0].count} usos</span>
                        </div>
                     `: '<span class="label">Sin datos</span>'}
                </div>
            </div>
            
            <!-- Unlocked Achievements -->
            <div class="profile-achievements">
                <h4 class="profile-achievements-title">
                    Galería de Logros
                </h4>
                <div class="achievements-mini-grid">
                    ${unlockedDetails.length > 0
                ? unlockedDetails.map(ach => createAchievementMini(ach, true)).join('')
                : '<div style="grid-column: 1/-1; text-align: center; color: var(--text-dim); padding: 2rem;">Sin logros desbloqueados</div>'
            }
                </div>
            </div>
            
            <!-- Advanced Profile Features (Heatmap, Radar Chart, Predictions) -->
            ${typeof ProfileFeatures !== 'undefined' ? ProfileFeatures.createAdvancedProfileSections(user) : ''}
        `;
    }

    /**
     * Create mini achievement icon for grid
     * @param {Object} achievement
     * @param {boolean} unlocked
     * @returns {string}
     */
    function createAchievementMini(achievement, unlocked = true) {
        const iconContent = achievement.image
            ? `<img src="${achievement.image}" alt="${Utils.escapeHTML(achievement.name)}" title="${Utils.escapeHTML(achievement.name)}">`
            : (achievement.icon || '🏆');

        return `
            <div class="achievement-mini ${unlocked ? '' : 'locked'}" 
                 data-id="${achievement.id}"
                 data-rarity="${achievement.rarity}"
                 title="${Utils.escapeHTML(achievement.name)}">
                ${iconContent}
            </div>
        `;
    }

    /**
     * Create search suggestion item
     * @param {Object} user
     * @returns {string}
     */
    function createSuggestionItem(user) {
        return `
            <div class="suggestion-item" data-username="${Utils.escapeHTML(user.username)}">
                <div class="user-avatar-small">${Utils.getInitial(user.username)}</div>
                <span class="user-name">${Utils.escapeHTML(user.username)}</span>
                <span style="margin-left: auto; color: var(--text-muted); font-size: 0.8rem;">
                    LVL ${user.level} • ${user.achievementCount} logros
                </span>
            </div>
        `;
    }

    /**
     * Create global stats dashboard
     * @param {Object} stats
     * @returns {string}
     */
    /**
     * Create global stats dashboard
     * @param {Object} stats
     * @returns {Promise<string>}
     */
    async function createStatsDashboard(stats) {
        if (!stats) return '';

        let rarestContent = '<div class="stat-empty">No hay datos</div>';

        if (stats.rarestAchievement) {
            const ach = stats.rarestAchievement.details;
            const iconContent = ach.image
                ? `<img src="${ach.image}" alt="${Utils.escapeHTML(ach.name)}">`
                : (ach.icon || '🏆');

            rarestContent = `
                <div class="rarest-achievement-content">
                    <div class="rarest-icon-wrapper">
                         <div class="achievement-mini" data-rarity="${ach.rarity}">
                            ${iconContent}
                        </div>
                    </div>
                    <div class="rarest-info">
                        <div class="rarest-label">LOGRO MÁS RARO</div>
                        <div class="rarest-name">${Utils.escapeHTML(ach.name)}</div>
                        <div class="rarest-meta">
                            <span class="rarest-pct">${stats.rarestAchievement.percentage}% de jugadores</span>
                            <span class="rarest-count">(${stats.rarestAchievement.count} desbloqueos)</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Get Stream Heatmap HTML
        let streamHeatmapHTML = '';
        if (typeof StreamFeatures !== 'undefined') {
            streamHeatmapHTML = await StreamFeatures.createStreamHeatmap();
        }

        return `
            <div class="stats-dashboard">
                <!-- Total XP Card -->
                <div class="dashboard-stat-card cyber-card">
                    <div class="stat-icon">💾</div>
                    <div class="stat-data">
                        <h3 class="stat-value">${Utils.formatNumberFull(stats.totalXP)}</h3>
                        <span class="stat-label">TOTAL XP GENERADA</span>
                    </div>
                    <div class="stat-deco">DATAMINED</div>
                </div>

                <!-- Rarest Achievement -->
                <div class="dashboard-stat-card cyber-card rarest-card" style="grid-column: span 2;">
                    ${rarestContent}
                </div>

                <!-- Total Unlocks -->
                <div class="dashboard-stat-card cyber-card">
                    <div class="stat-icon">🔓</div>
                    <div class="stat-data">
                        <h3 class="stat-value">${Utils.formatNumberFull(stats.totalUnlocks)}</h3>
                        <span class="stat-label">LOGROS DESBLOQUEADOS</span>
                    </div>
                    <div class="stat-deco">SYSTEM WIDE</div>
                </div>

                <!-- Rarity Distribution Chart -->
                <div class="dashboard-stat-card cyber-card" style="grid-column: span 3;">
                    <h4 class="stats-card-title" style="margin-bottom: 1rem;">DISTRIBUCIÓN DE RAREZA</h4>
                    <div class="rarity-chart">
                        ${Object.entries(stats.rarityDistribution || {}).map(([rarity, count]) => {
            const pct = stats.totalUnlocks > 0 ? (count / stats.totalUnlocks * 100).toFixed(1) : 0;
            return `
                                <div class="rarity-bar-row">
                                    <div class="rarity-label" style="color: var(--rarity-${rarity}); width: 80px; text-transform: capitalize;">${Utils.getRarityName(rarity)}</div>
                                    <div class="rarity-track" style="flex: 1; background: rgba(255,255,255,0.05); height: 8px; border-radius: 4px; overflow: hidden;">
                                        <div class="rarity-fill" style="width: ${pct}%; background: var(--rarity-${rarity}); height: 100%;"></div>
                                    </div>
                                    <div class="rarity-value" style="width: 50px; text-align: right; font-family: 'Share Tech Mono'; font-size: 0.8rem;">${pct}%</div>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>
            </div>
            
            <!-- Stream Data Section -->
            ${streamHeatmapHTML}
        `;
    }

    /**
     * Create Face-Off Comparison
     * @param {Object} u1 User 1 object
     * @param {Object} u2 User 2 object
     */
    function createFaceOff(u1, u2) {
        if (!u1 || !u2) return '';

        // Get Achievement Data for Rarity Calculation
        const allAch = API.getAchievementsData().achievements || {};

        const countLegendary = (user) => {
            if (!user.achievements) return 0;
            return user.achievements.filter(id => allAch[id] && allAch[id].rarity === 'legendary').length;
        };

        const u1Legendary = countLegendary(u1);
        const u2Legendary = countLegendary(u2);

        // Calculate differences
        const diffLevel = u1.level - u2.level;
        const diffAch = u1.achievementCount - u2.achievementCount;
        const diffTime = (u1.watchTimeMinutes || 0) - (u2.watchTimeMinutes || 0);
        const diffMsg = (u1.totalMessages || 0) - (u2.totalMessages || 0);
        const diffStreak = (u1.bestStreak || 0) - (u2.bestStreak || 0);
        const diffLegendary = u1Legendary - u2Legendary;
        const diffCurrentStreak = (u1.streakDays || 0) - (u2.streakDays || 0);

        // Date comparison (Newer is better)
        const t1 = u1.lastSeen ? new Date(u1.lastSeen).getTime() : 0;
        const t2 = u2.lastSeen ? new Date(u2.lastSeen).getTime() : 0;
        const diffLink = t1 - t2;

        // Calculate Score (Best of 7)
        let s1 = 0, s2 = 0;

        // 1. Level
        if (u1.level > u2.level) s1++; else if (u2.level > u1.level) s2++;

        // 2. Achievements
        if (u1.achievementCount > u2.achievementCount) s1++; else if (u2.achievementCount > u1.achievementCount) s2++;

        // 3. Watch Time
        if ((u1.watchTimeMinutes || 0) > (u2.watchTimeMinutes || 0)) s1++; else if ((u2.watchTimeMinutes || 0) > (u1.watchTimeMinutes || 0)) s2++;

        // 4. Messages
        if ((u1.totalMessages || 0) > (u2.totalMessages || 0)) s1++; else if ((u2.totalMessages || 0) > (u1.totalMessages || 0)) s2++;

        // 5. Best Streak
        if ((u1.bestStreak || 0) > (u2.bestStreak || 0)) s1++; else if ((u2.bestStreak || 0) > (u1.bestStreak || 0)) s2++;

        // 6. Legendary Achievements
        if (u1Legendary > u2Legendary) s1++; else if (u2Legendary > u1Legendary) s2++;

        // 7. Current Streak
        if ((u1.streakDays || 0) > (u2.streakDays || 0)) s1++; else if ((u2.streakDays || 0) > (u1.streakDays || 0)) s2++;

        // 8. Last Active
        if (t1 > t2) s1++; else if (t2 > t1) s2++;

        // Helper for row
        const createRow = (label, val1, val2, diff, isWinner1, formatter = Utils.formatNumberFull) => {
            const c1 = isWinner1 ? 'val-win' : 'val-loss';
            const c2 = !isWinner1 ? 'val-win' : 'val-loss';

            const b1 = isWinner1 ? 'bar-win' : 'bar-loss';
            const b2 = !isWinner1 ? 'bar-win' : 'bar-loss';

            // Bar calculation
            const max = Math.max(val1, val2) || 1;
            const p1 = (val1 / max) * 100;
            const p2 = (val2 / max) * 100;

            return `
                <div class="comp-stat-row">
                    <div class="comp-val left ${c1}">${formatter(val1)}</div>
                    <div class="comparison-center-stat" style="flex: 1; padding: 0 1rem; text-align: center;">
                        <div class="stat-diff-label">${label}</div>
                        <div style="display: flex; gap: 5px; align-items: center;">
                            <div class="stat-diff-bar" style="transform: scaleX(-1);"><div class="stat-diff-fill ${b1}" style="width: ${p1}%"></div></div>
                            <div class="stat-diff-bar"><div class="stat-diff-fill ${b2}" style="width: ${p2}%"></div></div>
                        </div>
                    </div>
                    <div class="comp-val right ${c2}">${formatter(val2)}</div>
                </div>
            `;
        };

        const winner1 = s1 > s2;
        const winner2 = s2 > s1;

        return `
            <div class="faceoff-comparison">
                <!-- User 1 -->
                <div class="comparison-card ${winner1 ? 'winner' : ''}">
                    <div class="comparison-avatar">${Utils.getInitial(u1.username)}</div>
                    <h3 class="comparison-username">${Utils.escapeHTML(u1.username)}</h3>
                    <div class="profile-rank">${Utils.escapeHTML(u1.rankTitle)}</div>
                </div>

                <!-- Stats Center -->
                <div class="comparison-center" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div class="vs-badge" style="font-size: 1.5rem; font-weight: bold; color: var(--text-muted); margin-bottom: 0.5rem;">VS</div>
                    <div class="final-score" style="font-size: 2.5rem; font-weight: bold; font-family: 'Share Tech Mono', monospace; color: var(--cyber-yellow); text-shadow: 0 0 10px rgba(255, 238, 0, 0.5); white-space: nowrap;">
                        ${s1} - ${s2}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 5px;">(MEJOR DE 8)</div>
                </div>

                <!-- User 2 -->
                <div class="comparison-card ${winner2 ? 'winner' : ''}">
                    <div class="comparison-avatar">${Utils.getInitial(u2.username)}</div>
                    <h3 class="comparison-username">${Utils.escapeHTML(u2.username)}</h3>
                    <div class="profile-rank">${Utils.escapeHTML(u2.rankTitle)}</div>
                </div>
                
                <!-- Full Width Stats -->
                <div class="comparison-stats" style="grid-column: 1 / -1;">
                     ${createRow('NIVEL', u1.level, u2.level, diffLevel, u1.level >= u2.level)}
                     ${createRow('LOGROS TOTALES', u1.achievementCount, u2.achievementCount, diffAch, u1.achievementCount >= u2.achievementCount)}
                     ${createRow('LOGROS LEGENDARIOS', u1Legendary, u2Legendary, diffLegendary, u1Legendary >= u2Legendary)}
                     ${createRow('TIEMPO VISTO', u1.watchTimeMinutes || 0, u2.watchTimeMinutes || 0, diffTime, (u1.watchTimeMinutes || 0) >= (u2.watchTimeMinutes || 0), Utils.formatTime)}
                     ${createRow('MENSAJES', u1.totalMessages || 0, u2.totalMessages || 0, diffMsg, (u1.totalMessages || 0) >= (u2.totalMessages || 0))}
                     ${createRow('RACHA ACTUAL', u1.streakDays || 0, u2.streakDays || 0, diffCurrentStreak, (u1.streakDays || 0) >= (u2.streakDays || 0))}
                     ${createRow('MEJOR RACHA', u1.bestStreak || 0, u2.bestStreak || 0, diffStreak, (u1.bestStreak || 0) >= (u2.bestStreak || 0))}
                     ${createRow('ÚLTIMA ACTIVIDAD', t1, t2, diffLink, t1 > t2, Utils.formatRelativeTime)}
                </div>
            </div>
        `;
    }

    return {
        createPodium,
        createRankingRows,
        createCategoryFilters,
        createAchievementCard,
        createAchievementDetail,
        createUserProfile,
        createAchievementMini,
        createSuggestionItem,
        createStatsDashboard,
        createFaceOff
    };
})();
