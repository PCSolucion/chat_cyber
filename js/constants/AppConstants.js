/**
 * Constantes de la aplicación centralizadas
 * 
 * Este archivo actúa como una "Fuente Única de Verdad" (Single Source of Truth)
 * para valores mágicos que se repiten o que requieren contexto semántico.
 */

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
    WATCH_TIME_INTERVAL_MS: 600000,     // 10 min
    WATCH_TIME_INITIAL_DELAY_MS: 5000,  // 5 seg (arranque diferido)
    
    // Cache de Gist Storage
    GIST_CACHE_TTL_MS: 60000,           // 1 min de vida para la cache local

    // Session Stats
    ACTIVITY_TRACKER_INTERVAL_MS: 60000, // 1 min

    // Stream History
    STREAM_CHECK_INTERVAL_MS: 60000,     // 1 min
    STREAM_SAVE_COOLDOWN_MS: 300000,     // 5 min

    // XP System
    STREAM_START_WINDOW_MS: 600000,      // 10 min (ventana para bonus de inicio)

    // Reconnect
    RECONNECT_BASE_DELAY_MS: 1000,
    RECONNECT_MAX_DELAY_MS: 30000,

    // Animación
    ANIMATION_COOLDOWN_MS: 30000,        // Tiempo sin mensajes para animación completa
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
    SAVE_DEBOUNCE_MS: 5000,             // Frecuencia máxima de guardado en Gist
    MAX_XP_PER_MESSAGE: 100,            // Tope de XP por un solo mensaje
};

// Configuración de almacenamiento y red
export const STORAGE = {
    MAX_RETRIES: 3,                     // Intentos máximos en caso de fallo de red
    BASE_RETRY_DELAY_MS: 1000,          // Delay base para backoff exponencial
};
