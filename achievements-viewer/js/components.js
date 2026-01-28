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
                    <td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2rem;">
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
            const gameLabel = achievement.gameCategory.includes('Cyberpunk') ? '🌃 CP2077' :
                achievement.gameCategory.includes('Witcher') ? '🐺 TW3' : '';
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
     * @returns {string}
     */
    function createAchievementDetail(achievement) {
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

        return `
            <!-- Profile Header -->
            <div class="profile-header">
                <div class="profile-avatar">${Utils.getInitial(user.username)}</div>
                <div class="profile-info">
                    <h2 class="profile-username">${Utils.escapeHTML(user.username)}</h2>
                    <div class="profile-rank">
                        Rango: <span class="rank-name">${Utils.escapeHTML(user.rankTitle)}</span>
                    </div>
                    <div class="profile-meta">
                        <div class="profile-stat">
                            <span class="stat-value">${user.level}</span>
                            <span class="stat-label">NIVEL</span>
                        </div>
                        <div class="profile-stat">
                            <span class="stat-value">${Utils.formatNumberFull(user.xp)}</span>
                            <span class="stat-label">XP TOTAL</span>
                        </div>
                        <div class="profile-stat">
                            <span class="stat-value">${user.achievementCount}</span>
                            <span class="stat-label">LOGROS</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Stats Grid -->
            <div class="profile-stats-grid">
                <!-- General Stats -->
                <div class="stats-card">
                    <h4 class="stats-card-title">Estadísticas Generales</h4>
                    <ul class="stats-list">
                        <li>
                            <span class="label">Mensajes Totales</span>
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
                            <span class="label">Progreso Nivel</span>
                            <span class="value">${progress.percentage}%</span>
                        </li>
                    </ul>
                </div>
                
                <!-- Achievement Stats -->
                <div class="stats-card">
                    <h4 class="stats-card-title">Logros por Rareza</h4>
                    <ul class="stats-list">
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
                            <span class="label" style="color: var(--rarity-uncommon);">Poco Comunes</span>
                            <span class="value">${rarityCounts.uncommon}</span>
                        </li>
                        <li>
                            <span class="label" style="color: var(--rarity-common);">Comunes</span>
                            <span class="value">${rarityCounts.common}</span>
                        </li>
                    </ul>
                </div>
                
                <!-- Top Emotes -->
                <div class="stats-card">
                    <h4 class="stats-card-title">Emotes Favoritos</h4>
                    <ul class="stats-list">
                        ${topEmotes.length > 0
                ? topEmotes.map(e => `
                                <li>
                                    <span class="label">${Utils.escapeHTML(e.emote)}</span>
                                    <span class="value">${e.count}x</span>
                                </li>
                            `).join('')
                : '<li><span class="label" style="opacity: 0.5;">Sin datos de emotes</span></li>'
            }
                    </ul>
                </div>
            </div>
            
            <!-- Unlocked Achievements -->
            <div class="profile-achievements">
                <h4 class="profile-achievements-title">
                    Logros Desbloqueados
                    <span class="count">${user.achievementCount} / ${API.getTotalAchievements()}</span>
                </h4>
                <div class="achievements-mini-grid">
                    ${unlockedDetails.length > 0
                ? unlockedDetails.map(ach => createAchievementMini(ach, true)).join('')
                : '<div style="grid-column: 1/-1; text-align: center; color: var(--text-dim); padding: 2rem;">Sin logros desbloqueados</div>'
            }
                </div>
            </div>
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

    // Public API
    return {
        createPodium,
        createRankingRows,
        createCategoryFilters,
        createAchievementCard,
        createAchievementDetail,
        createUserProfile,
        createAchievementMini,
        createSuggestionItem
    };
})();
