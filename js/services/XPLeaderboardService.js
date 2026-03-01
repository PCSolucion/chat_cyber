/**
 * XPLeaderboardService - Manejo de estadísticas y tablas de clasificación de XP
 * 
 * Responsabilidades:
 * - Proveer el Leaderboard (Top usuarios por XP)
 * - Calcular estadísticas globales de interacción
 * - Exportar datos en JSON
 */
export default class XPLeaderboardService {
    /**
     * @param {UserStateManager} stateManager - Gestor de estado de usuarios
     * @param {LevelCalculator} levelCalculator - Calculadora de niveles
     */
    constructor(stateManager, levelCalculator) {
        this.stateManager = stateManager;
        this.levelCalculator = levelCalculator;
    }

    /**
     * Obtiene estadísticas de tiempo de visualización de un usuario
     * @param {string} username
     * @returns {number} Minutos visualizados
     */
    getWatchTimeStats(username) {
        const userData = this.stateManager.getUser(username);
        if (!userData) return 0;
        return userData.watchTimeMinutes || 0;
    }

    /**
     * Devuelve el ranking de usuarios
     * @param {number} limit 
     * @returns {Array} Colección de usuarios ordenada
     */
    getXPLeaderboard(limit = 10) {
        const users = Array.from(this.stateManager.getAllUsers().entries())
            .map(([id, data]) => ({
                userId: id,
                username: data.displayName || id,
                xp: data.xp,
                level: data.level,
                title: this.levelCalculator.getLevelTitle(data.level)
            }))
            .sort((a, b) => b.xp - a.xp)
            .slice(0, limit);

        return users;
    }

    /**
     * Obtiene estadísticas globales del sistema
     * @returns {Object}
     */
    getGlobalStats() {
        let totalXP = 0;
        let totalMessages = 0;
        let highestLevel = 1;
        const users = this.stateManager.getAllUsers();

        users.forEach(data => {
            totalXP += data.xp;
            totalMessages += data.totalMessages;
            if (data.level > highestLevel) highestLevel = data.level;
        });

        return {
            totalUsers: users.size,
            totalXP,
            totalMessages,
            highestLevel,
            averageXP: users.size > 0 ? Math.floor(totalXP / users.size) : 0
        };
    }

    /**
     * Exporta toda la data a JSON
     * @returns {string} JSON string
     */
    getAllDataJSON() {
        const usersData = {};
        this.stateManager.getAllUsers().forEach((data, id) => {
            usersData[id] = data;
        });

        return JSON.stringify({
            users: usersData,
            lastUpdated: new Date().toISOString(),
            version: '1.2'
        }, null, 2);
    }
}
