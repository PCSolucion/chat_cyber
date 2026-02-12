/**
 * API Module - Handles communication with Firebase Firestore
 * Provides data access for the achievements viewer
 */
const API = (function () {
    // Cache
    let cachedData = null;
    let cacheTimestamp = null;
    let isLoading = false;

    // Firebase instances (initialized lazily)
    let db = null;

    /**
     * Initialize Firebase & Firestore (called once)
     */
    function initFirestore() {
        if (db) return db;

        if (!window._firebaseApp) {
            window._firebaseApp = firebase.initializeApp(VIEWER_CONFIG.FIREBASE);
        }
        db = firebase.firestore();
        return db;
    }

    /**
     * Load a document from Firestore, handling serialized data
     */
    async function loadDoc(docId) {
        const firestore = initFirestore();
        const snap = await firestore
            .collection(VIEWER_CONFIG.FIRESTORE_COLLECTION)
            .doc(docId)
            .get();

        if (!snap.exists) return null;

        const raw = snap.data();

        // If data was serialized (large objects), deserialize
        if (raw._serialized) {
            try {
                const parsed = JSON.parse(raw._serialized);
                
                // For xp_data: _serialized contains only the users map
                // (FirestoreService.saveFile serializes data.users)
                // We need to reconstruct: { users: {...}, lastUpdated, version }
                if (docId === VIEWER_CONFIG.XP_DOC) {
                    return {
                        users: parsed,
                        lastUpdated: raw.lastUpdated,
                        version: raw.version
                    };
                }
                
                return parsed;
            } catch (e) {
                console.error(`Error deserializing "${docId}":`, e);
                return raw;
            }
        }

        return raw;
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
     * Fetch XP data from Firestore
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
            // Fetch all 3 documents in parallel
            const [xpData, achData, historyData] = await Promise.all([
                loadDoc(VIEWER_CONFIG.XP_DOC),
                loadDoc(VIEWER_CONFIG.ACHIEVEMENTS_DOC).catch(() => null),
                loadDoc(VIEWER_CONFIG.HISTORY_DOC).catch(() => null)
            ]);

            if (!xpData) {
                throw new Error('xp_data document not found in Firestore');
            }

            cachedData = xpData;

            // Handle XP Data Filtering
            if (cachedData.users) {
                // Map the blacklist to lowercase for reliable comparison
                const ignoredUsers = (VIEWER_CONFIG.BLACKLISTED_USERS || []).map(u => u.toLowerCase());
                
                // Add user1-10 placeholders
                for (let i = 1; i <= 10; i++) ignoredUsers.push(`user${i}`);

                const filteredUsers = {};
                Object.entries(cachedData.users).forEach(([username, data]) => {
                    const lowerName = username.toLowerCase().trim();
                    
                    // Check strict blacklist
                    const inBlacklist = ignoredUsers.some(blocked => blocked === lowerName);
                    
                    // Check specific patterns for spam accounts
                    const isSpamPattern = lowerName.startsWith('justinfan') || 
                                          lowerName.startsWith('did my best') || 
                                          lowerName.startsWith('the_panadero');

                    if (!inBlacklist && !isSpamPattern) {
                        filteredUsers[username] = data;
                    }
                });
                cachedData.users = filteredUsers;
            }

            cacheTimestamp = Date.now();
            if (VIEWER_CONFIG.DEBUG) console.log('✅ XP Data loaded & Filtered', cachedData);

            // Handle Achievements Data
            if (achData) {
                window.DYNAMIC_ACHIEVEMENTS = achData;
                console.log('🏆 Achievements Definitions loaded from Firestore');
            }

            // Handle Stream History
            if (historyData) {
                window.STREAM_HISTORY = historyData;
                console.log('📅 Stream History loaded from Firestore');
            }

            return cachedData;

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

    // Historical data is now fully managed via Firestore

    /**
     * Calculate XP earned in the last N days
     * @param {Object} history - Activity history object
     * @param {number} days - Number of days to look back
     * @returns {number}
     */
    function calculatePeriodXP(history, days) {
        if (!history) return 0;
        
        const now = new Date();
        const cutoff = new Date();
        cutoff.setDate(now.getDate() - days);
        // Reset time to start of day for fair comparison
        cutoff.setHours(0, 0, 0, 0);
        
        let total = 0;
        Object.entries(history).forEach(([dateStr, data]) => {
            // dateStr is usually YYYY-MM-DD
            const [y, m, d] = dateStr.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            
            if (date >= cutoff) {
                total += (data.xp || 0);
            }
        });
        return total;
    }

    /**
     * Get global leaderboard
     * Includes temporal stats (weekly/monthly)
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

            // Watch Time (Source of Truth: Firestore)
            const watchTimeMinutes = userData.watchTimeMinutes || 0;

            return {
                username,
                achievementCount,
                level,
                xp,
                rankTitle,
                bestStreak,
                totalMessages: userData.totalMessages || 0,
                streakDays: userData.streakDays || 0,
                watchTimeMinutes,
                achievements: (userData.achievements || []).map(ach => {
                    if (typeof ach === 'string') return { id: ach, timestamp: null };
                    return { 
                        id: ach.id, 
                        timestamp: ach.timestamp || ach.unlockedAt || null 
                    };
                }),
                achievementStats: userData.achievementStats || {},
                activityHistory: userData.activityHistory || {},
                
                // Temporal Stats Calculation
                weeklyXP: calculatePeriodXP(userData.activityHistory, 7),
                monthlyXP: calculatePeriodXP(userData.activityHistory, 30)
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

        // Normalize achievements: handle both old format (string ID) and new format (object)
        const rawAchievements = userData.achievements || [];
        const normalizedAchievements = rawAchievements.map(ach => {
            if (typeof ach === 'string') {
                return { id: ach, unlockedAt: null };
            }
            return ach;
        });

        // Calculate last seen from activity history if not explicitly set
        const activities = Object.keys(userData.activityHistory || {});
        const latestActivity = activities.length > 0 ? activities.sort().pop() : null;

        // Watch Time (Source of Truth: Firestore)
        const watchTimeMinutes = userData.watchTimeMinutes || 0;

        return {
            username: name,
            achievementCount: normalizedAchievements.length,
            level: userData.level || 1,
            xp: userData.xp || 0,
            rankTitle: Utils.getLevelTitle(userData.level || 1),
            bestStreak: userData.bestStreak || userData.streakDays || 0,
            totalMessages: userData.totalMessages || 0,
            streakDays: userData.streakDays || 0,
            watchTimeMinutes,
            achievements: normalizedAchievements.map(a => a.id), // Keep IDs for backwards compat
            achievementsWithDates: normalizedAchievements, // Full data with timestamps
            achievementStats: userData.achievementStats || {},
            activityHistory: userData.activityHistory || {}, // Daily activity for heatmap
            lastSeen: userData.lastMessageTimestamp || userData.lastActiveDay || latestActivity || null
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
        // ALWAYS prioritize local ACHIEVEMENTS_DATA to allow local edits (images, etc) 
        // to take effect immediately without needing to update Firestore.
        if (typeof ACHIEVEMENTS_DATA !== 'undefined') {
            return ACHIEVEMENTS_DATA;
        }
        
        if (window.DYNAMIC_ACHIEVEMENTS) {
            return window.DYNAMIC_ACHIEVEMENTS;
        }

        console.error('❌ ACHIEVEMENTS_DATA not loaded');
        return { achievements: {}, categories: [] };
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

    /**
     * Get global server statistics
     * @returns {Promise<Object>}
     */
    async function getGlobalStats() {
        const data = await fetchXPData();
        if (!data || !data.users) return null;

        let totalXP = 0;
        let totalUnlocks = 0;
        const achievementCounts = {};
        const achievementHolders = {};
        let activeUsers = 0;

        // Iterate all users
        Object.entries(data.users).forEach(([username, user]) => {
            // Count active users (level > 1 or has xp)
            if ((user.xp && user.xp > 0) || (user.level && user.level > 1)) {
                activeUsers++;
            }

            // Sum XP
            totalXP += (user.xp || 0);

            // Count achievements
            if (user.achievements && Array.isArray(user.achievements)) {
                totalUnlocks += user.achievements.length;
                user.achievements.forEach(ach => {
                    const achId = typeof ach === 'string' ? ach : ach.id;
                    const timestamp = typeof ach === 'string' ? null : (ach.timestamp || ach.unlockedAt || null);

                    achievementCounts[achId] = (achievementCounts[achId] || 0) + 1;

                    // Track holders for "Rare Owner"
                    if (!achievementHolders[achId]) achievementHolders[achId] = [];
                    achievementHolders[achId].push({
                        username,
                        unlockedAt: timestamp
                    });
                });
            }
        });

        // Find rarest achievement
        // Only consider achievements that have at least 1 unlock
        let rarest = null;
        let minCount = Infinity;
        const allAchievements = getAchievementsData().achievements || {};

        const rarityWeight = {
            'common': 1,
            'uncommon': 2,
            'rare': 3,
            'epic': 4,
            'legendary': 5
        };

        Object.entries(achievementCounts).forEach(([id, count]) => {
            const details = allAchievements[id];
            if (!details) return;

            let isRarer = false;

            if (rarest === null) {
                isRarer = true;
            } else {
                if (count < minCount) {
                    isRarer = true;
                } else if (count === minCount) {
                    // Tie-breaker: Check intrinsic rarity
                    const currentWeight = rarityWeight[details.rarity] || 0;
                    const existingWeight = rarityWeight[rarest.details.rarity] || 0;
                    
                    if (currentWeight > existingWeight) {
                        isRarer = true;
                    }
                }
            }

            if (isRarer) {
                minCount = count;
                rarest = {
                    id,
                    count,
                    details: details,
                    percentage: ((count / activeUsers) * 100).toFixed(1),
                    holders: achievementHolders[id] || []
                };
            }
        });

        // Rarity Distribution
        const rarityDistribution = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
        Object.entries(achievementCounts).forEach(([id, count]) => {
            const ach = allAchievements[id];
            if (ach && ach.rarity && rarityDistribution[ach.rarity] !== undefined) {
                rarityDistribution[ach.rarity] += count;
            }
        });

        // In case no achievements are unlocked yet
        if (minCount === Infinity) rarest = null;

        return {
            totalXP,
            totalUnlocks,
            activeUsers,
            rarestAchievement: rarest,
            rarityDistribution
        };
    }

    /**
     * Get users who have unlocked a specific achievement
     * @param {string} achievementId
     * @returns {Promise<Array>}
     */
    async function getAchievementHolders(achievementId) {
        const data = await fetchXPData();
        if (!data || !data.users) return [];

        const holders = [];

        Object.entries(data.users).forEach(([username, userData]) => {
            // Check for achievements array
            if (userData.achievements && Array.isArray(userData.achievements)) {
                // Check if user has the achievement (comparing IDs)
                const hasUnlocked = userData.achievements.some(ach =>
                    (typeof ach === 'string' ? ach : ach.id) === achievementId
                );

                if (hasUnlocked) {
                    holders.push({
                        username,
                        level: userData.level || 1,
                        xp: userData.xp || 0
                    });
                }
            }
        });

        // Sort by level/xp desc
        holders.sort((a, b) => b.level - a.level || b.xp - a.xp);

        return holders;
    }

    return {
        fetchXPData,
        getLeaderboard,
        getUser,
        searchUsers,
        getAchievementsData,
        getAchievementsByCategory,
        getAchievement,
        getTotalAchievements,
        getGlobalStats,
        getAchievementHolders
    };
})();
