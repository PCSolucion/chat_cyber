/**
 * StreakManager - Gestión de rachas de participación diaria
 * 
 * Responsabilidades:
 * - Calcular rachas consecutivas de actividad
 * - Determinar multiplicadores de XP basados en racha
 * - Manejar lógica de tiempo (hoy, ayer) para reseteos
 */
export default class StreakManager {
    /**
     * @param {Object} xpConfig - Configuración de XP (multiplicadores, bonus, etc)
     */
    constructor(xpConfig) {
        this.xpConfig = xpConfig;
    }

    /**
     * Actualiza la racha de un usuario basado en su última actividad
     * @param {Object} userData - Datos actuales del usuario
     * @returns {Object} Resultado con racha nivelada
     */
    updateStreak(userData) {
        const today = this.getCurrentDay();
        const lastDate = userData.lastStreakDate;

        let streakDays = userData.streakDays || 0;
        let bestStreak = userData.bestStreak || 0;
        let bonusAwarded = false;

        if (lastDate === today) {
            // Ya participó hoy, no cambiar racha
            return { streakDays, lastStreakDate: today, bonusAwarded: false, bestStreak };
        }

        const yesterday = this.getYesterday();

        if (lastDate === yesterday) {
            // Racha continúa
            streakDays += 1;

            // Actualizar mejor racha si es nueva marca
            if (streakDays > bestStreak) {
                bestStreak = streakDays;
            }

            // Bonus si alcanza el umbral (ej: cada 7 días)
            const streakBonusConfig = this.xpConfig.sources.STREAK_BONUS;
            if (streakBonusConfig && streakBonusConfig.enabled && 
                streakDays >= streakBonusConfig.streakDays &&
                streakDays % streakBonusConfig.streakDays === 0) {
                bonusAwarded = true;
            }
        } else {
            // Racha rota, reiniciar a 1 (hoy es su primer día de nueva racha)
            streakDays = 1;
            if (streakDays > bestStreak) bestStreak = streakDays;
        }

        return { streakDays, lastStreakDate: today, bonusAwarded, bestStreak };
    }

    /**
     * Calcula el multiplicador de XP basado en los días de racha
     * @param {number} streakDays 
     * @returns {number} Multiplicador (1.0, 1.5, 2.0, 3.0, etc)
     */
    getStreakMultiplier(streakDays) {
        const multipliers = this.xpConfig.streakMultipliers;
        if (!multipliers || !Array.isArray(multipliers)) return 1.0;

        // Las tiers suelen estar ordenadas de mayor a menor minDays
        for (const tier of multipliers) {
            if (streakDays >= tier.minDays) {
                return tier.multiplier;
            }
        }

        return 1.0;
    }

    /**
     * Obtiene la fecha actual en formato YYYY-MM-DD (ISO/Local safe)
     * @returns {string}
     */
    getCurrentDay() {
        const now = new Date();
        return this._formatDate(now);
    }

    /**
     * Obtiene la fecha de ayer en formato YYYY-MM-DD
     * @returns {string}
     */
    getYesterday() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return this._formatDate(yesterday);
    }

    /**
     * Formateador interno de fecha
     * @private
     */
    _formatDate(date) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
