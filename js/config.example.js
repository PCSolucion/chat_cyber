/**
 * Configuración del Overlay de Chat de Twitch
 * Todas las constantes y configuraciones centralizadas
 */

const CONFIG = {
    // Configuración de Twitch
    TWITCH_CHANNEL: 'liiukiin',

    // Tiempos (en milisegundos)
    MESSAGE_DISPLAY_TIME: 14000,
    TRANSITION_DURATION: 700,

    // Audio - Cyberpunk style sound
    AUDIO_URL: 'cyberpunk-message.mp3',
    AUDIO_VOLUME: 1.0,

    // Ranking Data Source
    // Puedes usar una URL externa (ej. Gist de GitHub) o un archivo local relativo
    TOP_DATA_URL: 'https://gist.githubusercontent.com/PCSolucion/550afe48a9954f54462ec201e49c851b/raw',

    // Tamaños y dimensiones
    EMOTE_SIZE: '1.2em',

    // Animación
    ANIMATION_COOLDOWN_MS: 30000, // Tiempo sin mensajes antes de mostrar animación completa

    // Números de piloto
    MIN_RANDOM_NUMBER: 1,
    MAX_RANDOM_NUMBER: 99,

    // Usuario especial
    SPECIAL_USER: {
        username: 'liiukiin',
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
    // Reemplaza estos valores con tus propias credenciales
    XP_GIST_ID: 'YOUR_GIST_ID_HERE', // ID del Gist restaurado
    XP_GIST_TOKEN: 'YOUR_GITHUB_TOKEN_HERE', // Token actualizado
    XP_GIST_FILENAME: 'xp_data.json', // Nombre del archivo en el Gist

    // Sonido de Level Up (opcional)
    XP_LEVELUP_SOUND: null, // Ruta al archivo de sonido, ej: 'sounds/levelup.mp3'

    // Tiempo de display del popup de Level Up (ms)
    XP_LEVELUP_DISPLAY_TIME: 4000
};

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
