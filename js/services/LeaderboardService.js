import Logger from '../utils/Logger.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

/**
 * LeaderboardService - Gestor del Ranking Global (Top 100)
 * 
 * Responsabilidades:
 * - Mantener la lista de los 100 mejores usuarios sincronizada con Firestore.
 * - Proporcionar una fuente de verdad para el RankingSystem sin cargar miles de documentos.
 * - Actualizar el documento global 'system_data/leaderboard' eficientemente.
 */
export default class LeaderboardService {
    constructor(config, firestore) {
        this.config = config;
        this.firestore = firestore;
        
        // La lista Top 100: [{username, level, xp, displayName}, ...]
        this.topUsers = [];
        this.isLoaded = false;
        
        // Cooldown para no saturar Firestore con escrituras de ranking
        this.lastSaveTime = 0;
        this.saveCooldownMs = 300000; // 5 minutos entre actualizaciones de ranking global
        this.pendingSave = false;
    }

    async init() {
        await this.loadFromCloud();
    }

    async loadFromCloud() {
        if (!this.firestore) return;
        
        try {
            const data = await this.firestore.getSystemData('leaderboard');
            if (data && data.users) {
                this.topUsers = data.users;
                if (this.config.DEBUG) Logger.info('Leaderboard', `🏆 Cargados ${this.topUsers.length} usuarios del ranking global.`);
            }
            this.isLoaded = true;
            
            // Notificar que el ranking global está listo
            EventManager.emit(EVENTS.USER.RANKING_UPDATED, { isInitialLoad: true });
        } catch (e) {
            Logger.error('Leaderboard', 'Error cargando ranking global:', e);
        }
    }

    /**
     * Evalúa si un usuario debe entrar o subir en el Top 100
     * @param {Object} userData - Datos actuales del usuario
     */
    updateUserEntry(userData) {
        if (!userData || !userData.displayName) return;
        
        const username = userData.displayName.toLowerCase();
        const userEntry = {
            username: username,
            displayName: userData.displayName,
            level: userData.level || 1,
            xp: userData.xp || 0,
            messages: userData.totalMessages || 0,
            lastUpdate: Date.now()
        };

        // 1. Buscar si ya está en el Top
        const existingIndex = this.topUsers.findIndex(u => u.username === username);
        
        if (existingIndex !== -1) {
            // Actualizar datos
            this.topUsers[existingIndex] = userEntry;
        } else {
            // No está, ver si tiene nivel suficiente para entrar
            if (this.topUsers.length < 100) {
                this.topUsers.push(userEntry);
            } else {
                // Comparar con el último del Top 100
                const lastUser = this.topUsers[this.topUsers.length - 1];
                if (userEntry.level > lastUser.level || (userEntry.level === lastUser.level && userEntry.xp > lastUser.xp)) {
                    this.topUsers[this.topUsers.length - 1] = userEntry;
                } else {
                    // No entra en el Top 100
                    return;
                }
            }
        }

        // 2. Re-ordenar el Top 100
        this.topUsers.sort((a, b) => {
            if (b.level !== a.level) return b.level - a.level;
            return b.xp - a.xp;
        });

        // 3. Mantener límite de 100
        if (this.topUsers.length > 100) {
            this.topUsers = this.topUsers.slice(0, 100);
        }

        // 4. Marcar para guardado
        this.scheduleCloudSave();
        
        // Notificar cambio en el ranking
        EventManager.emit(EVENTS.USER.RANKING_UPDATED, { username: username });
    }

    scheduleCloudSave() {
        if (this.pendingSave) return;
        
        const now = Date.now();
        const timeSinceLastSave = now - this.lastSaveTime;
        
        if (timeSinceLastSave >= this.saveCooldownMs) {
            this.saveToCloud();
        } else {
            this.pendingSave = true;
            setTimeout(() => this.saveToCloud(), this.saveCooldownMs - timeSinceLastSave);
        }
    }

    async saveToCloud() {
        if (!this.firestore) return;
        
        try {
            this.pendingSave = false;
            this.lastSaveTime = Date.now();
            
            await this.firestore.saveSystemData('leaderboard', {
                users: this.topUsers,
                updatedAt: new Date().toISOString()
            });
            
            if (this.config.DEBUG) Logger.debug('Leaderboard', '💾 Ranking global persistido en Firestore.');
        } catch (e) {
            Logger.error('Leaderboard', 'Error guardando ranking global:', e);
        }
    }

    getTopUsers(limit = 100) {
        return this.topUsers.slice(0, limit);
    }

    getUserRank(username) {
        if (!username) return null;
        const index = this.topUsers.findIndex(u => u.username === username.toLowerCase());
        return index !== -1 ? index + 1 : null;
    }
}
