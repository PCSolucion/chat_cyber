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

            // Títulos por nivel exacto o rango inicial (F1)
            titles: {
                1: 'PADDOCK GUEST',
                3: 'KARTING PRODIGY',
                6: 'SIMULATION DRIVER',
                10: 'YOUTH ACADEMY STAR',
                16: 'FORMULA 3 RACER',
                22: 'FORMULA 2 CONTENDER',
                28: 'TEST DRIVER',
                35: 'RESERVE DRIVER',
                45: 'F1 GRID ROOKIE',
                60: 'MIDFIELD STAR',
                80: 'PODIUM REGULAR',
                100: 'GRAND PRIX WINNER',
                130: 'MULTIPLE CHAMPION',
                170: 'TRACK LEGEND',
                220: 'F1 ALL-TIME GOAT'
            },

            // Títulos por nivel exacto o rango inicial (CYBERPUNK)
            cyberTitles: {
                1: 'STREET KID',
                3: 'ROOKIE RUNNER',
                6: 'NETRUNNER',
                10: 'SOLO',
                16: 'FIXER',
                22: 'TECHIE',
                28: 'NOMAD',
                35: 'MERCENARY',
                45: 'NIGHT CITY LEGEND',
                60: 'AFTERLIFE REGULAR',
                80: 'MAJOR LEAGUE',
                100: 'CHROME MASTER',
                130: 'CYBERPSYCHO',
                170: 'FULL BORG',
                220: 'ADAM SMASHER RIVAL'
            },

            // Título por defecto para niveles sin título específico
            defaultTitle: 'EDGE RUNNER LVL {level}',

            // Tiers de escalado de XP (Multiplicadores por rango de nivel)
            tiers: [
                { level: 105, multiplier: 5 },
                { level: 150, multiplier: 6 },
                { level: 200, multiplier: 7 },
                { level: 250, multiplier: 8 },
                { level: 300, multiplier: 9 },
                { level: 350, multiplier: 10 },
                { level: 400, multiplier: 11 },
                { level: 450, multiplier: 12 }
            ]
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
        
        // Puntos de ruptura y multiplicadores definidos por el usuario
        const tiers = this.levelConfig.tiers;

        // 1. Calcular XP necesaria para llegar al primer tier (105)
        // La fórmula estándar se usa hasta el nivel 104
        // XP_105 = baseXP * (104 ^ exponent)
        const xpAt105 = Math.floor(baseXP * Math.pow(104, exponent)); 

        // Si la XP es menor a lo necesario para 105, usar fórmula estándar
        if (xp <= xpAt105) {
            return Math.floor(Math.pow(xp / baseXP, 1 / exponent)) + 1;
        }

        // 2. Iterar por los tiers para encontrar en cuál cae la XP actual
        let currentXP = xpAt105;
        let prevLevel = 105;

        for (let i = 0; i < tiers.length; i++) {
            const currentTier = tiers[i];
            const nextTier = tiers[i + 1]; // Puede ser undefined si es el último
            const multiplier = currentTier.multiplier;
            
            // Determinar hasta qué nivel aplica este tier
            const endLevel = nextTier ? nextTier.level : 999999; // 999999 como "infinito"
            
            // Calculamos XP necesaria para completar este segmento
            // XP_needed = Suma( XP_standard_diff * multiplier ) desde prevLevel hasta endLevel
            // Pero como la fórmula es exponencial, no es lineal.
            // Aproximación usada previamente:
            // XP_Total = XP_Start + (XP_Standard_End - XP_Standard_Start) * Multiplier
            
            const standardXP_Start = Math.floor(baseXP * Math.pow(prevLevel - 1, exponent));
            const standardXP_End = Math.floor(baseXP * Math.pow(endLevel - 1, exponent));
            const segmentStandardDiff = standardXP_End - standardXP_Start;
            const segmentScaledXP = segmentStandardDiff * multiplier;
            
            // Límmite de XP acumulada al final de este tier
            const tierEndXP = currentXP + segmentScaledXP;

            // Si la XP del usuario cae en este rango
            if (xp <= tierEndXP) {
                // Cálculo inverso dentro del segmento:
                // XP_User = currentXP + (XP_Std_Current - XP_Std_Start) * Multiplier
                // (XP_User - currentXP) / Multiplier = XP_Std_Current - XP_Std_Start
                // XP_Std_Current = ((XP_User - currentXP) / Multiplier) + XP_Std_Start
                
                const xpInSegment = xp - currentXP;
                const standardEquivalentDiff = xpInSegment / multiplier;
                const standardEquivalentXP = standardXP_Start + standardEquivalentDiff;
                
                return Math.floor(Math.pow(standardEquivalentXP / baseXP, 1 / exponent)) + 1;
            }

            // Si pasamos al siguiente tier, actualizamos acumuladores
            currentXP = tierEndXP;
            prevLevel = endLevel;
        }

        // Fallback por si excede todo (aunque con 999999 es difícil)
        return prevLevel; 
    }

    /**
     * Calcula la XP requerida para alcanzar un nivel específico
     * @param {number} level - Nivel objetivo
     * @returns {number} XP requerida
     */
    getXPForLevel(level) {
        if (level <= 1) return 0;
        const { baseXP, exponent } = this.levelConfig;
        
        // Logica estándar inicial
        if (level <= 105) {
            return Math.floor(baseXP * Math.pow(level - 1, exponent));
        }

        const tiers = this.levelConfig.tiers;

        let accumulatedXP = Math.floor(baseXP * Math.pow(104, exponent)); // XP base al llegar a 105
        let currentDiffLevel = 105;

        for (const tier of tiers) {
             const nextTierLevel = tiers[tiers.indexOf(tier) + 1]?.level || 999999;
             
             // Si el nivel objetivo está dentro de este tier o es el tope de este tier
             if (level <= nextTierLevel) {
                 // Calcular diferencia standard desde el inicio del tier hasta el nivel objetivo
                 const standardStart = Math.floor(baseXP * Math.pow(currentDiffLevel - 1, exponent));
                 const standardTarget = Math.floor(baseXP * Math.pow(level - 1, exponent));
                 const diff = standardTarget - standardStart;
                 
                 return accumulatedXP + (diff * tier.multiplier);
             } else {
                 // Sumar todo el tier completo y pasar al siguiente
                 const standardStart = Math.floor(baseXP * Math.pow(currentDiffLevel - 1, exponent));
                 const standardEnd = Math.floor(baseXP * Math.pow(nextTierLevel - 1, exponent));
                 const diff = standardEnd - standardStart;
                 
                 accumulatedXP += (diff * tier.multiplier);
                 currentDiffLevel = nextTierLevel;
             }
        }
        
        return accumulatedXP;
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
     * @param {boolean} isF1 - Si el tema activo es F1
     * @returns {string}
     */
    getLevelTitle(level, isF1 = true) {
        const titles = isF1 ? this.levelConfig.titles : this.levelConfig.cyberTitles;
        const levels = Object.keys(titles).map(Number).sort((a, b) => b - a);

        for (const lvl of levels) {
            if (level >= lvl) {
                return titles[lvl];
            }
        }

        const defaultTitle = isF1 ? 'RACING TALENT LVL {level}' : 'EDGE RUNNER LVL {level}';
        return defaultTitle.replace('{level}', level);
    }
}
