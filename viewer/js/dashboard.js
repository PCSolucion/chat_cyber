/**
 * Dashboard Module - HUD REBORN
 * Functional technical dashboard
 */
const Dashboard = (function () {
    'use strict';

    /**
     * Create Dashboard HTML
     */
    async function createDashboard() {
        const stats = await API.getGlobalStats();
        const leaderboard = await API.getLeaderboard();
        const achievementsData = API.getAchievementsData().achievements || {};
        
        // Calculate Global Completion
        const totalPossibleUnlocks = stats.activeUsers * Object.keys(achievementsData).length;
        const globalCompletionPercent = totalPossibleUnlocks > 0 
            ? ((stats.totalUnlocks / totalPossibleUnlocks) * 100).toFixed(2) 
            : 0;

        // Get Latest 8 Unlocks from all users
        const latestUnlocks = getLatestUnlocks(leaderboard, achievementsData, 6);

        return `
            <div class="dashboard-layout">
                <!-- Main Content Area -->
                <div class="dash-main-area">
                    
                    <!-- Global Progress Panel -->
                    <div class="hud-panel">
                        <span class="hud-panel-label">NETWORK_INTEGRITY_INDEX</span>
                        <div class="global-progress-container">
                            <div class="progress-header">
                                <span>SINCRONIZACIÓN GLOBAL DE LOGROS</span>
                                <span>${globalCompletionPercent}%</span>
                            </div>
                            <div class="big-progress-track">
                                <div class="big-progress-fill" style="width: ${globalCompletionPercent}%"></div>
                            </div>
                            <div style="margin-top: 15px; font-size: 0.75rem; color: var(--text-dim); line-height: 1.5;">
                                Se han descifrado un total de <span class="accent">${stats.totalUnlocks}</span> fragmentos de datos 
                                de un potencial de ${Utils.formatNumberFull(totalPossibleUnlocks)}. La red se expande con cada Runner.
                            </div>
                        </div>
                    </div>

                    <!-- Latest Activity Panel -->
                    <div class="hud-panel" style="flex: 1;">
                        <span class="hud-panel-label">LATEST_DECRYPTIONS_FEED</span>
                        <div class="unlock-list">
                            ${latestUnlocks.map(u => `
                                <div class="unlock-item" style="border-left-color: var(--rarity-${u.rarity})">
                                    <div class="unlock-icon">
                                        ${u.image ? `<img src="${Utils.getImagePath(u.image)}" style="width:40px; height:40px;">` : '🏆'}
                                    </div>
                                    <div class="unlock-info">
                                        <div class="unlock-header">
                                            <div class="unlock-user">${u.username}</div>
                                            <div class="unlock-time">${Utils.formatRelativeTime(u.timestamp)}</div>
                                        </div>
                                        <div class="unlock-name">${Utils.escapeHTML(u.name)}</div>
                                        <div class="unlock-description">${Utils.escapeHTML(u.description)}</div>
                                    </div>
                                </div>
                            `).join('')}
                            ${latestUnlocks.length === 0 ? '<div style="opacity:0.3; text-align:center; padding: 2rem;">No se detectan descifrados recientes...</div>' : ''}
                        </div>
                    </div>

                </div>

                <!-- Secondary Sidebar Panels -->
                <div class="dash-side-area">
                    
                    <!-- System Stats -->
                    <div class="hud-panel">
                        <span class="hud-panel-label">GLOBAL_PROTOCOL_V4</span>
                        <div class="stat-row">
                            <span class="stat-label">RUNNERS CONECTADOS</span>
                            <span class="stat-val accent">${Utils.formatNumberFull(stats.activeUsers)}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">XP TOTAL MINADA</span>
                            <span class="stat-val accent">${Utils.formatNumberShort(stats.totalXP)}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">LOGROS DISPONIBLES</span>
                            <span class="stat-val">${Object.keys(achievementsData).length}</span>
                        </div>
                    </div>

                    <!-- Top Runner -->
                    <div class="hud-panel">
                        <span class="hud-panel-label">ELITE_NETRUNNER_ENTITY</span>
                        ${leaderboard[0] ? `
                            <div class="game-status-card" onclick="Router.navigate('u/${encodeURIComponent(leaderboard[0].username)}')">
                                <div class="game-icon-circle" style="background: rgba(var(--cyber-blue-rgb), 0.1)">
                                    ${Utils.getInitial(leaderboard[0].username)}
                                </div>
                                <div>
                                    <div style="font-family: 'Orbitron'; font-size: 1.1rem; color: var(--cyber-yellow);">${leaderboard[0].username}</div>
                                    <div style="font-size: 0.7rem; color: var(--text-dim);">LEVEL ${leaderboard[0].level} • ${leaderboard[0].achievementCount} LOGROS</div>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Stream Connection -->
                    <div class="hud-panel">
                        <span class="hud-panel-label">LIVE_CONEXION</span>
                        <div class="stream-overlay-card">
                            <div class="overlay-title" id="dash-stream-title" style="color: var(--text-dim);">LOCALIZANDO SEÑAL...</div>
                            <div class="overlay-subtitle" id="dash-stream-status">Protocolo de enlace iniciado...</div>
                        </div>
                    </div>

                    <!-- WIDGET: Rarity Analysis -->
                    <div class="hud-panel">
                        <span class="hud-panel-label">DATA_FRAGMENT_ANALYSIS</span>
                        ${['common', 'uncommon', 'rare', 'epic', 'legendary'].map(rarity => {
                            const count = stats.rarityDistribution[rarity] || 0;
                            const maxVal = Math.max(1, ...Object.values(stats.rarityDistribution));
                            const percent = (count / maxVal) * 100;
                            const color = `var(--rarity-${rarity})`;
                            const name = VIEWER_CONFIG.RARITY_LEVELS[rarity].name;
                            
                            return `
                                <div class="rarity-row">
                                    <div class="rarity-name" style="color: ${color}">${name}</div>
                                    <div class="rarity-track">
                                        <div class="rarity-fill" style="width: ${percent}%; background: ${color}; box-shadow: 0 0 5px ${color}"></div>
                                    </div>
                                    <div class="rarity-val">${count}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <!-- WIDGET: Rarest Anomaly -->
                    <div class="hud-panel">
                        <span class="hud-panel-label">ANOMALY_DETECTED</span>
                        ${stats.rarestAchievement ? `
                            <div class="rarest-card">
                                <div class="rarest-icon" style="border-color: var(--rarity-${stats.rarestAchievement.details.rarity || 'common'})">
                                    ${stats.rarestAchievement.details.image 
                                        ? `<img src="${Utils.getImagePath(stats.rarestAchievement.details.image)}" style="width:30px;">` 
                                        : '⚠️'}
                                </div>
                                <div class="rarest-info">
                                    <div class="rarest-label">LOGRO MÁS RARO DETECTADO</div>
                                    <div class="rarest-name">${Utils.escapeHTML(stats.rarestAchievement.details.name)}</div>
                                    <div class="rarest-stat">
                                        OBTENCIÓN: <span style="color: var(--cyber-red);">${stats.rarestAchievement.percentage}%</span>
                                        <span style="opacity: 0.5;"> // </span>
                                        POSESIÓN: ${stats.rarestAchievement.count} AGENTES
                                    </div>
                                </div>
                            </div>
                        ` : '<div style="font-size: 0.8rem; color: var(--text-dim);">NO HAY ANOMALÍAS SUFICIENTES PARA ANÁLISIS.</div>'}
                    </div>

                </div>
            </div>
        `;
    }

    /**
     * Find latest unlocks across all users
     */
    function getLatestUnlocks(users, achievementsData, limit) {
        let allUnlocks = [];
        
        // Extended safety blacklist for the feed
        const feedBlacklist = (VIEWER_CONFIG.BLACKLISTED_USERS || []).map(u => u.toLowerCase().trim());
        
        users.forEach(user => {
            // Extra safety check in the feed loop
            const normalizedUser = user.username.toLowerCase().trim();
            if (feedBlacklist.includes(normalizedUser)) return;

            if (user.achievements && Array.isArray(user.achievements)) {
                user.achievements.forEach(ach => {
                    const data = achievementsData[ach.id];
                    if (data) {
                        allUnlocks.push({
                            username: user.username,
                            name: data.name,
                            description: data.description,
                            image: data.image,
                            rarity: data.rarity,
                            timestamp: ach.timestamp
                        });
                    }
                });
            }
        });

        // Filter and Sort by timestamp descending
        return allUnlocks
            .filter(u => u.timestamp !== null)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    function initTicker() {
        // No longer using fake ticker, we use real data in createDashboard
    }

    function updateStreamStatus(status) {
        const titleEl = document.getElementById('dash-stream-title');
        const statusEl = document.getElementById('dash-stream-status');

        if (!titleEl || !statusEl) return;

        if (status.isLive) {
            titleEl.textContent = status.title || 'LIVE NOW';
            titleEl.style.color = 'var(--cyber-cyan)';
            statusEl.textContent = `ONLINE // UPTIME: ${status.uptime || '...'}`;
        } else {
            titleEl.textContent = 'ESTACIÓN OFFLINE';
            titleEl.style.color = 'var(--text-dim)';
            statusEl.textContent = 'ESPERANDO SEÑAL DE CIUDAD NOCTURNA...';
        }
    }

    return {
        createDashboard,
        initTicker,
        updateStreamStatus
    };
})();
