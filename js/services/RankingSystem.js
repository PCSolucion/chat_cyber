/**
 * RankingSystem - Sistema de Gestión de Rankings y Roles
 * 
 * Responsabilidades:
 * - Cargar rankings desde fuente externa
 * - Determinar roles de usuarios (Admin, Top, VIP, etc.)
 * - Asignar títulos Cyberpunk según ranking
 * - Gestionar iconos de rango
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
    }

    /**
     * Carga los rankings desde una URL externa
     * Formato esperado: "RANK\tUSERNAME" por línea
     * 
     * @returns {Promise<void>}
     */
    async loadRankings() {
        try {
            const response = await fetch(this.config.TOP_DATA_URL);

            if (!response.ok) {
                console.warn(`⚠️ No se pudo cargar rankings desde ${this.config.TOP_DATA_URL}`);
                return;
            }

            const text = await response.text();
            const lines = text.trim().split('\n');

            // Parsear cada línea
            lines.forEach(line => {
                const parts = line.trim().split('\t');
                if (parts.length >= 2) {
                    const rank = parseInt(parts[0]);
                    const username = parts[1].toLowerCase();

                    if (!isNaN(rank) && username) {
                        this.userRankings.set(username, rank);
                    }
                }
            });

            this.isLoaded = true;
            console.log(`✅ Rankings cargados: ${this.userRankings.size} usuarios`);

        } catch (error) {
            console.error('❌ Error al cargar rankings:', error);
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
     * Determina el rol completo de un usuario
     * Incluye: role, badge, clases CSS, título Cyberpunk
     * 
     * @param {string} username - Nombre del usuario
     * @returns {Object} Objeto con información del rol
     */
    getUserRole(username) {
        const lowerUser = username.toLowerCase();

        // ADMIN
        if (lowerUser === this.adminUser) {
            return {
                role: 'admin',
                badge: 'ADMIN',
                containerClass: 'admin-user',
                badgeClass: 'admin',
                rankTitle: this.getCyberpunkRankTitle('admin', 0)
            };
        }

        // SYSTEM BOT
        if (lowerUser === 'system') {
            return {
                role: 'admin', // Usamos rol admin para estilos
                badge: 'ROOT',
                containerClass: 'admin-user',
                badgeClass: 'admin',
                rankTitle: { title: 'AI CONSTRUCT', icon: 'icon-netwatch' }
            };
        }

        // Usuarios con ranking
        const rank = this.userRankings.get(lowerUser);
        if (rank) {
            // TOP 1 - Estilo especial
            if (rank === 1) {
                return {
                    role: 'top',
                    badge: 'TOP 1',
                    containerClass: 'top-user',
                    badgeClass: 'top-user',
                    rankTitle: this.getCyberpunkRankTitle('top', 1)
                };
            }

            // TOP 2-15 - VIP Style
            if (rank <= 15) {
                return {
                    role: 'vip',
                    badge: `TOP ${rank}`,
                    containerClass: 'vip-user',
                    badgeClass: 'vip',
                    rankTitle: this.getCyberpunkRankTitle('vip', rank)
                };
            }

            // TOP 16+ - Ranked
            return {
                role: 'ranked',
                badge: `TOP ${rank}`,
                containerClass: 'ranked-user',
                badgeClass: 'ranked',
                rankTitle: this.getCyberpunkRankTitle('ranked', rank)
            };
        }

        // Sin ranking
        return {
            role: 'normal',
            badge: '',
            containerClass: '',
            badgeClass: '',
            rankTitle: this.getCyberpunkRankTitle('normal', 0)
        };
    }

    /**
     * Asigna un título Cyberpunk basado en el rol y ranking
     * 
     * @param {string} role - Rol del usuario (admin, top, vip, ranked, normal)
     * @param {number} rank - Ranking numérico
     * @returns {Object} Objeto con título e icono
     */
    getCyberpunkRankTitle(role, rank) {
        // ADMIN
        if (role === 'admin') {
            return { title: 'SYSTEM OVERLORD', icon: 'icon-arasaka' };
        }

        // Default para todos los demás (será sobreescrito por Nivel de XP si está activo)
        return { title: 'CITIZEN OF NIGHT CITY', icon: 'icon-tech' };
    }

    /**
     * Obtiene el total de usuarios rankeados
     * @returns {number}
     */
    getTotalRankedUsers() {
        return this.userRankings.size;
    }
}
