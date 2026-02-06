/**
 * Configuración del Overlay de Chat de Twitch - PLANTILLA
 * Renombra este archivo a 'config.js' y completa tus credenciales.
 * 
 * Los valores técnicos por defecto se encuentran en js/constants/AppConstants.js
 */

const CONFIG = {
    // 1. CONFIGURACIÓN DE TWITCH (OBLIGATORIO)
    TWITCH_CHANNEL: 'tu_canal_aqui',
    BROADCASTER_USERNAME: 'tu_usuario',
    
    // 2. SISTEMA DE EXPERIENCIA Y PERSISTENCIA (OBLIGATORIO)
    // Crea un Gist privado y obtén un Token en https://github.com/settings/tokens
    XP_GIST_ID: 'TU_GIST_ID_AQUI',
    XP_GIST_TOKEN: 'TU_TOKEN_AQUI', 

    // 3. PERSONALIZACIÓN VISUAL (OPCIONAL)
    UI: {
        // Los iconos de rango por defecto ya están configurados
        // Mantenemos USER_THEMES aquí como ejemplo de personalización
        USER_THEMES: {
            'usuario_ejemplo': 'tema-ejemplo-bg'
        }
    },

    // 4. FILTROS DE USUARIOS (OPCIONAL)
    // Usuarios completamente excluidos (Bots)
    BLACKLISTED_USERS: [
        'wizebot',
        'streamelements',
        'botrixoficial'
    ],

    // 5. AJUSTES DE DEBUG
    DEBUG: false
};

export default CONFIG;

