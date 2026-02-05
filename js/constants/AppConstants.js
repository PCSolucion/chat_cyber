/**
 * Constantes de la aplicación centralizadas
 * 
 * Este archivo actúa como una "Fuente Única de Verdad" (Single Source of Truth)
 * para valores mágicos que se repiten o que requieren contexto semántico.
 */

// Tiempos en milisegundos relacionados con bucles y polling
export const TIMING = {
    // Polling de metadata del stream (Categoría y Estado Online/Offline)
    METADATA_CHECK_ONLINE_MS: 600000,   // 10 min cuando está online (para no saturar API)
    METADATA_CHECK_OFFLINE_MS: 60000,   // 1 min cuando está offline (para detectar inicio rápido)
    
    // Watch Time Tracker (Sistema de XP por tiempo)
    WATCH_TIME_INTERVAL_MS: 600000,     // 10 min
    WATCH_TIME_INITIAL_DELAY_MS: 5000,  // 5 seg (arranque diferido)
    
    // Cache de Gist Storage
    GIST_CACHE_TTL_MS: 60000,           // 1 min de vida para la cache local
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

// Configuración de almacenamiento y red
export const STORAGE = {
    MAX_RETRIES: 3,                     // Intentos máximos en caso de fallo de red
    BASE_RETRY_DELAY_MS: 1000,          // Delay base para backoff exponencial
};
