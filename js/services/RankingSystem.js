import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import { DATA_SOURCES } from '../constants/AppConstants.js';
import Logger from '../utils/Logger.js';

/**
 * Configuración de roles estáticos para evitar re-asignación en cada llamada.
 */
const ROLES_CONFIG = {
    ADMIN: {
        role: 'admin',
        badge: 'ADMIN',
        containerClass: 'admin-user',
        badgeClass: 'admin',
        rankTitle: { title: 'SYSTEM OVERLORD', icon: 'icon-arasaka' }
    },
    SYSTEM: {
        role: 'admin', 
        badge: 'ROOT',
        containerClass: 'admin-user',
        badgeClass: 'admin',
        rankTitle: { title: 'AI CONSTRUCT', icon: 'icon-netwatch' }
    },
    CITIZEN: {
        role: 'normal',
        badge: '',
        containerClass: '',
        badgeClass: '',
        rankTitle: { title: 'CITIZEN OF NIGHT CITY', icon: 'icon-tech' } 
    }
};

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
            Logger.info('RankingSystem', `🏆 Global Rankings loaded from Gist: ${this.userRankings.size} users`);
        } catch (error) {
            Logger.error('RankingSystem', '❌ Error al cargar rankings desde Gist:', error);
        }
    }

    getUserRank(username) {
        if (!username || typeof username !== 'string') return null;
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
        const lowerUser = (userData.displayName || '').toLowerCase();
        let changed = false;

        // 1. Lógica de Rango y Movimientos (Ascensos/Descensos)
        if (this._handleRankMovement(stats, rank)) changed = true;

        // 2. Récord Histórico de Rango
        if (this._updateHistoricalRecords(stats, rank)) changed = true;

        // 3. Contadores de Días en el Top (Persistencia diaria)
        if (this._manageDailyCounters(stats, rank, today)) changed = true;

        // 4. Lógica de Destronamiento
        if (this._detectDethronement(stats, rank, previousTop1User, lowerUser)) changed = true;

        if (changed) {
            userData.achievementStats = stats;
        }
        return changed;
    }

    /**
     * Gestiona la lógica de ascensos, descensos, comebacks y rivales
     * @private
     */
    _handleRankMovement(stats, rank) {
        if (stats.currentRank === rank) return false;

        const previousStoredRank = stats.currentRank || 999;
        stats.currentRank = rank;
        const climb = previousStoredRank - rank;
        
        if (climb > 0) {
            // ASCENSO
            stats.bestDailyClimb = Math.max(stats.bestDailyClimb || 0, climb);
            stats.bestClimb = Math.max(stats.bestClimb || 0, climb);

            // Lógica de Comebacks (Volver al Top 10)
            if (rank <= 10 && previousStoredRank > 10 && stats.hasBeenInTop10) {
                stats.comebacks = (stats.comebacks || 0) + 1;
            }

            // Lógica de Rivals Defeated (Superar a quien te superó)
            if (stats.whoSurpassedMe && stats.whoSurpassedMe.length > 0) {
                if (climb >= 1) {
                    stats.rivalsDefeated = (stats.rivalsDefeated || 0) + 1;
                    stats.whoSurpassedMe = [];
                }
            }
        } else if (climb < 0) {
            // DESCENSO
            if (!stats.whoSurpassedMe) stats.whoSurpassedMe = [];
            if (stats.whoSurpassedMe.length < 5) {
                stats.whoSurpassedMe.push('someone');
            }
        }

        if (rank <= 10 && !stats.hasBeenInTop10) {
            stats.hasBeenInTop10 = true;
        }

        return true;
    }

    /**
     * Actualiza el récord histórico de mejor rango
     * @private
     */
    _updateHistoricalRecords(stats, rank) {
        if (rank < (stats.bestRank || 999)) {
            stats.bestRank = rank;
            return true;
        }
        return false;
    }

    /**
     * Gestiona los contadores de días en rangos específicos
     * @private
     */
    _manageDailyCounters(stats, rank, today) {
        if (stats.lastRankUpdateDate !== today) {
            stats.lastRankUpdateDate = today;
            if (rank === 1) stats.daysAsTop1 = (stats.daysAsTop1 || 0) + 1;
            if (rank <= 10) stats.daysInTop10 = (stats.daysInTop10 || 0) + 1;
            if (rank <= 15) stats.daysInTop15 = (stats.daysInTop15 || 0) + 1;
            return true;
        }
        return false;
    }

    /**
     * Detecta si un usuario ha tomado el trono del Top 1
     * @private
     */
    _detectDethronement(stats, rank, previousTop1User, lowerUser) {
        if (rank === 1 && previousTop1User && previousTop1User !== lowerUser) {
            if (!stats.dethroned) {
                stats.dethroned = true;
                if (this.config.DEBUG) Logger.info('RankingSystem', `👑 ${lowerUser} destronó a ${previousTop1User}!`);
                return true;
            }
        }
        return false;
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

        // 1. Identificar usuarios del Top 20 que faltan en memoria
        const missingUserPromises = [];
        for (const [idOrName, rank] of rankingMap.entries()) {
            const key = String(idOrName).toLowerCase();
            const userData = this.stateManager.getUser(key);

            if (!userData && rank <= 20) {
                if (this.config.DEBUG) Logger.info('RankingSystem', `🔄 Preparando carga paralela de Top User offline: ${key} (Rank ${rank})`);
                missingUserPromises.push(
                    this.stateManager.ensureUserLoaded(key)
                        .catch(err => Logger.error('RankingSystem', `❌ Falló precarga de ${key}:`, err))
                );
            }
        }

        // 2. Cargar todos los usuarios faltantes en paralelo (Batch processing) con tolerancia a fallos
        if (missingUserPromises.length > 0) {
            const results = await Promise.allSettled(missingUserPromises);
            
            // Log de errores específicos para usuarios del Top 20 que fallaron
            const failures = results.filter(r => r.status === 'rejected');
            if (failures.length > 0 && this.config.DEBUG) {
                Logger.warn('RankingSystem', `⚠️ Fallaron ${failures.length} precargas de usuarios offline.`);
            }
        }

        // 3. Aplicar actualizaciones una vez que los datos están listos
        const updatedUsers = [];

        for (const [idOrName, rank] of rankingMap.entries()) {
            const key = String(idOrName).toLowerCase();
            const userData = this.stateManager.getUser(key);

            if (!userData) continue;

            const statsChanged = this._updateUserRankStats(userData, rank, previousTop1User, today);

            if (statsChanged) {
                this.stateManager.markDirty(key);
                changesCount++;
                
                updatedUsers.push({
                    username: (userData.displayName || key).toLowerCase(),
                    rank: rank
                });
            }
        }

        // 4. Emisión de eventos eficiente (Batch)
        if (updatedUsers.length > 0) {
            EventManager.emit(EVENTS.USER.RANKING_BATCH_UPDATED, { 
                users: updatedUsers,
                isInitialLoad 
            });

            // Compatibilidad hacia atrás (Opcional: solo si hay listeners antiguos)
            if (updatedUsers.length < 5) {
                updatedUsers.forEach(u => EventManager.emit(EVENTS.USER.RANKING_UPDATED, { ...u, isInitialLoad }));
            }
        }

        if (changesCount > 0 && this.config.DEBUG) {
            Logger.info('RankingSystem', `📊 Ranking stats updated for ${changesCount} users`);
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
     * @param {string} username - Nombre del usuario
     * @param {Object} [userData] - Datos de usuario (opcional, para nivel)
     * @param {Object} [levelCalculator] - Instancia de LevelCalculator (opcional, usa la inyectada si no se provee)
     * @returns {Object} Objeto con información del rol
     */
    getUserRole(username, userData = null, levelCalculator = null) {
        // Normalización defensiva de entrada
        const safeUsername = (username && typeof username === 'string') ? username.toLowerCase() : '';
        const id = safeUsername; 

        // 1. Casos Especiales (Admin / System)
        if (safeUsername === this.adminUser) return ROLES_CONFIG.ADMIN;
        if (safeUsername === 'system') return ROLES_CONFIG.SYSTEM;

        // 2. Lógica de Ranking (Top Users)
        const rank = this.userRankings.get(safeUsername);
        let result = { ...ROLES_CONFIG.CITIZEN };

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

        // 3. Lógica de Fusión con Nivel (Solo si no es Top 15)
        const finalCalculator = levelCalculator || this.levelCalculator;
        const hasCustomTitle = rank && rank <= 15;
        
        if (!hasCustomTitle && userData?.level && finalCalculator) {
            const levelTitle = finalCalculator.getLevelTitle(userData.level);
            if (levelTitle) {
                result.rankTitle = { 
                    title: levelTitle, 
                    icon: result.rankTitle.icon 
                };
            }
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
