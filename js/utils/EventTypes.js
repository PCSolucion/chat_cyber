/**
 * EventTypes.js - Catálogo de Eventos Centralizado
 * 
 * Contrato de comunicación entre componentes para evitar el uso de strings mágicos.
 * Facilita el mantenimiento, la refactorización y el autocompletado del IDE.
 */

export const EVENTS = {
    // Eventos de Chat
    CHAT: {
        MESSAGE_RECEIVED: 'chat:messageReceived',
    },

    // Eventos de Usuario (XP, Niveles, Logros)
    USER: {
        ACTIVITY: 'user:activity',
        LEVEL_UP: 'user:levelUp',
        BRO_PROGRESS: 'user:broProgress',
        ACHIEVEMENT_UNLOCKED: 'user:achievementUnlocked',
        XP_GAINED: 'user:xpGained',
        RANKING_UPDATED: 'user:rankingUpdated'
    },

    // Eventos de Stream (Twitch)
    STREAM: {
        STATUS_CHANGED: 'stream:statusChanged',
        CATEGORY_UPDATED: 'stream:categoryUpdated'
    },

    // Eventos de Interfaz (UI)
    UI: {
        SYSTEM_MESSAGE: 'ui:systemMessage',
        SHOW_NOTIFICATION: 'ui:showNotification',
        FLASH_LED: 'ui:flashLed',
        MESSAGE_HIDDEN: 'ui:messageHidden'
    },

    // Eventos de Almacenamiento / Backend
    STORAGE: {
        DATA_SAVED: 'gist:dataSaved',
        DATA_ERROR: 'gist:dataError'
    },

    // Eventos de Sistema / Diagnóstico
    SYSTEM: {
        ERROR: 'system:error',
        TICK: 'system:tick'
    },

    // Eventos de Audio
    AUDIO: {
        PLAY: 'audio:play',
        TEST: 'test:sound'
    }
};

export default EVENTS;
