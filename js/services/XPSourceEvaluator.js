import { QUALITY } from '../constants/AppConstants.js';

/**
 * XPSourceEvaluator - Fábrica de evaluación de puntos de experiencia
 * 
 * Responsabilidades:
 * - Evaluar cuánta XP otorga un mensaje analizando su contexto
 * - Aplicar límites y bonos específicos por fuente
 * - Generar un desglose detallado de las fuentes de XP
 */
export default class XPSourceEvaluator {
    /**
     * @param {Object} xpConfig - Configuración de fuentes y límites
     */
    constructor(xpConfig) {
        this.xpConfig = xpConfig;
    }

    /**
     * Evalúa la XP total para un mensaje
     * @param {Object} context - Datos del mensaje (hasEmotes, isStreamLive, etc)
     * @param {Object} state - Estado temporal (es primer mensaje de hoy para este user?)
     * @returns {Object} { totalXP, sources: [{source, xp}] }
     */
    evaluateMessage(context, state = {}) {
        let totalXP = 0;
        const xpSources = [];

        // 1. XP Base por mensaje
        if (this._isEnabled('MESSAGE')) {
            const xp = this.xpConfig.sources.MESSAGE.xp;
            totalXP += xp;
            xpSources.push({ source: 'MESSAGE', xp });
        }

        // 2. Bonus primer mensaje del día
        if (this._isEnabled('FIRST_MESSAGE_DAY') && !state.isIgnoredForBonus && state.isFirstMessageOfDay) {
            const xp = this.xpConfig.sources.FIRST_MESSAGE_DAY.xp;
            totalXP += xp;
            xpSources.push({ source: 'FIRST_MESSAGE_DAY', xp });
        }

        // 3. Bonus stream activo
        if (this._isEnabled('STREAM_ACTIVE') && context.isStreamLive) {
            const xp = this.xpConfig.sources.STREAM_ACTIVE.xp;
            totalXP += xp;
            xpSources.push({ source: 'STREAM_ACTIVE', xp });
        }

        // 4. XP por emotes
        if (this._isEnabled('EMOTE_USED') && context.hasEmotes && context.emoteCount > 0) {
            const config = this.xpConfig.sources.EMOTE_USED;
            const emoteXP = Math.min(context.emoteCount, config.maxPerMessage) * config.xp;
            totalXP += emoteXP;
            xpSources.push({ source: 'EMOTE_USED', xp: emoteXP });
        }

        // 5. Bonus inicio de stream
        if (this._isEnabled('STREAM_START') && context.isStreamStart) {
            const xp = this.xpConfig.sources.STREAM_START.xp;
            totalXP += xp;
            xpSources.push({ source: 'STREAM_START', xp });
        }

        // 6. XP por mención
        if (this._isEnabled('MENTION_USER') && context.hasMention) {
            const xp = this.xpConfig.sources.MENTION_USER.xp;
            totalXP += xp;
            xpSources.push({ source: 'MENTION_USER', xp });
        }

        // 7. Bonus por Racha (Solo si StreakManager detecta bonificación)
        if (this._isEnabled('STREAK_BONUS') && !state.isIgnoredForBonus && state.streakBonusAwarded) {
            const xp = this.xpConfig.sources.STREAK_BONUS.xp;
            totalXP += xp;
            xpSources.push({ source: 'STREAK_BONUS', xp });
        }

        // 8. Message Quality Score
        if (this._isEnabled('MSG_QUALITY') && context.message) {
            const qualityXP = this._evaluateMessageQuality(context);
            if (qualityXP !== 0) {
                // No permitir que el total baje de 1 XP
                const adjustedXP = Math.max(-totalXP + 1, qualityXP);
                totalXP += adjustedXP;
                xpSources.push({ source: 'MSG_QUALITY', xp: adjustedXP });
            }
        }

        return { totalXP, sources: xpSources };
    }

    /**
     * Verifica si una fuente está activa en la config
     * @private
     */
    _isEnabled(sourceId) {
        return this.xpConfig.sources[sourceId] && this.xpConfig.sources[sourceId].enabled;
    }

    /**
     * Evalúa la calidad de un mensaje y retorna bonus/penalty de XP
     * @param {Object} context - Contexto del mensaje
     * @returns {number} XP adjustment (positivo = bonus, negativo = penalty)
     * @private
     */
    _evaluateMessageQuality(context) {
        const config = this.xpConfig.sources.MSG_QUALITY;
        const msg = context.message.trim();
        const length = msg.length;

        // --- Low Effort Detection ---
        // Mensajes muy cortos (1-4 chars): "lol", "xd", "gg", "F"
        if (length >= config.minLengthLow && length <= config.maxLengthLow) {
            return config.lowEffortPenalty;
        }

        // Mensajes que son solo emotes (sin texto real)
        if (context.hasEmotes && context.emoteCount > 0) {
            // Quitar nombres de emotes del mensaje y ver si queda algo
            let textWithoutEmotes = msg;
            if (context.emoteNames) {
                for (const emote of context.emoteNames) {
                    textWithoutEmotes = textWithoutEmotes.replace(new RegExp(emote.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
                }
            }
            if (textWithoutEmotes.trim().length <= QUALITY.EMPTY_MSG_THRESHOLD) {
                return config.lowEffortPenalty; // Solo emotes, sin texto
            }
        }

        // --- High Quality Detection ---
        let qualityScore = 0;

        // Longitud óptima (conversación real)
        if (length >= config.minLengthHigh && length <= config.maxLengthHigh) {
            qualityScore++;
        }

        // Contiene pregunta (engagement)
        if (msg.includes('?')) {
            qualityScore++;
        }

        // Mención a otro usuario (interacción social)
        if (context.hasMention) {
            qualityScore++;
        }

        // Variedad de palabras (no spam repetitivo tipo "go go go go")
        const words = msg.toLowerCase().split(/\s+/).filter(w => w.length > 1);
        if (words.length >= QUALITY.MIN_WORDS_DIVERSITY) {
            const uniqueWords = new Set(words);
            const diversity = uniqueWords.size / words.length;
            if (diversity >= QUALITY.DIVERSITY_THRESHOLD) {
                qualityScore++;
            }
        }

        // Si cumple el mínimo de criterios de calidad → bonus
        if (qualityScore >= QUALITY.CRITERIA_REQUIRED_FOR_BONUS) {
            return config.highQualityXP;
        }

        return 0; // Calidad normal, sin modificación
    }
}
