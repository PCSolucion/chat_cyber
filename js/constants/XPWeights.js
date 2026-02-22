/**
 * Configuración de Pesos y Fuentes de XP
 * Centraliza el balanceo del sistema de experiencia.
 */
import { XP, QUALITY } from './AppConstants.js';

export const XP_SOURCES = {
    MESSAGE: {
        id: 'message',
        name: 'Mensaje enviado',
        xp: 5,
        cooldownMs: 0,
        enabled: true
    },
    FIRST_MESSAGE_DAY: {
        id: 'first_message_day',
        name: 'Primer mensaje del día',
        xp: 20,
        cooldownMs: 0,
        enabled: true
    },
    STREAM_ACTIVE: {
        id: 'stream_active',
        name: 'Mensaje durante stream',
        xp: 10,
        cooldownMs: 0,
        enabled: true
    },
    EMOTE_USED: {
        id: 'emote_used',
        name: 'Uso de emote',
        xp: 2,
        maxPerMessage: 5,
        cooldownMs: 0,
        enabled: true
    },
    STREAK_BONUS: {
        id: 'streak_bonus',
        name: 'Racha de participación',
        xp: 50,
        streakDays: 3,
        cooldownMs: 0,
        enabled: true
    },
    STREAM_START: {
        id: 'stream_start',
        name: 'Mensaje al inicio del stream',
        xp: 25,
        windowMinutes: 5,
        cooldownMs: 0,
        enabled: true
    },
    MENTION_USER: {
        id: 'mention_user',
        name: 'Mención a otro usuario',
        xp: 8,
        cooldownMs: 0,
        enabled: true
    },
    WATCH_TIME: {
        id: 'watch_time',
        name: 'Tiempo de visualización',
        xp: XP.WATCH_TIME_XP || 10,
        cooldownMs: 0,
        enabled: true
    },
    RETURN_BONUS: {
        id: 'return_bonus',
        name: 'Welcome Back bonus',
        xp: XP.RETURN_BONUS_XP || 30,
        cooldownMs: 0,
        enabled: true
    },
    MSG_QUALITY: {
        id: 'msg_quality',
        name: 'Message Quality',
        highQualityXP: QUALITY.HIGH_QUALITY_XP,
        lowEffortPenalty: QUALITY.LOW_EFFORT_PENALTY,
        minLengthHigh: QUALITY.MIN_LENGTH_HIGH,
        maxLengthHigh: QUALITY.MAX_LENGTH_HIGH,
        minLengthLow: QUALITY.MIN_LENGTH_LOW,
        maxLengthLow: QUALITY.MAX_LENGTH_LOW,
        cooldownMs: 0,
        enabled: true
    }
};

export const XP_SETTINGS = {
    minTimeBetweenXP: XP.MIN_TIME_BETWEEN_XP_MS,
    saveDebounceMs: XP.SAVE_DEBOUNCE_MS,
    maxXPPerMessage: XP.MAX_XP_PER_MESSAGE
};

export const STREAK_MULTIPLIERS = [
    { minDays: 20, multiplier: 3.0 },
    { minDays: 10, multiplier: 2.0 },
    { minDays: 5, multiplier: 1.5 },
    { minDays: 3, multiplier: 1.2 },
    { minDays: 0, multiplier: 1.0 }
];

export const ACHIEVEMENT_REWARDS = XP.ACHIEVEMENT_REWARDS || {
    common: 50,
    uncommon: 75,
    rare: 150,
    epic: 250,
    legendary: 500
};

export const XP_CONFIG = {
    sources: XP_SOURCES,
    settings: XP_SETTINGS,
    streakMultipliers: STREAK_MULTIPLIERS,
    achievementRewards: ACHIEVEMENT_REWARDS
};

export default XP_CONFIG;
