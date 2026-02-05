/**
 * Configuración del Overlay de Chat de Twitch - PLANTILLA
 * Renombra este archivo a 'config.js' y completa tus credenciales.
 */

const CONFIG = {
    // Configuración de Twitch
    TWITCH_CHANNEL: 'tu_canal_aqui',
    
    // Usuario principal (Broadcaster) - Usualmente el mismo que el canal
    // Se usa para excluirlo de rankings de subs, etc.
    BROADCASTER_USERNAME: 'tu_usuario',

    // Tiempos (en milisegundos)
    MESSAGE_DISPLAY_TIME: 14000,
    TRANSITION_DURATION: 700,
    STREAM_CATEGORY_UPDATE_INTERVAL: 300000, // 5 minutos

    // Audio - Cyberpunk style sound
    AUDIO_URL: 'sounds/cyberpunk-message.mp3',
    AUDIO_VOLUME: 1.0,

    // Ranking Data Source
    TOP_DATA_URL: 'https://gist.githubusercontent.com/TU_USUARIO/GIST_ID/raw',

    // Tamaños y dimensiones
    EMOTE_SIZE: '1.2em',

    // Animación
    ANIMATION_COOLDOWN_MS: 30000,

    // Números de piloto
    MIN_RANDOM_NUMBER: 1,
    MAX_RANDOM_NUMBER: 99,

    // Usuario especial
    SPECIAL_USER: {
        username: 'tu_usuario',
        number: 63,
        team: 'mercedes'
    },

    // Configuración de accesibilidad
    ACCESSIBILITY: {
        ENABLE_ARIA: true,
        ENABLE_SCREEN_READER: true
    },

    // Modo debug
    DEBUG: false,

    // ============================================
    // SISTEMA DE EXPERIENCIA (XP)
    // ============================================

    // Habilitar/deshabilitar sistema de XP
    XP_SYSTEM_ENABLED: true,

    // GitHub Gist para almacenamiento de XP
    // IMPORTANTE: Crea un Gist privado y obtén un Personal Access Token
    // con permisos de "gist" en https://github.com/settings/tokens
    XP_GIST_ID: 'TU_GIST_ID_AQUI',
    XP_GIST_TOKEN: 'TU_TOKEN_AQUI', // NO COMPARTIR ESTE ARCHIVO SI TIENE EL TOKEN REAL
    XP_GIST_FILENAME: 'xp_data.json',

    // Sonido de Level Up (opcional)
    XP_LEVELUP_SOUND: null,

    // Tiempo de display del popup de Level Up (ms)
    XP_LEVELUP_DISPLAY_TIME: 4000,

    // Usuarios ignorados para Rachas y Bonus Diario
    XP_IGNORED_USERS_FOR_BONUS: ['wizebot', 'streamelements'],

    // ============================================
    // MODO IDLE (Estadísticas cuando no hay chat)
    // ============================================

    IDLE_TIMEOUT_MS: 30000,
    IDLE_ROTATION_MS: 12000,

    // ============================================
    // EMOTES DE TERCEROS (7TV, BTTV, FFZ)
    // ============================================

    THIRD_PARTY_EMOTES_ENABLED: true,
    THIRD_PARTY_PROVIDERS: {
        '7tv': true,
        'bttv': true,
        'ffz': true
    },

    // ============================================
    // CONFIGURACIÓN VISUAL (Iconos de Rango y Usuario)
    // ============================================
    UI: {
        RANK_ICONS: {
            'CIVILIAN': 'civilian.png',
            'ROOKIE': 'streetrat.png',
            'MERCENARY': 'mercenary.png',
            'SOLO': 'solo.png',
            'NETRUNNER': 'netrunner.png',
            'FIXER': 'fixer.png',
            'CORPO': 'corpo.png',
            'NIGHT CITY LEGEND': 'solo.png',
            'CYBERPSYCHO': 'mercenary.png',
            'MAXTAC': 'netrunner.png',
            'TRAUMA TEAM': 'fixer.png',
            'AFTERLIFE LEGEND': 'corpo.png',
            'CHOOMBA SUPREME': 'corpo.png',
            'CITIZEN OF NIGHT CITY': 'civilian.png'
        },
        SPECIAL_ICONS: {
            'ADMIN': 'arasaka.png',
            'SYSTEM': 'netrunner.png'
        }
    },

    // Usuarios completamente excluidos (Bots de sistema)
    BLACKLISTED_USERS: [
        'tangiabot',
        'wizebot',
        'streamelements',
        'streamroutine_bot'
    ]
};

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
