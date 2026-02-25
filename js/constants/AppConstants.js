/**
 * Constantes de la aplicación centralizadas
 * 
 * Este archivo actúa como una "Fuente Única de Verdad" (Single Source of Truth)
 * para valores mágicos que se repiten o que requieren contexto semántico.
 */

// URLs de datos estáticos externos
export const DATA_SOURCES = {
    TOP_RANKINGS_GIST: 'https://gist.githubusercontent.com/PCSolucion/550afe48a9954f54462ec201e49c851b/raw/'
};

// Tiempos en milisegundos relacionados con bucles y polling
export const TIMING = {
    // Conversiones base
    SECOND_MS: 1000,
    MINUTE_MS: 60000,

    // Polling de metadata del stream (Categoría y Estado Online/Offline)
    METADATA_CHECK_ONLINE_MS: 600000,   // 10 min cuando está online (para no saturar API)
    METADATA_CHECK_OFFLINE_MS: 60000,   // 1 min cuando está offline (para detectar inicio rápido)
    
    // Tiempos de UI
    MESSAGE_DISPLAY_TIME_MS: 14000,      // Tiempo que el mensaje es visible

    // Watch Time Tracker (Sistema de XP por tiempo)
    WATCH_TIME_INTERVAL_MS: 1200000,     // 20 min (Cambiado de 30 a 20)
    WATCH_TIME_INITIAL_DELAY_MS: 5000,  // 5 seg (arranque diferido)
    
    // Cache de Storage
    STORAGE_CACHE_TTL_MS: 60000,           // 1 min de vida para la cache local

    // Session Stats
    ACTIVITY_TRACKER_INTERVAL_MS: 60000, // 1 min

    // Stream History
    STREAM_CHECK_INTERVAL_MS: 60000,     // 1 min
    STREAM_SAVE_COOLDOWN_MS: 3600000,     // 1 hora (Optimización de cuota Firestore)

    // XP System
    STREAM_START_WINDOW_MS: 600000,      // 10 min (ventana para bonus de inicio)

    // Reconnect
    RECONNECT_BASE_DELAY_MS: 1000,
    RECONNECT_MAX_DELAY_MS: 30000,

    // Animación
    ANIMATION_COOLDOWN_MS: 30000,        // Tiempo sin mensajes para animación completa

    // Actualización de documentos globales (Leaderboard, Community Stats)
    SYSTEM_UPDATE_INTERVAL_MS: 43200000, // 12 horas

    // Ciclo de refresco forzado para usuarios (para evitar datos anticuados en cache)
    USER_REFRESH_INTERVAL_MS: 86400000,   // 24 horas
};

// Configuración de Notificaciones
export const NOTIFICATIONS = {
    DISPLAY_TIME_MS: 11000,             // 9s render + 2s fade out
    FADE_TIME_MS: 500,                  // Animación de salida
    QUEUE_MAX_SIZE: 5,                  // Límite de notificaciones pendientes
    BRO_PROGRESS_DISPLAY_TIME_MS: 4000  // Duración notificación Bro
};

// Configuración del Modo Idle (Screensaver de estadísticas)
export const IDLE = {
    MAX_CYCLES: 2,                      // Número de ciclos completos de rotación antes de ocultar
    DEFAULT_TIMEOUT_MS: 30000,          // Tiempo de inactividad para activar (30 seg)
    DEFAULT_ROTATION_MS: 12000,         // Tiempo por cada pantalla (12 seg)
    TOTAL_SCREENS_IN_CYCLE: 9,          // Cantidad de pantallas distintas disponibles
};

// Límites y buffers para estadísticas
export const STATS = {
    ACTIVITY_HISTORY_MAX_MINUTES: 60,   // Historial de actividad para gráficos
    MESSAGES_BY_MINUTE_BUFFER: 60,      // Buffer circular de mensajes por minuto
};

// Configuración del Sistema de XP
export const XP = {
    MIN_TIME_BETWEEN_XP_MS: 1000,       // Cooldown global entre ganancias de XP
    SAVE_DEBOUNCE_MS: 45000,            // 45 segundos: Más reactivo para el usuario, sigue siendo seguro para la cuota.
    MAX_XP_PER_MESSAGE: 100,            // Tope de XP por un solo mensaje
    WATCH_TIME_XP: 40,                 // XP otorgada por cada intervalo de 20 min (2 XP/min)
    // Recompensas fijas por logros (No se ven afectadas por multiplicadores)
    ACHIEVEMENT_REWARDS: {
        common: 50,
        uncommon: 75,
        rare: 150,
        epic: 250,
        legendary: 500
    }
};

// Configuración del Anti-Spam Shield
export const SPAM = {
    MAX_REPEAT_MESSAGES: 3,             // Mensajes iguales consecutivos
    CHAR_FLOOD_THRESHOLD: 0.8,          // 80% del mismo carácter
    CHAR_FLOOD_MIN_LENGTH: 8,           // Mínimo chars para evaluar
    COPYPASTA_WINDOW_MS: 10000,         // 10s ventana
    COPYPASTA_MIN_USERS: 3,             // 3+ usuarios = copypasta
    FLOOD_WINDOW_MS: 10000,             // 10s ventana por usuario
    FLOOD_MAX_MESSAGES: 5,              // Max mensajes en ventana
    FLOOD_SHOW_RATIO: 3,                // Mostrar 1 de cada N en flood
    HISTORY_MAX_SIZE: 50,               // Buffer global
    CLEANUP_INTERVAL_MS: 30000,         // Limpieza cada 30s
    MAX_ENTRY_AGE_MS: 60000,            // Vida máxima de rastro (1 min)
    USER_HISTORY_MAX_AGE_MS: 1800000    // Vida máxima del historial de usuario (30 min)
};

// Configuración de Calidad de Mensajes (Quality Score)
export const QUALITY = {
    HIGH_QUALITY_XP: 3,                 // Bonus
    LOW_EFFORT_PENALTY: -2,             // Penalización
    MIN_LENGTH_HIGH: 20,
    MAX_LENGTH_HIGH: 200,
    MIN_LENGTH_LOW: 1,
    MAX_LENGTH_LOW: 4,
    MIN_WORDS_DIVERSITY: 4,             // Min palabras para calcular diversidad
    DIVERSITY_THRESHOLD: 0.6,           // 60% palabras únicas
    CRITERIA_REQUIRED_FOR_BONUS: 2,     // 2+ criterios para bonus
    EMPTY_MSG_THRESHOLD: 2              // Máximo chars restantes tras quitar emotes
};

// Configuración de Audio
export const AUDIO = {
    COOLDOWN_MESSAGE_MS: 250,           // Mínimo 250ms entre sonidos de chat
    DEFAULT_VOLUME: 0.8,
    MAX_OVERLAPPING_SOUNDS: 5,           // Límite de sonidos simultáneos del mismo tipo
    SOUNDS: {
        NOTIFICATION: 'sounds/radiof1.mp3',
        ACHIEVEMENT_COMMON: 'sounds/logro2.mp3',
        ACHIEVEMENT_RARE: 'sounds/logro3.mp3',
        LEVEL_UP: 'sounds/level15.mp3'
    }
};

// Configuración de almacenamiento y red
export const STORAGE = {
    MAX_RETRIES: 3,                     // Intentos máximos en caso de fallo de red
    BASE_RETRY_DELAY_MS: 1000,          // Delay base para backoff exponencial
};

// Valores por defecto para la configuración (si el usuario no los define en config.js)
export const DEFAULTS = {
    BROADCASTER_USERNAME: 'liiukiin',
    MESSAGE_DISPLAY_TIME: TIMING.MESSAGE_DISPLAY_TIME_MS,
    AUDIO_URL: 'sounds/radiof1.mp3',
    AUDIO_VOLUME: 1.0,
    EMOTE_SIZE: '1.2em',
    ANIMATION_COOLDOWN_MS: TIMING.ANIMATION_COOLDOWN_MS,
    XP_SYSTEM_ENABLED: true,
    XP_DATA_FILENAME: 'xp_data.json',
    XP_LEVELUP_DISPLAY_TIME: 4000,
    XP_IGNORED_USERS_FOR_BONUS: ['wizebot', 'liiukiin'],
    IDLE_TIMEOUT_MS: IDLE.DEFAULT_TIMEOUT_MS,
    IDLE_ROTATION_MS: IDLE.DEFAULT_ROTATION_MS,
    THIRD_PARTY_EMOTES_ENABLED: true,
    BLACKLISTED_USERS: ['tangiabot', 'wizebot', 'streamelements', 'streamroutine_bot', 'botrixoficial'],
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
        },
        USER_THEMES: {}
    },
    ACCESSIBILITY: {
        ENABLE_ARIA: true
    },
    // Clases de CSS que representan temas visuales o estados especiales de usuario
    THEMES_CLASSES: [
        'gold-mode-active', 
        'takeru-bg', 
        'x1lenz-bg', 
        'chandalf-bg', 
        'manguerazo-bg', 
        'duckcris-bg'
    ],
    MAX_MESSAGE_LENGTH: 100,
    MAX_WORD_LENGTH: 25,
    MAX_EMOJI_LIMIT: 7
};

