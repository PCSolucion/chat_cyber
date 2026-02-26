import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import { DATA_SOURCES } from '../constants/AppConstants.js';

/**
 * RankingSystem - Sistema de Gestión de Rankings y Roles (Gist Edition)
 * 
 * Responsabilidades:
 * - Cargar rankings estáticos desde un Gist público (Retro v1.1.3)
 * - Determinar roles de usuarios (Admin, Top, VIP, etc.)
 * - Asignar títulos Cyberpunk según ranking
 * - Gestionar iconos de rango
 * 
 * Migrado de Firestore dinámico → Gist estático (Rollback solicitado)
 * 
 * @class RankingSystem
 */
export default class RankingSystem {
    /**
     * Constructor del sistema de ranking
     * @param {Object} config - Configuración global
     */
    constructor(config) {
        this.config = config;
        this.userRankings = new Map();
        this.adminUser = config.TWITCH_CHANNEL;
        this.isLoaded = false;
        this.stateManager = null;

        this.stateManager = null;
    }

    /**
     * Inyecta la referencia al UserStateManager
     * @param {UserStateManager} stateManager
     */
    setStateManager(stateManager) {
        this.stateManager = stateManager;
    }


    async loadRankings() {
        try {
            const url = DATA_SOURCES.TOP_RANKINGS_GIST;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Ranking Gist not reachable');
            
            const rawText = await response.text();
            this.userRankings.clear();
            
            // Parsing Tsv format from Gist: Rank\tUsername\tExp
            const lines = rawText.split('\n');
            lines.forEach(line => {
                const parts = line.split('\t');
                if (parts.length >= 2) {
                    const rank = parseInt(parts[0]);
                    const username = parts[1].trim().toLowerCase();
                    
                    // Validación de seguridad: Rango positivo y formato de username Twitch (alfanumérico + _)
                    if (!isNaN(rank) && rank > 0 && username && /^[a-z0-9_]+$/.test(username)) {
                        this.userRankings.set(username, rank);
                    }
                }
            });

            this.isLoaded = true;
            console.log(`🏆 Global Rankings loaded from Gist: ${this.userRankings.size} users`);
        } catch (error) {
            console.error('❌ Error al cargar rankings desde Gist:', error);
        }
    }

    getUserRank(username) {
        if (!username) return null;
        const lowerName = username.toLowerCase();
        return this.userRankings.get(lowerName) || null;
    }

    /**
     * Identifica al usuario que ostentaba el Top 1 antes de la actualización
     * @private
     * @returns {string|null} Username en minúsculas
     */
    _getPreviousTop1() {
        if (!this.stateManager) return null;
        for (const [username, userData] of this.stateManager.getAllUsers().entries()) {
            if (userData.achievementStats && userData.achievementStats.currentRank === 1) {
                return username;
            }
        }
        return null;
    }

    /**
     * Procesa y actualiza las estadísticas de rango y récords de un usuario
     * @private
     * @param {Object} userData - Datos de usuario
     * @param {number} rank - Rango actual en el ranking
     * @param {string} previousTop1User - Username del Top 1 anterior
     * @param {string} today - Fecha actual en string
     * @returns {boolean} True si hubo cambios en los datos
     */
    _updateUserRankStats(userData, rank, previousTop1User, today) {
        const stats = userData.achievementStats || {};
        const previousRank = stats.currentRank || 999;
        const lowerUser = (userData.displayName || '').toLowerCase();
        let changed = false;

        // 1. Lógica de Rango y Ascensos
        if (stats.currentRank !== rank) {
            stats.currentRank = rank;
            changed = true;
            const climb = previousRank - rank;
            if (climb > 0) {
                stats.bestDailyClimb = Math.max(stats.bestDailyClimb || 0, climb);
                stats.bestClimb = Math.max(stats.bestClimb || 0, climb);
            }
        }

        // 2. Récord Histórico de Rango
        if (rank < (stats.bestRank || 999)) {
            stats.bestRank = rank;
            changed = true;
        }

        // 3. Contadores de Días en el Top (Persistencia diaria)
        if (stats.lastRankUpdateDate !== today) {
            stats.lastRankUpdateDate = today;
            if (rank === 1) stats.daysAsTop1 = (stats.daysAsTop1 || 0) + 1;
            if (rank <= 10) stats.daysInTop10 = (stats.daysInTop10 || 0) + 1;
            if (rank <= 15) stats.daysInTop15 = (stats.daysInTop15 || 0) + 1;
            changed = true;
        }

        // 4. Lógica de Destronamiento
        if (rank === 1 && previousTop1User && previousTop1User !== lowerUser) {
            if (!stats.dethroned) {
                stats.dethroned = true;
                changed = true;
                if (this.config.DEBUG) console.log(`👑 ${lowerUser} destronó a ${previousTop1User}!`);
            }
        }

        if (changed) {
            userData.achievementStats = stats;
        }
        return changed;
    }

    /**
     * Actualiza las estadísticas de ranking de los usuarios y emite eventos
     * @param {Map} rankingMap - Mapa de username -> rank
     * @param {boolean} isInitialLoad - Si es la carga inicial
     */
    async updateRankingStats(rankingMap, isInitialLoad = false) {
        if (!rankingMap || rankingMap.size === 0) return;

        const today = new Date().toDateString();
        let changesCount = 0;

        const previousTop1User = this._getPreviousTop1();

        for (const [idOrName, rank] of rankingMap.entries()) {
            const key = String(idOrName).toLowerCase();
            let userData = this.stateManager.getUser(key);

            // Carga bajo demanda para usuarios del Top que no están en RAM (lurkers o ausentes)
            if (!userData && rank <= 20) {
                try {
                    if (this.config.DEBUG) console.log(`🔄 Pre-cargando Top User offline: ${key} (Rank ${rank})`);
                    await this.stateManager.ensureUserLoaded(key);
                    userData = this.stateManager.getUser(key);
                } catch (error) {
                    console.error(`❌ Error cargando usuario offline para ranking (${key}):`, error);
                    continue;
                }
            }

            if (!userData) continue;

            const statsChanged = this._updateUserRankStats(userData, rank, previousTop1User, today);

            if (statsChanged) {
                this.stateManager.markDirty(key);
                changesCount++;
                EventManager.emit(EVENTS.USER.RANKING_UPDATED, { 
                    userId: String(idOrName),
                    username: (userData.displayName || key).toLowerCase(), 
                    isInitialLoad 
                });
            }
        }

        if (changesCount > 0 && this.config.DEBUG) {
            console.log(`📊 Ranking stats updated for ${changesCount} users`);
        }
    }

    /**
     * Inyecta la referencia al LevelCalculator (Opcional, mejora desacoplamiento)
     * @param {LevelCalculator} levelCalculator
     */
    setLevelCalculator(levelCalculator) {
        this.levelCalculator = levelCalculator;
    }

    /**
     * Determina el rol completo y título de un usuario, fusionando Ranking y Nivel
     * Incluye: role, badge, clases CSS, título Cyberpunk final
     * 
     * @param {string} userId - ID del usuario
     * @param {string} username - Nombre del usuario
     * @param {Object} [userData] - Datos de usuario (opcional, para nivel)
     * @param {Object} [levelCalculator] - Instancia de LevelCalculator (opcional, usa la inyectada si no se provee)
     * @returns {Object} Objeto con información del rol
     */
    getUserRole(userId, username, userData = null, levelCalculator = null) {
        const lowerUser = username ? username.toLowerCase() : '';
        const id = lowerUser; 

        // ADMIN
        if (lowerUser === this.adminUser) {
            return {
                role: 'admin',
                badge: 'ADMIN',
                containerClass: 'admin-user',
                badgeClass: 'admin',
                rankTitle: { title: 'SYSTEM OVERLORD', icon: 'icon-arasaka' }
            };
        }

        // SYSTEM BOT
        if (lowerUser === 'system') {
            return {
                role: 'admin', 
                badge: 'ROOT',
                containerClass: 'admin-user',
                badgeClass: 'admin',
                rankTitle: { title: 'AI CONSTRUCT', icon: 'icon-netwatch' }
            };
        }

        const rank = this.userRankings.get(id);
        
        // Estructura base
        let result = {
            role: 'normal',
            badge: '',
            containerClass: '',
            badgeClass: '',
            rankTitle: { title: 'CITIZEN OF NIGHT CITY', icon: 'icon-tech' } 
        };

        // Lógica de Ranking (Top Users)
        if (rank) {
            if (rank === 1) {
                result = {
                    role: 'top',
                    badge: 'TOP 1',
                    containerClass: 'top-user',
                    badgeClass: 'top-user',
                    rankTitle: { title: 'LEGEND OF NIGHT CITY', icon: 'icon-max-tac' }
                };
            } else if (rank <= 15) {
                result = {
                    role: 'vip',
                    badge: `TOP ${rank}`,
                    containerClass: 'vip-user',
                    badgeClass: 'vip',
                    rankTitle: { title: 'ELITE MERCENARY', icon: 'icon-fixer' }
                };
            } else {
                result = {
                    role: 'ranked',
                    badge: `TOP ${rank}`,
                    containerClass: 'ranked-user',
                    badgeClass: 'ranked',
                    rankTitle: { title: 'KNOWN RUNNER', icon: 'icon-tech' }
                };
            }
        }

        // Lógica de Fusión con Nivel
        const finalCalculator = levelCalculator || this.levelCalculator;
        const isHighRank = rank && rank <= 15;
        
        if (!isHighRank && userData && userData.level && finalCalculator) {
            const levelTitle = finalCalculator.getLevelTitle(userData.level);
            result.rankTitle = { 
                title: levelTitle, 
                icon: result.rankTitle.icon 
            };
        }

        return result;
    }

    /**
     * Obtiene el total de usuarios rankeados
     * @returns {number}
     */
    getTotalRankedUsers() {
        return this.userRankings.size;
    }
}
