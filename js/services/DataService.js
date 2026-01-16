/**
 * DataService - Servicio de Gestión de Datos
 * 
 * Responsabilidades:
 * - Gestionar datos de equipos de F1
 * - Asignar números de piloto a usuarios
 * - Asignar equipos a usuarios
 * - Proporcionar datos aleatorios cuando no hay asignación
 * 
 * @class DataService
 */
class DataService {
    /**
     * Constructor del servicio de datos
     * @param {Object} config - Configuración global de la aplicación
     * @param {Object} teamsData - Datos de equipos de F1
     * @param {Object} userNumbersData - Mapa de usuarios a números
     * @param {Object} userTeamsData - Mapa de usuarios a equipos
     */
    constructor(config, teamsData, userNumbersData, userTeamsData) {
        this.config = config;
        this.teams = teamsData;
        this.userNumbers = userNumbersData;
        this.userTeams = userTeamsData;
    }

    /**
     * Obtiene el número de piloto para un usuario específico
     * 
     * Prioridad:
     * 1. Usuario especial (configurado en config.SPECIAL_USER)
     * 2. Usuario con número asignado (en userNumbers)
     * 3. Número aleatorio
     * 
     * @param {string} username - Nombre del usuario de Twitch
     * @returns {number} Número de piloto asignado
     */
    getUserNumber(username) {
        const lowerUser = username.toLowerCase();

        // Verificar si es el usuario especial (ej: Admin)
        if (lowerUser === this.config.SPECIAL_USER.username) {
            return this.config.SPECIAL_USER.number;
        }

        // Verificar si tiene número asignado
        if (this.userNumbers[lowerUser]) {
            return this.userNumbers[lowerUser];
        }

        // Generar número aleatorio
        return Math.floor(
            Math.random() * (this.config.MAX_RANDOM_NUMBER - this.config.MIN_RANDOM_NUMBER + 1)
        ) + this.config.MIN_RANDOM_NUMBER;
    }

    /**
     * Obtiene el equipo de F1 para un usuario específico
     * 
     * Prioridad:
     * 1. Usuario especial (configurado en config.SPECIAL_USER)
     * 2. Usuario con equipo asignado (en userTeams)
     * 3. Equipo aleatorio
     * 
     * @param {string} username - Nombre del usuario de Twitch
     * @returns {Object} Objeto con color, logo y width del equipo
     */
    getUserTeam(username) {
        const lowerUser = username.toLowerCase();

        // Verificar si es el usuario especial (ej: Admin)
        if (lowerUser === this.config.SPECIAL_USER.username) {
            return this.teams[this.config.SPECIAL_USER.team];
        }

        // Verificar si tiene equipo asignado
        const teamKey = this.userTeams[lowerUser];
        if (teamKey && this.teams[teamKey]) {
            return this.teams[teamKey];
        }

        // Retornar equipo aleatorio
        return this.getRandomTeam();
    }

    /**
     * Obtiene un equipo aleatorio de la lista de equipos disponibles
     * 
     * @returns {Object} Objeto con color, logo y width del equipo
     */
    getRandomTeam() {
        const teamKeys = Object.keys(this.teams);
        const randomKey = teamKeys[Math.floor(Math.random() * teamKeys.length)];
        return this.teams[randomKey];
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataService;
}
