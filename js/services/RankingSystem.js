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
    }

    /**
     * Inyecta la referencia al UserStateManager
     * @param {UserStateManager} stateManager
     */
    setStateManager(stateManager) {
        this.stateManager = stateManager;
    }

    /**
     * Calcula los rankings dinámicamente desde los datos de Firestore.
     * Ordena usuarios por nivel (desc), usando XP total como desempate.
     * 
     * @returns {Promise<void>}
     */
    async loadRankings() {
        try {
            if (!this.stateManager) {
                console.warn('⚠️ RankingSystem: No stateManager inyectado, rankings no disponibles');
                return;
            }

            const allUsers = this.stateManager.getAllUsers();
            if (!allUsers || allUsers.size === 0) {
                console.warn('⚠️ RankingSystem: No hay datos de usuarios cargados aún');
                return;
            }

            // Convertir a array y ordenar por nivel (desc), luego XP (desc) como desempate
            const sorted = Array.from(allUsers.entries())
                .filter(([username, data]) => {
                    // Filtrar bots y usuarios sin nivel
                    const blacklist = this.config.BLACKLISTED_USERS || [];
                    return data.level > 0 && !blacklist.includes(username.toLowerCase());
                })
                .sort((a, b) => {
                    const levelDiff = (b[1].level || 0) - (a[1].level || 0);
                    if (levelDiff !== 0) return levelDiff;
                    return (b[1].xp || 0) - (a[1].xp || 0);
                });

            // Construir mapa de rankings
            this.userRankings.clear();
            sorted.forEach(([username, _data], index) => {
                this.userRankings.set(username.toLowerCase(), index + 1);
            });

            this.isLoaded = true;
            console.log(`✅ Rankings calculados desde Firestore: ${this.userRankings.size} usuarios`);

        } catch (error) {
            console.error('❌ Error al calcular rankings:', error);
        }
    }

    /**
     * Obtiene el ranking de un usuario
     * @param {string} username - Nombre del usuario
     * @returns {number|null} Ranking del usuario o null si no tiene
     */
    getUserRank(username) {
        return this.userRankings.get(username.toLowerCase()) || null;
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
    getUserRole(username, userData = null, levelCalculator = null) {
        const lowerUser = username.toLowerCase();

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

        const rank = this.userRankings.get(lowerUser);
        
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
        return this.getUserRole('unknown').rankTitle; 
    }

    /**
     * Obtiene el total de usuarios rankeados
     * @returns {number}
     */
    getTotalRankedUsers() {
        return this.userRankings.size;
    }
}
