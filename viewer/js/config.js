/**
 * Configuration for Achievements Viewer
 * Uses Firebase Firestore (same as main widget)
 */
const VIEWER_CONFIG = {
    // Firebase Firestore (same as widget)
    FIREBASE: {
        apiKey: 'AIzaSyDHPLiCrpodIrVnkbgbFMXaPz5UKWfDQGU',
        authDomain: 'chat-twitch-c629c.firebaseapp.com',
        projectId: 'chat-twitch-c629c',
        storageBucket: 'chat-twitch-c629c.firebasestorage.app',
        messagingSenderId: '456930494969',
        appId: '1:456930494969:web:936d0ea6c746c34d7bd528'
    },

    // Firestore collection & document names
    FIRESTORE_COLLECTION: 'app_data',
    XP_DOC: 'xp_data',
    ACHIEVEMENTS_DOC: 'achievements',
    HISTORY_DOC: 'stream_history',

    // API Settings
    CACHE_TTL: 60000, // 1 minute cache

    // Level Titles (same as widget)
    LEVEL_TITLES: {
        1: 'CIVILIAN',
        5: 'ROOKIE',
        10: 'MERCENARY',
        20: 'SOLO',
        30: 'NETRUNNER',
        50: 'FIXER',
        75: 'CORPO'
    },

    // Rarity display names
    RARITY_LEVELS: {
        common: { name: 'Común', order: 1 },
        uncommon: { name: 'Poco Común', order: 2 },
        rare: { name: 'Raro', order: 3 },
        epic: { name: 'Épico', order: 4 },
        legendary: { name: 'Legendario', order: 5 }
    },

    // Category display names and icons
    CATEGORIES: {
        messages: { name: 'Mensajes', icon: '💬' },
        streaks: { name: 'Rachas', icon: '🔥' },
        levels: { name: 'Niveles', icon: '⬆️' },
        xp: { name: 'Experiencia', icon: '✨' },
        ranking: { name: 'Ranking', icon: '🏆' },
        stream: { name: 'Stream', icon: '📺' },
        holidays: { name: 'Festivos', icon: '🎉' },
        special: { name: 'Especiales', icon: '⭐' },
        bro: { name: 'Comunidad', icon: '🤝' },
        cyberpunk2077: { name: 'Cyberpunk 2077', icon: '🌃' },
        witcher3: { name: 'The Witcher 3', icon: '🐺' }
    },

    // Pagination
    LEADERBOARD_PAGE_SIZE: 20,

    // Blacklisted Users (Bots & System)
    BLACKLISTED_USERS: [
        'liiukiin',
        'wizebot',
        'tester',
        'system',
        'tangiabot',
        'streamelements',
        'streamroutine_bot',
        'juan123',
        'did my best the vo',
        'did my best the voidz1',
        'did my best the voidz',
        'did_my_best_the_voidz',
        'did_my_best_the_voidz1',
        'the_panadero_gamer255',
        'the_panadero_gamer2555'
    ],

    // Debug mode
    DEBUG: false
};

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VIEWER_CONFIG;
}
