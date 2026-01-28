/**
 * API Module - Handles communication with GitHub Gist
 * Provides data access for the achievements viewer
 */
const API = (function () {
    // Cache
    let cachedData = null;
    let cacheTimestamp = null;
    let isLoading = false;

    /**
     * Get authorization headers for GitHub API
     */
    function getHeaders() {
        return {
            'Authorization': `Bearer ${VIEWER_CONFIG.GIST_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28'
        };
    }

    /**
     * Check if cache is valid
     */
    function isCacheValid() {
        if (!cachedData || !cacheTimestamp) return false;
        const age = Date.now() - cacheTimestamp;
        return age < VIEWER_CONFIG.CACHE_TTL;
    }

    /**
     * Fetch XP data from Gist
     * @param {boolean} forceRefresh - Skip cache
     * @returns {Promise<Object>}
     */
    async function fetchXPData(forceRefresh = false) {
        // Return cache if valid
        if (!forceRefresh && isCacheValid()) {
            if (VIEWER_CONFIG.DEBUG) console.log('📦 Using cached data');
            return cachedData;
        }

        // Prevent duplicate requests
        if (isLoading) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return cachedData;
        }

        isLoading = true;

        try {
            const url = `${VIEWER_CONFIG.API_BASE}/gists/${VIEWER_CONFIG.GIST_ID}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: getHeaders()
            });

            if (!response.ok) {
                throw new Error(`GitHub API Error: ${response.status}`);
            }

            const gist = await response.json();
            const file = gist.files[VIEWER_CONFIG.GIST_FILENAME];

            if (!file) {
                throw new Error('XP data file not found in Gist');
            }

            const data = JSON.parse(file.content);

            // Update cache
            cachedData = data;
            cacheTimestamp = Date.now();

            if (VIEWER_CONFIG.DEBUG) {
                console.log('✅ Data loaded from Gist', data);
            }

            return data;

        } catch (error) {
            console.error('❌ Error fetching data:', error);
            // Return cached data if available
            if (cachedData) {
                console.warn('⚠️ Using stale cache');
                return cachedData;
            }
            throw error;
        } finally {
            isLoading = false;
        }
    }

    /**
     * Get all users sorted by achievements count
     * @returns {Promise<Array>}
     */
    async function getLeaderboard() {
        const data = await fetchXPData();
        if (!data || !data.users) return [];

        const users = Object.entries(data.users).map(([username, userData]) => {
            // Count achievements
            const achievementCount = userData.achievements ? userData.achievements.length : 0;

            // Get level and XP
            const level = userData.level || 1;
            const xp = userData.xp || 0;

            // Get rank title
            const rankTitle = Utils.getLevelTitle(level);

            // Get best streak
            const bestStreak = userData.bestStreak || userData.streakDays || 0;

            return {
                username,
                achievementCount,
                level,
                xp,
                rankTitle,
                bestStreak,
                totalMessages: userData.totalMessages || 0,
                streakDays: userData.streakDays || 0,
                achievements: userData.achievements || [],
                achievementStats: userData.achievementStats || {}
            };
        });

        // Sort by achievements, then by level, then by XP
        users.sort((a, b) => {
            if (b.achievementCount !== a.achievementCount) {
                return b.achievementCount - a.achievementCount;
            }
            if (b.level !== a.level) {
                return b.level - a.level;
            }
            return b.xp - a.xp;
        });

        return users;
    }

    /**
     * Get a specific user by username
     * @param {string} username
     * @returns {Promise<Object|null>}
     */
    async function getUser(username) {
        const data = await fetchXPData();
        if (!data || !data.users) return null;

        // Case-insensitive search
        const normalizedSearch = username.toLowerCase();
        const entry = Object.entries(data.users).find(
            ([name]) => name.toLowerCase() === normalizedSearch
        );

        if (!entry) return null;

        const [name, userData] = entry;

        return {
            username: name,
            achievementCount: userData.achievements ? userData.achievements.length : 0,
            level: userData.level || 1,
            xp: userData.xp || 0,
            rankTitle: Utils.getLevelTitle(userData.level || 1),
            bestStreak: userData.bestStreak || userData.streakDays || 0,
            totalMessages: userData.totalMessages || 0,
            streakDays: userData.streakDays || 0,
            achievements: userData.achievements || [],
            achievementStats: userData.achievementStats || {},
            lastSeen: userData.lastMessageTimestamp || userData.lastActiveDay || null
        };
    }

    /**
     * Search users by partial name
     * @param {string} query
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    async function searchUsers(query, limit = 10) {
        const data = await fetchXPData();
        if (!data || !data.users || !query) return [];

        const normalizedQuery = query.toLowerCase();

        const matches = Object.entries(data.users)
            .filter(([username]) => username.toLowerCase().includes(normalizedQuery))
            .map(([username, userData]) => ({
                username,
                level: userData.level || 1,
                achievementCount: userData.achievements ? userData.achievements.length : 0
            }))
            .slice(0, limit);

        return matches;
    }

    /**
     * Get all achievements definitions from ACHIEVEMENTS_DATA
     * @returns {Object}
     */
    function getAchievementsData() {
        if (typeof ACHIEVEMENTS_DATA === 'undefined') {
            console.error('❌ ACHIEVEMENTS_DATA not loaded');
            return { achievements: {}, categories: [] };
        }
        return ACHIEVEMENTS_DATA;
    }

    /**
     * Get achievements grouped by category
     * @returns {Object}
     */
    function getAchievementsByCategory() {
        const data = getAchievementsData();
        if (!data.achievements) return {};

        const grouped = {};

        Object.entries(data.achievements).forEach(([id, achievement]) => {
            const category = achievement.category || 'special';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push({
                id,
                ...achievement
            });
        });

        // Sort each category by rarity then name
        Object.keys(grouped).forEach(category => {
            grouped[category].sort((a, b) => {
                const rarityOrder = VIEWER_CONFIG.RARITY_LEVELS;
                const rarityDiff = (rarityOrder[a.rarity]?.order || 0) - (rarityOrder[b.rarity]?.order || 0);
                if (rarityDiff !== 0) return rarityDiff;
                return a.name.localeCompare(b.name);
            });
        });

        return grouped;
    }

    /**
     * Get a single achievement by ID
     * @param {string} id
     * @returns {Object|null}
     */
    function getAchievement(id) {
        const data = getAchievementsData();
        if (!data.achievements || !data.achievements[id]) return null;
        return { id, ...data.achievements[id] };
    }

    /**
     * Get total achievement count
     * @returns {number}
     */
    function getTotalAchievements() {
        const data = getAchievementsData();
        if (!data.achievements) return 0;
        return Object.keys(data.achievements).length;
    }

    // Public API
    return {
        fetchXPData,
        getLeaderboard,
        getUser,
        searchUsers,
        getAchievementsData,
        getAchievementsByCategory,
        getAchievement,
        getTotalAchievements
    };
})();
