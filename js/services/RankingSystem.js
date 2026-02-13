import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

/**
 * RankingSystem - Sistema de Gestión de Rankings y Roles
 * 
 * Responsabilidades:
 * - Calcular rankings dinámicos desde Firestore (por nivel/XP)
 * - Determinar roles de usuarios (Admin, Top, VIP, etc.)
 * - Asignar títulos Cyberpunk según ranking
 * - Gestionar iconos de rango
 * 
 * Migrado de Gist estático → Firestore dinámico (v1.1.4)
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
        this.adminUser = 'liiukiin';
        this.isLoaded = false;
        this.stateManager = null;
        this.leaderboardService = null;

        // Escuchar carga de usuarios para actualización reactiva
        EventManager.on(EVENTS.USER.LOADED, () => {
            if (this.isLoaded && !this.leaderboardService) {
                // Solo auto-calcular si no tenemos el servicio de leaderboard global
                this.loadRankings(); 
            }
        });
    }

    /**
     * Inyecta la referencia al UserStateManager
     * @param {UserStateManager} stateManager
     */
    setStateManager(stateManager) {
        this.stateManager = stateManager;
    }

    /**
     * Inyecta la referencia al LeaderboardService
     * @param {LeaderboardService} leaderboardService
     */
    setLeaderboardService(leaderboardService) {
        this.leaderboardService = leaderboardService;
        this.isLoaded = true; // El leaderboard service ya viene con datos o los carga él mismo
    }

    /**
     * Calcula los rankings dinámicamente desde los datos de Firestore.
     * OR RE-SYNCS from LeaderboardService.
     * 
     * @returns {Promise<void>}
     */
    async loadRankings() {
        try {
            // Si tenemos LeaderboardService, el ranking viene de ahí (Top 100 Global)
            if (this.leaderboardService) {
                this.userRankings.clear();
                const tops = this.leaderboardService.getTopUsers();
                tops.forEach((u, index) => {
                    this.userRankings.set(u.username.toLowerCase(), index + 1);
                });
                this.isLoaded = true;
                return;
            }

            // Fallback: Calcular basándose en lo que hay en RAM (menos preciso)
            if (!this.stateManager) return;
            const allUsers = this.stateManager.getAllUsers();
            if (!allUsers || allUsers.size === 0) return;

            const sorted = Array.from(allUsers.entries())
                .filter(([id, data]) => {
                    const blacklist = this.config.BLACKLISTED_USERS || [];
                    const name = (data.displayName || id).toLowerCase();
                    return data.level > 0 && !blacklist.includes(name);
                })
                .sort((a, b) => {
                    const levelDiff = (b[1].level || 0) - (a[1].level || 0);
                    if (levelDiff !== 0) return levelDiff;
                    return (b[1].xp || 0) - (a[1].xp || 0);
                });

            this.userRankings.clear();
            sorted.forEach(([id, _data], index) => {
                this.userRankings.set(id.toLowerCase(), index + 1);
            });

            this.isLoaded = true;
        } catch (error) {
            console.error('❌ Error al calcular rankings:', error);
        }
    }

    /**
     * Obtiene el rango de un usuario (1-100 o null)
     */
    getUserRank(userId, username) {
        if (!username) return null;
        const lowerName = username.toLowerCase();

        // 1. Intentar desde LeaderboardService si existe (El más fiable)
        if (this.leaderboardService) {
            return this.leaderboardService.getUserRank(lowerName);
        }

        // 2. Fallback a tabla local mapeada
        return this.userRankings.get(lowerName) || null;
    }

    /**
     * Determina el rol completo y título de un usuario, fusionando Ranking y Nivel
     * Incluye: role, badge, clases CSS, título Cyberpunk final
     * 
     * @param {string} username - Nombre del usuario
     * @param {Object} [userData] - Datos de usuario (opcional, para nivel)
     * @param {Object} [levelCalculator] - Instancia de LevelCalculator (opcional)
     * @returns {Object} Objeto con información del rol
     */
    getUserRole(userId, username, userData = null, levelCalculator = null) {
        const lowerUser = username ? username.toLowerCase() : '';
        const id = lowerUser; // En esta versión, ID == Nombre Minúsculo

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
            rankTitle: { title: 'CITIZEN OF NIGHT CITY', icon: 'icon-tech' } // Default fallback
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

        // Lógica de Fusión con Nivel (Si no es Top 15/Admin)
        // Permite que usuarios normales o rankeados bajos muestren su título de RPG
        const isHighRank = rank && rank <= 15;
        if (!isHighRank && userData && userData.level && levelCalculator) {
            const levelTitle = levelCalculator.getLevelTitle(userData.level);
            // Sobreescribimos el título genérico con el de nivel, manteniendo el icono si es apropiado
            result.rankTitle = { 
                title: levelTitle, 
                icon: result.rankTitle.icon // Mantenemos icono de rank si tiene, o default
            };
        }

        return result;
    }

    /**
     * @deprecated Usado internamente por getUserRole ahora
     */
    getCyberpunkRankTitle(role, rank) {
        return this.getUserRole('unknown', 'unknown').rankTitle; 
    }

    /**
     * Obtiene el total de usuarios rankeados
     * @returns {number}
     */
    getTotalRankedUsers() {
        return this.userRankings.size;
    }
}
