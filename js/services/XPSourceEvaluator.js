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

        return { totalXP, sources: xpSources };
    }

    /**
     * Verifica si una fuente está activa en la config
     * @private
     */
    _isEnabled(sourceId) {
        return this.xpConfig.sources[sourceId] && this.xpConfig.sources[sourceId].enabled;
    }
}
