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

            // Handle XP Data
            const xpFile = gist.files[VIEWER_CONFIG.GIST_FILENAME];
            if (xpFile) {
                cachedData = JSON.parse(xpFile.content);

                // Filter excluded users (Bots, System, specific ignored patterns)
                if (cachedData.users) {
                    const ignoredUsers = [
                        'liiukiin', 'wizebot', 'tester', 'system',
                        'tangiabot', 'streamelements', 'streamroutine_bot'
                    ];
                    // Add user1-10 placeholders
                    for (let i = 1; i <= 10; i++) ignoredUsers.push(`user${i}`);

                    const filteredUsers = {};
                    Object.entries(cachedData.users).forEach(([username, data]) => {
                        const lowerName = username.toLowerCase();
                        // Check for exact match in ignored list OR partial match for 'justinfan'
                        const isIgnored = ignoredUsers.includes(lowerName) || lowerName.includes('justinfan');

                        if (!isIgnored) {
                            filteredUsers[username] = data;
                        }
                    });
                    cachedData.users = filteredUsers;
                }

                cacheTimestamp = Date.now();
                if (VIEWER_CONFIG.DEBUG) console.log('✅ XP Data loaded & Filtered', cachedData);
            } else {
                console.error('XP data file not found in Gist');
            }

            // Handle Achievements Data (Dynamic loading)
            const achFile = gist.files[VIEWER_CONFIG.GIST_ACHIEVEMENTS_FILENAME];
            if (achFile) {
                try {
                    const achData = JSON.parse(achFile.content);
                    // Store in a separate variable to avoid reassigning const ACHIEVEMENTS_DATA
                    window.DYNAMIC_ACHIEVEMENTS = achData;
                    console.log('🏆 Achievements Definitions loaded from Gist');
                } catch (e) {
                    console.error('Failed to parse achievements.json', e);
                }
            }



            // Handle Stream History
            const historyFile = gist.files[VIEWER_CONFIG.GIST_HISTORY_FILENAME];
            if (historyFile) {
                try {
                    const historyData = JSON.parse(historyFile.content);
                    window.STREAM_HISTORY = historyData;
                    console.log('📅 Stream History loaded from Gist');
                } catch (e) {
                    console.error('Failed to parse stream_history.json', e);
                }
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

    // Historical Watch Time Data (Injected for static viewer)
    const HISTORICAL_WATCH_TIME = {
        'takeru_xiii': 149884,
        'macusam': 133570,
        'james_193': 124503,
        'xroockk': 110042,
        'tonyforyu': 76833,
        'manguerazo': 73244,
        'botrixoficial': 72047,
        'urimas82': 71087,
        'nanusso': 64203,
        'ractor09': 61954,
        'bitterbitz': 58783,
        'toxod': 54264,
        'dmaster__io': 48534,
        'mithands': 44778,
        'jramber': 42162,
        'akanas_': 40037,
        'darkous666': 38605,
        'ifleky': 36388,
        'zayavioleta': 35987,
        'fabirules': 29263,
        'repxok': 28978,
        'xxchusmiflowxx': 28907,
        'ccxsnop': 28870,
        'emma1403': 27552,
        'badulak3': 26288,
        'yisus86': 25094,
        'vannhackez': 24566,
        'the_panadero_gamer': 24021,
        'reichskanz': 23553,
        'juanka6668': 23298,
        'onseisbc': 23242,
        'grom_xl': 23047,
        'miguela1982': 22655,
        'c_h_a_n_d_a_l_f': 22364,
        'wilbrt': 21459,
        'jookerlan': 21384,
        'mrkemm': 21318,
        'yllardelien': 20445,
        'broxa24': 20412,
        'coerezil': 20158,
        'panicshow_12': 19768,
        'xusclado': 19174,
        'carlos_morigosa': 18317,
        'scorgaming': 17818,
        'rodrigo24714': 17308,
        'ishilwen': 17148,
        'azu_nai': 17135,
        'sueir0': 16269,
        'x1lenz': 16040,
        'ifunky79': 16975,
        '0necrodancer0': 15493,
        'ouskan': 15465,
        'damakimera': 15189,
        'eacor_5': 15087,
        'aitorgp91': 14794,
        'buu_ky': 14303,
        'master_jashin': 14282,
        'mazikeenzz': 14222,
        'mxmktm': 14215,
        'zholu_': 14055,
        'hartodebuscarnombre': 13673,
        'xmagnifico': 13616,
        'duckcris': 13275,
        'vaaelh': 13208,
        'linabraun': 12775,
        'melereh': 12599,
        'yoxisko': 12095,
        'moradorpep': 12010,
        'vencejogus': 11995,
        'sblazzin': 11895,
        'diegorl98_': 11852,
        'pachu_1920': 11456,
        'takeru_13': 11403,
        'srroses': 11398,
        'selenagomas_': 11251,
        'gorkehon': 11038,
        'k0nrad_es': 10996,
        'davignar': 10719,
        'albertplayxd': 10542,
        'n0cturne84': 10537,
        'xporin': 10377,
        'annacardo': 10367,
        'kaishinrai': 10248,
        'kaballo_': 10243,
        'skodi': 10222,
        'srgato_117': 10033,
        'eltri0n': 9944,
        'escachapedras': 9619,
        'raulmilara79': 9606,
        'an1st0pme': 9602,
        'olokaustho': 9565,
        'n1tramix': 9553,
        'teto05': 9448,
        'kunfuu': 9443,
        'darksonido': 9361,
        'scotlane': 9346,
        'regaliito': 9316,
        'icarolinagi': 9314,
        'tiressblacksoul': 8647,
        'tomacoo12': 8556,
        'adrivknj': 8483,
        'mambiitv': 8437,
        'th3chukybar0': 8402,
        'jugador_no13': 8343,
        'lalobgl': 8200,
        'noxiun': 8051,
        'pk2s_patanegra': 7901,
        'tvdestroyer9': 7805,
        'twitchszz': 7751,
        'sneekik': 7651,
        'chestersz': 7619,
        'oversilence': 7578,
        'ikk1': 7557,
        'redenil': 7471,
        'iiadryii': 7378,
        'daniellyep': 7361,
        'susy_yo': 7169,
        'am_74_': 7144,
        'yisus_primero': 7013,
        'gabodistractor': 6922,
        'damnbearlord': 6834,
        'camperonaa': 6790,
        'extreme87r': 6661,
        'sr_raider': 6660,
        'jasobeam10': 6643,
        'mikesons': 6640,
        'maltajimn': 6502,
        'tvzizek': 6497,
        'jakesp4rrow': 6342,
        'fali_': 6169,
        'tveoo': 6165,
        'pishadekai78': 6163,
        'alcatrazjose': 6056,
        'audi99875': 6028,
        'toxic30008': 6016,
        'muchachodelnorth': 5970,
        'nue_p': 5918,
        'gorax14': 5867,
        'exitar777': 5802,
        'waveyya': 5770,
        'anykey_uruguay': 5706,
        'tokoro_temnosuke': 5637,
        'pep6682': 5610,
        'trujill04': 5596,
        'z_maxis': 5572,
        'dixgrakyz': 5531,
        'borknar': 5487,
        'pepii__sg': 5447,
        'jreper': 5407,
        'matutetary': 5350,
        'duofik': 5344,
        'polauloo': 5285,
        'lingsh4n': 5244,
        'luisfabre2': 5214,
        'khhote': 5079,
        'iguanamanjr': 5061,
        'divazzi108': 5045,
        'eldadadawolfy': 5040,
        'goril0_': 5034,
        'jefersonthrash': 5012,
        'guillermojp06': 5011,
        'astr0way': 4914,
        'jagerconhielo': 4902,
        'belmont_z': 4885,
        'lucas_ema_': 4873,
        'rufemar1': 4836,
        'pribonblackrd': 4811,
        'maniako_tv': 4803,
        'joancar2663': 4665,
        'robamadress': 4636,
        'shurax2': 4634,
        'joz_hernam': 4609,
        'xioker': 4589,
        'rociio_jg': 4554,
        'tsirocco': 4545,
        'eblazzef': 4536,
        'siilord': 4457,
        'perdydalvi': 4429,
        'mapache__xxx': 4389,
        'dark__north': 4376,
        'wiismii': 4375,
        'pesteavinno': 4335,
        'cassius143': 4322,
        'makokogaming': 4314,
        'sir_fernan': 4310,
        'paxeco290': 4305,
        'gray7': 4259,
        'mcguarru': 4251,
        'morfeiu': 4201,
        'srtapinguino': 4194,
        'n4ch0g': 4186,
        'zhulthalas': 4182,
        'd3stro1': 4138,
        'jhonavj': 4136,
        'moncho81': 4121,
        'metalex110': 4106,
        'kalangie78': 4041,
        'sadalahanna': 4032,
        'el_tiodudu': 3966,
        'victor_andorra1986': 3965,
        'am_m74': 3953
    };

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

            // Merge Watch Time
            const historicalTime = HISTORICAL_WATCH_TIME[username.toLowerCase()] || 0;
            const watchTimeMinutes = Math.max(userData.watchTimeMinutes || 0, historicalTime);

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

        // Merge Watch Time
        const historicalTime = HISTORICAL_WATCH_TIME[name.toLowerCase()] || 0;
        const watchTimeMinutes = Math.max(userData.watchTimeMinutes || 0, historicalTime);

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
        if (window.DYNAMIC_ACHIEVEMENTS) {
            return window.DYNAMIC_ACHIEVEMENTS;
        }
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
                user.achievements.forEach(achId => {
                    achievementCounts[achId] = (achievementCounts[achId] || 0) + 1;

                    // Track holders for "Rare Owner"
                    if (!achievementHolders[achId]) achievementHolders[achId] = [];
                    achievementHolders[achId].push({
                        username,
                        unlockedAt: null // Timestamp not available in current schema
                    });
                });
            }
        });

        // Find rarest achievement
        // Only consider achievements that have at least 1 unlock to avoid showing unreleased ones (or show 0%)
        let rarest = null;
        let minCount = Infinity;
        const allAchievements = getAchievementsData().achievements || {};

        Object.entries(achievementCounts).forEach(([id, count]) => {
            if (allAchievements[id] && count < minCount) {
                minCount = count;
                rarest = {
                    id,
                    count,
                    details: allAchievements[id],
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
