/**
 * LevelCalculator - Gestión matemática de niveles y progresos
 * 
 * Responsabilidades:
 * - Calcular niveles basados en XP
 * - Calcular XP necesaria para cada nivel
 * - Gestionar títulos y rangos del sistema
 * - Calcular porcentajes de progreso UI
 */
export default class LevelCalculator {
    constructor() {
        this.levelConfig = this.initDefaultConfig();
    }

    /**
     * Configuración inicial por defecto
     * @returns {Object}
     */
    initDefaultConfig() {
        return {
            // Fórmula: XP_requerido = baseXP * (level-1 ^ exponent)
            baseXP: 100,
            exponent: 1.5,

            // Títulos por nivel exacto o rango inicial
            titles: {
                1: 'CIVILIAN',
                5: 'ROOKIE',
                10: 'MERCENARY',
                15: 'SOLO',
                20: 'NETRUNNER',
                30: 'FIXER',
                40: 'CORPO',
                50: 'NIGHT CITY LEGEND',
                60: 'CYBERPSYCHO',
                70: 'MAXTAC',
                80: 'TRAUMA TEAM',
                90: 'AFTERLIFE LEGEND',
                100: 'CHOOMBA SUPREME'
            },

            // Título por defecto para niveles sin título específico
            defaultTitle: 'EDGE RUNNER LVL {level}'
        };
    }

    /**
     * Calcula el nivel basado en XP total
     * @param {number} xp - XP total del usuario
     * @returns {number} Nivel calculado
     */
    calculateLevel(xp) {
        if (xp < 0) return 1;

        const { baseXP, exponent } = this.levelConfig;
        const limitLevel = 105;
        const xpAtLimit = Math.floor(baseXP * Math.pow(limitLevel - 1, exponent));

        // Si la XP es menor a la del límite, usamos fórmula estándar
        if (xp <= xpAtLimit) {
            return Math.floor(Math.pow(xp / baseXP, 1 / exponent)) + 1;
        }

        // Si es mayor, usar lógica inversa del escalado x5
        // Fórmula aplicada: XP = XP_105 + (XP_Standard - XP_105) * 5
        // (XP - XP_105) / 5 = XP_Standard - XP_105
        // XP_Standard = ((XP - XP_105) / 5) + XP_105
        
        const xpDiffScaled = (xp - xpAtLimit) / 5;
        const standardXPEquivalent = xpAtLimit + xpDiffScaled;
        
        return Math.floor(Math.pow(standardXPEquivalent / baseXP, 1 / exponent)) + 1;
    }

    /**
     * Calcula la XP requerida para alcanzar un nivel específico
     * @param {number} level - Nivel objetivo
     * @returns {number} XP requerida
     */
    getXPForLevel(level) {
        if (level <= 1) return 0;
        const { baseXP, exponent } = this.levelConfig;
        
        // Logica estándar para niveles hasta 104
        if (level <= 105) {
            return Math.floor(baseXP * Math.pow(level - 1, exponent));
        }

        // Para nivel 105 en adelante (empezando el cálculo desde nivel 105 hacia arriba)
        // Calculamos la XP base hasta nivel 105
        const xpAt105 = Math.floor(baseXP * Math.pow(104, exponent)); // XP necesaria para alcanzar lvl 105
        
        // Calculamos la diferencia estándar entre niveles a esta altura
        // Y la multiplicamos por 5 para cada nivel adicional
        // Aproximación simple: Seguir curva pero multiplicada
        // XP = XP_105 + (XP_Standard_Current - XP_Standard_105) * 5
        
        const standardXP = Math.floor(baseXP * Math.pow(level - 1, exponent));
        const diff = standardXP - xpAt105;
        
        return xpAt105 + (diff * 5);
    }

    /**
     * Calcula el progreso porcentual hacia el siguiente nivel
     * @param {number} xp - XP actual
     * @param {number} level - Nivel actual
     * @returns {number} Porcentaje 0-100
     */
    getLevelProgress(xp, level) {
        const currentLevelXP = this.getXPForLevel(level);
        const nextLevelXP = this.getXPForLevel(level + 1);

        const needed = nextLevelXP - currentLevelXP;
        // Evitar división por cero
        if (needed === 0) {
            return {
                percentage: 100,
                xpInCurrentLevel: 0,
                xpNeededForNext: 0
            };
        }

        const current = xp - currentLevelXP;
        let percentage = (current / needed) * 100;
        
        // Clamp percentage
        percentage = Math.min(100, Math.max(0, percentage));

        return {
            percentage: percentage,
            xpInCurrentLevel: Math.floor(current),
            xpNeededForNext: Math.floor(needed)
        };
    }

    /**
     * Obtiene el título correspondiente a un nivel
     * @param {number} level 
     * @returns {string}
     */
    getLevelTitle(level) {
        const titles = this.levelConfig.titles;
        const levels = Object.keys(titles).map(Number).sort((a, b) => b - a);

        for (const lvl of levels) {
            if (level >= lvl) {
                return titles[lvl];
            }
        }

        return this.levelConfig.defaultTitle.replace('{level}', level);
    }
}
