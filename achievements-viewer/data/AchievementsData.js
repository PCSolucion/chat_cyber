/**
 * AchievementsData - Datos de logros cargados como módulo JavaScript
 * 
 * Este archivo contiene las definiciones de todos los logros del sistema.
 * Se usa como módulo JS en lugar de JSON para evitar problemas de CORS
 * cuando se ejecuta desde file:// protocol.
 * 
 * Para añadir un nuevo logro, simplemente agregue una nueva entrada al objeto
 * ACHIEVEMENTS_DATA.achievements con la siguiente estructura:
 * 
 * @example
 * "achievement_id": {
 *     name: "Nombre del Logro",
 *     description: "Descripción del logro",
 *     condition: "Texto que explica cómo obtenerlo",
 *     category: "messages|streaks|levels|xp|ranking|stream|holidays|special|bro",
 *     rarity: "common|uncommon|rare|epic|legendary",
 *     icon: "🎮",
 *     image: "img/logros/achievement_name.png", // [NUEVO] Ruta a la imagen (opcional)
 *     rule: { field: "userData.totalMessages", operator: ">=", value: 100 }
 * }
 * 
 * Operadores soportados: >=, <=, >, <, ==, !=, includes (para arrays)
 * Fields soportados: userData.*, stats.*
 */

const ACHIEVEMENTS_DATA = {
    _metadata: {
        version: "1.1",
        totalAchievements: 143, // +3 logros de streams TW3
        categories: ["messages", "streaks", "levels", "xp", "ranking", "stream", "holidays", "special", "bro", "cyberpunk2077", "witcher3"],
        rarities: ["common", "uncommon", "rare", "epic", "legendary"],
        lastUpdated: "2026-01-28"
    },

    achievements: {
        // ==================== MENSAJES ====================
        first_words: {
            name: "First Words",
            description: "Tus primeros mensajes en el chat",
            condition: "10 mensajes enviados",
            category: "messages",
            rarity: "common",
            icon: "💬",
            image: "img/logros/default.png", // Imagen corregida
            rule: { field: "userData.totalMessages", operator: ">=", value: 10 }
        },
        chatterbox: {
            name: "Chatterbox",
            description: "No puedes parar de escribir",
            condition: "50 mensajes",
            category: "messages",
            rarity: "common",
            icon: "🗣️",
            image: "img/logros/chatterbox.png",
            rule: { field: "userData.totalMessages", operator: ">=", value: 50 }
        },
        talkative: {
            name: "Talkative",
            description: "Comunicación constante",
            condition: "100 mensajes",
            category: "messages",
            rarity: "common",
            icon: "📢",
            image: "img/logros/talkative.png",
            rule: { field: "userData.totalMessages", operator: ">=", value: 100 }
        },
        motormouth: {
            name: "Motormouth",
            description: "Hablas más que un fixer",
            condition: "250 mensajes",
            category: "messages",
            rarity: "uncommon",
            icon: "🎙️",
            image: "img/logros/motormouth.png",
            rule: { field: "userData.totalMessages", operator: ">=", value: 250 }
        },
        choom_speaker: {
            name: "Choom Speaker",
            description: "Maestro de la conversación",
            condition: "500 mensajes",
            category: "messages",
            rarity: "uncommon",
            icon: "🔊",
            image: "img/logros/choom speaker.png",
            rule: { field: "userData.totalMessages", operator: ">=", value: 500 }
        },
        voice_of_night_city: {
            name: "Voice of Night City",
            description: "Tu voz resuena en las calles",
            condition: "1,000 mensajes",
            category: "messages",
            rarity: "rare",
            icon: "🌃",
            image: "img/logros/voice of night city.png",
            rule: { field: "userData.totalMessages", operator: ">=", value: 1000 }
        },
        legendary_talker: {
            name: "Legendary Talker",
            description: "Leyenda del chat",
            condition: "2,500 mensajes",
            category: "messages",
            rarity: "rare",
            icon: "⭐",
            rule: { field: "userData.totalMessages", operator: ">=", value: 2500 }
        },
        chrome_tongue: {
            name: "Chrome Tongue",
            description: "Lengua mejorada cyberware",
            condition: "5,000 mensajes",
            category: "messages",
            rarity: "epic",
            icon: "🦾",
            rule: { field: "userData.totalMessages", operator: ">=", value: 5000 }
        },
        infinite_broadcast: {
            name: "Infinite Broadcast",
            description: "Emisión sin fin",
            condition: "10,000 mensajes",
            category: "messages",
            rarity: "epic",
            icon: "📡",
            rule: { field: "userData.totalMessages", operator: ">=", value: 10000 }
        },
        netrunner_comms: {
            name: "Netrunner Comms",
            description: "Comunicaciones de élite",
            condition: "25,000 mensajes",
            category: "messages",
            rarity: "legendary",
            icon: "🧠",
            rule: { field: "userData.totalMessages", operator: ">=", value: 25000 }
        },

        // Logros de primer mensaje del día
        early_bird: {
            name: "Early Bird",
            description: "Madrugador del chat",
            condition: "3 primeros mensajes del día",
            category: "messages",
            rarity: "common",
            icon: "🐦",
            image: "img/logros/Early Bird.png",
            rule: { field: "stats.firstMessageDays", operator: ">=", value: 3 }
        },
        morning_regular: {
            name: "Morning Regular",
            description: "Madrugador habitual",
            condition: "10 primeros mensajes",
            category: "messages",
            rarity: "uncommon",
            icon: "🌅",
            image: "img/logros/morning regular.png",
            rule: { field: "stats.firstMessageDays", operator: ">=", value: 10 }
        },
        dawn_patrol: {
            name: "Dawn Patrol",
            description: "Patrulla del amanecer",
            condition: "30 primeros mensajes",
            category: "messages",
            rarity: "rare",
            icon: "🌄",
            image: "img/logros/dawn patrol.png",
            rule: { field: "stats.firstMessageDays", operator: ">=", value: 30 }
        },

        // Logros de emotes
        emote_user: {
            name: "Emote User",
            description: "Fan de los emotes",
            condition: "25 mensajes con emotes",
            category: "messages",
            rarity: "common",
            icon: "😀",
            image: "img/logros/emote user.png",
            rule: { field: "stats.messagesWithEmotes", operator: ">=", value: 25 }
        },
        emote_spammer: {
            name: "Emote Spammer",
            description: "Fan de los emotes",
            condition: "100 mensajes con emotes",
            category: "messages",
            rarity: "uncommon",
            icon: "🎭",
            rule: { field: "stats.messagesWithEmotes", operator: ">=", value: 100 }
        },
        emote_master: {
            name: "Emote Master",
            description: "Maestro del emote",
            condition: "500 mensajes con emotes",
            category: "messages",
            rarity: "rare",
            icon: "👑",
            rule: { field: "stats.messagesWithEmotes", operator: ">=", value: 500 }
        },

        // Logros de menciones
        mention_someone: {
            name: "Mention Someone",
            description: "Mencionas a otros usuarios",
            condition: "10 menciones",
            category: "messages",
            rarity: "common",
            icon: "👋",
            image: "img/logros/Mention Someone.png",
            rule: { field: "stats.mentionCount", operator: ">=", value: 10 }
        },
        social_butterfly: {
            name: "Social Butterfly",
            description: "Muy sociable",
            condition: "50 menciones",
            category: "messages",
            rarity: "uncommon",
            icon: "🦋",
            image: "img/logros/social butterfly.png",
            rule: { field: "stats.mentionCount", operator: ">=", value: 50 }
        },
        connector: {
            name: "Connector",
            description: "Conectas a la gente",
            condition: "200 menciones",
            category: "messages",
            rarity: "rare",
            icon: "🔗",
            rule: { field: "stats.mentionCount", operator: ">=", value: 200 }
        },

        // Logro nocturno
        night_owl: {
            name: "Night Owl",
            description: "Activo después de medianoche",
            condition: "5 mensajes después de 00:00",
            category: "messages",
            rarity: "uncommon",
            icon: "🦉",
            image: "img/logros/Night Owl.png",
            rule: { field: "stats.nightMessages", operator: ">=", value: 5 }
        },

        // ==================== RACHAS ====================
        streak_starter: {
            name: "Streak Starter",
            description: "Iniciaste una racha",
            condition: "2 días consecutivos",
            category: "streaks",
            rarity: "common",
            icon: "🔥",
            image: "img/logros/streakstarted.png",
            rule: { field: "userData.streakDays", operator: ">=", value: 2 }
        },
        consistency: {
            name: "Consistency",
            description: "La constancia es clave",
            condition: "3 días consecutivos",
            category: "streaks",
            rarity: "common",
            icon: "📆",
            image: "img/logros/consistency.png",
            rule: { field: "userData.streakDays", operator: ">=", value: 3 }
        },
        dedicated: {
            name: "Dedicated",
            description: "Dedicación al chat",
            condition: "5 días consecutivos",
            category: "streaks",
            rarity: "uncommon",
            icon: "💪",
            image: "img/logros/dedicated.png",
            rule: { field: "userData.streakDays", operator: ">=", value: 5 }
        },
        week_warrior: {
            name: "Week Warrior",
            description: "Una semana sin faltar",
            condition: "7 días consecutivos",
            category: "streaks",
            rarity: "uncommon",
            icon: "🗓️",
            image: "img/logros/week warrior.png",
            rule: { field: "userData.streakDays", operator: ">=", value: 7 }
        },
        fortnight_fighter: {
            name: "Fortnight Fighter",
            description: "Dos semanas seguidas",
            condition: "14 días consecutivos",
            category: "streaks",
            rarity: "rare",
            icon: "⚔️",
            image: "img/logros/fortnight Fighter.png",
            rule: { field: "userData.streakDays", operator: ">=", value: 14 }
        },
        monthly_devotion: {
            name: "Monthly Devotion",
            description: "Un mes entero",
            condition: "30 días consecutivos",
            category: "streaks",
            rarity: "rare",
            icon: "📅",
            rule: { field: "userData.streakDays", operator: ">=", value: 30 }
        },
        iron_will: {
            name: "Iron Will",
            description: "Voluntad de hierro",
            condition: "50 días consecutivos",
            category: "streaks",
            rarity: "epic",
            icon: "🔩",
            rule: { field: "userData.streakDays", operator: ">=", value: 50 }
        },
        quarter_commitment: {
            name: "Quarter Commitment",
            description: "Compromiso trimestral",
            condition: "90 días consecutivos",
            category: "streaks",
            rarity: "epic",
            icon: "🏅",
            rule: { field: "userData.streakDays", operator: ">=", value: 90 }
        },
        chrome_heart: {
            name: "Chrome Heart",
            description: "Corazón de cromo",
            condition: "100 días consecutivos",
            category: "streaks",
            rarity: "epic",
            icon: "💎",
            rule: { field: "userData.streakDays", operator: ">=", value: 100 }
        },
        half_year_hero: {
            name: "Half Year Hero",
            description: "Medio año sin parar",
            condition: "180 días consecutivos",
            category: "streaks",
            rarity: "legendary",
            icon: "🦸",
            rule: { field: "userData.streakDays", operator: ">=", value: 180 }
        },
        immortal_presence: {
            name: "Immortal Presence",
            description: "Presencia inmortal",
            condition: "200 días consecutivos",
            category: "streaks",
            rarity: "legendary",
            icon: "👁️",
            rule: { field: "userData.streakDays", operator: ">=", value: 200 }
        },
        annual_legend: {
            name: "Annual Legend",
            description: "Leyenda anual",
            condition: "365 días consecutivos",
            category: "streaks",
            rarity: "legendary",
            icon: "🏆",
            rule: { field: "userData.streakDays", operator: ">=", value: 365 }
        },
        streak_recovery: {
            name: "Streak Recovery",
            description: "Volviste después de perder racha",
            condition: "Reiniciar racha 5 veces",
            category: "streaks",
            rarity: "uncommon",
            icon: "🔄",
            rule: { field: "stats.streakResets", operator: ">=", value: 5 }
        },
        never_give_up: {
            name: "Never Give Up",
            description: "Nunca te rindes",
            condition: "Reiniciar racha 10 veces",
            category: "streaks",
            rarity: "rare",
            icon: "💥",
            rule: { field: "stats.streakResets", operator: ">=", value: 10 }
        },
        phoenix: {
            name: "Phoenix",
            description: "Renaces de las cenizas",
            condition: "Alcanzar 7d después de perder 14+",
            category: "streaks",
            rarity: "epic",
            icon: "🔥",
            rule: { field: "stats.phoenixAchieved", operator: "==", value: true }
        },

        // ==================== NIVELES ====================
        level_up_first: {
            name: "First Level Up",
            description: "Tu primer level up",
            condition: "Alcanzar nivel 2",
            category: "levels",
            rarity: "common",
            icon: "⬆️",
            image: "img/logros/First Level Up.png",
            rule: { field: "userData.level", operator: ">=", value: 2 }
        },
        street_kid: {
            name: "Street Kid",
            description: "Ya no eres un novato",
            condition: "Alcanzar nivel 5",
            category: "levels",
            rarity: "common",
            icon: "🛹",
            image: "img/logros/Street Kid.png",
            rule: { field: "userData.level", operator: ">=", value: 5 }
        },
        mercenary_rank: {
            name: "Mercenary Rank",
            description: "Rango de mercenario",
            condition: "Alcanzar nivel 10",
            category: "levels",
            rarity: "uncommon",
            icon: "🎖️",
            image: "img/logros/Mercenary Rank.png",
            rule: { field: "userData.level", operator: ">=", value: 10 }
        },
        solo_status: {
            name: "Solo Status",
            description: "Status de Solo",
            condition: "Alcanzar nivel 15",
            category: "levels",
            rarity: "uncommon",
            icon: "🔫",
            image: "img/logros/Solo Status.png",
            rule: { field: "userData.level", operator: ">=", value: 15 }
        },
        netrunner_tier: {
            name: "Netrunner Tier",
            description: "Tier de Netrunner",
            condition: "Alcanzar nivel 20",
            category: "levels",
            rarity: "rare",
            icon: "💻",
            image: "img/logros/netrunner tier.png",
            rule: { field: "userData.level", operator: ">=", value: 20 }
        },
        level_milestone_25: {
            name: "Quarter Century",
            description: "25 niveles alcanzados",
            condition: "Alcanzar nivel 25",
            category: "levels",
            rarity: "rare",
            icon: "🎯",
            image: "img/logros/quarter century.png",
            rule: { field: "userData.level", operator: ">=", value: 25 }
        },
        fixer_class: {
            name: "Fixer Class",
            description: "Clase Fixer",
            condition: "Alcanzar nivel 30",
            category: "levels",
            rarity: "rare",
            icon: "🤝",
            image: "img/logros/fixer class.png",
            rule: { field: "userData.level", operator: ">=", value: 30 }
        },
        corpo_elite: {
            name: "Corpo Elite",
            description: "Elite Corpo",
            condition: "Alcanzar nivel 40",
            category: "levels",
            rarity: "epic",
            icon: "🏢",
            image: "img/logros/corpo elite.png",
            rule: { field: "userData.level", operator: ">=", value: 40 }
        },
        night_city_legend: {
            name: "Night City Legend",
            description: "Leyenda de Night City",
            condition: "Alcanzar nivel 50",
            category: "levels",
            rarity: "epic",
            icon: "🌃",
            rule: { field: "userData.level", operator: ">=", value: 50 }
        },
        cyberpsycho_tier: {
            name: "Cyberpsycho Tier",
            description: "Nivel Cyberpsycho",
            condition: "Alcanzar nivel 60",
            category: "levels",
            rarity: "epic",
            icon: "🤖",
            rule: { field: "userData.level", operator: ">=", value: 60 }
        },
        maxtac_rank: {
            name: "MaxTac Rank",
            description: "Rango MaxTac",
            condition: "Alcanzar nivel 70",
            category: "levels",
            rarity: "legendary",
            icon: "🚔",
            rule: { field: "userData.level", operator: ">=", value: 70 }
        },
        level_milestone_75: {
            name: "Diamond Tier",
            description: "Tier diamante",
            condition: "Alcanzar nivel 75",
            category: "levels",
            rarity: "legendary",
            icon: "💠",
            rule: { field: "userData.level", operator: ">=", value: 75 }
        },
        trauma_team: {
            name: "Trauma Team",
            description: "Miembro del Trauma Team",
            condition: "Alcanzar nivel 80",
            category: "levels",
            rarity: "legendary",
            icon: "🚑",
            rule: { field: "userData.level", operator: ">=", value: 80 }
        },
        afterlife_legend: {
            name: "Afterlife Legend",
            description: "Leyenda del Afterlife",
            condition: "Alcanzar nivel 90",
            category: "levels",
            rarity: "legendary",
            icon: "☠️",
            rule: { field: "userData.level", operator: ">=", value: 90 }
        },
        choomba_supreme: {
            name: "Choomba Supreme",
            description: "El Choomba Supremo",
            condition: "Alcanzar nivel 100",
            category: "levels",
            rarity: "legendary",
            icon: "👑",
            rule: { field: "userData.level", operator: ">=", value: 100 }
        },
        beyond_legend: {
            name: "Beyond Legend",
            description: "Más allá de la leyenda",
            condition: "Alcanzar nivel 125",
            category: "levels",
            rarity: "legendary",
            icon: "🌟",
            rule: { field: "userData.level", operator: ">=", value: 125 }
        },
        mythic_status: {
            name: "Mythic Status",
            description: "Status mítico",
            condition: "Alcanzar nivel 150",
            category: "levels",
            rarity: "legendary",
            icon: "🔱",
            rule: { field: "userData.level", operator: ">=", value: 150 }
        },
        transcendent: {
            name: "Transcendent",
            description: "Trascendencia digital",
            condition: "Alcanzar nivel 200",
            category: "levels",
            rarity: "legendary",
            icon: "✨",
            rule: { field: "userData.level", operator: ">=", value: 200 }
        },
        fast_learner: {
            name: "Fast Learner",
            description: "Aprendiz rápido",
            condition: "3 level ups en un día",
            category: "levels",
            rarity: "rare",
            icon: "📚",
            rule: { field: "stats.levelUpsToday", operator: ">=", value: 3 }
        },
        grinder: {
            name: "Grinder",
            description: "El que muele XP",
            condition: "5 level ups en una semana",
            category: "levels",
            rarity: "epic",
            icon: "⚙️",
            rule: { field: "stats.levelUpsThisWeek", operator: ">=", value: 5 }
        },

        // ==================== EXPERIENCIA ====================
        first_xp: {
            name: "First XP",
            description: "Empezando a ganar experiencia",
            condition: "Ganar 50 XP",
            category: "xp",
            rarity: "common",
            icon: "✨",
            image: "img/logros/First XP.png",
            rule: { field: "userData.xp", operator: ">=", value: 50 }
        },
        hundred_xp: {
            name: "Hundred XP",
            description: "Centenar de experiencia",
            condition: "Acumular 100 XP",
            category: "xp",
            rarity: "common",
            icon: "💯",
            image: "img/logros/Hundred XP.png",
            rule: { field: "userData.xp", operator: ">=", value: 100 }
        },
        thousand_xp: {
            name: "Thousand XP",
            description: "Mil experiencias",
            condition: "Acumular 1,000 XP",
            category: "xp",
            rarity: "common",
            icon: "🔢",
            image: "img/logros/Thousand XP.png",
            rule: { field: "userData.xp", operator: ">=", value: 1000 }
        },
        xp_collector: {
            name: "XP Collector",
            description: "Coleccionista de XP",
            condition: "Acumular 5,000 XP",
            category: "xp",
            rarity: "uncommon",
            icon: "📦",
            image: "img/logros/XP Collector.png",
            rule: { field: "userData.xp", operator: ">=", value: 5000 }
        },
        xp_hoarder: {
            name: "XP Hoarder",
            description: "Acumulador de XP",
            condition: "Acumular 10,000 XP",
            category: "xp",
            rarity: "uncommon",
            icon: "🏦",
            image: "img/logros/xp hoarder.png",
            rule: { field: "userData.xp", operator: ">=", value: 10000 }
        },
        xp_magnate: {
            name: "XP Magnate",
            description: "Magnate del XP",
            condition: "Acumular 25,000 XP",
            category: "xp",
            rarity: "rare",
            icon: "💰",
            image: "img/logros/xp magnate.png",
            rule: { field: "userData.xp", operator: ">=", value: 25000 }
        },
        xp_tycoon: {
            name: "XP Tycoon",
            description: "Tycoon del XP",
            condition: "Acumular 50,000 XP",
            category: "xp",
            rarity: "rare",
            icon: "🏭",
            rule: { field: "userData.xp", operator: ">=", value: 50000 }
        },
        xp_empire: {
            name: "XP Empire",
            description: "Imperio de XP",
            condition: "Acumular 100,000 XP",
            category: "xp",
            rarity: "epic",
            icon: "🏰",
            rule: { field: "userData.xp", operator: ">=", value: 100000 }
        },
        xp_legend: {
            name: "XP Legend",
            description: "Leyenda del XP",
            condition: "Acumular 250,000 XP",
            category: "xp",
            rarity: "epic",
            icon: "🌠",
            rule: { field: "userData.xp", operator: ">=", value: 250000 }
        },
        xp_god: {
            name: "XP God",
            description: "Dios del XP",
            condition: "Acumular 500,000 XP",
            category: "xp",
            rarity: "legendary",
            icon: "⚡",
            rule: { field: "userData.xp", operator: ">=", value: 500000 }
        },
        million_xp: {
            name: "Millionaire",
            description: "Millonario en XP",
            condition: "Acumular 1,000,000 XP",
            category: "xp",
            rarity: "legendary",
            icon: "💎",
            rule: { field: "userData.xp", operator: ">=", value: 1000000 }
        },
        multiplier_bonus: {
            name: "Multiplier Active",
            description: "Multiplicador activo",
            condition: "Ganar XP con x1.5+",
            category: "xp",
            rarity: "uncommon",
            icon: "✖️",
            image: "img/logros/multiplier active.png",
            rule: { field: "stats.usedMultiplier15", operator: "==", value: true }
        },
        double_power: {
            name: "Double Power",
            description: "Doble poder",
            condition: "Ganar XP con x2",
            category: "xp",
            rarity: "rare",
            icon: "2️⃣",
            image: "img/logros/double power.png",
            rule: { field: "stats.usedMultiplier2", operator: "==", value: true }
        },
        triple_threat: {
            name: "Triple Threat",
            description: "Triple amenaza",
            condition: "Ganar XP con x3",
            category: "xp",
            rarity: "epic",
            icon: "3️⃣",
            rule: { field: "stats.usedMultiplier3", operator: "==", value: true }
        },
        bonus_hunter: {
            name: "Bonus Hunter",
            description: "Cazador de bonus",
            condition: "Bonus de racha 10 veces",
            category: "xp",
            rarity: "rare",
            icon: "🎯",
            image: "img/logros/Bonus Hunter.png",
            rule: { field: "stats.streakBonusCount", operator: ">=", value: 10 }
        },

        // ==================== RANKING ====================
        top_15: {
            name: "Top 15",
            description: "Entraste al Top 15",
            condition: "Aparecer en Top 15",
            category: "ranking",
            rarity: "uncommon",
            icon: "📊",
            rule: { field: "stats.bestRank", operator: "<=", value: 15 }
        },
        top_10: {
            name: "Top 10",
            description: "Entraste al Top 10",
            condition: "Aparecer en Top 10",
            category: "ranking",
            rarity: "rare",
            icon: "🔟",
            rule: { field: "stats.bestRank", operator: "<=", value: 10 }
        },
        top_5: {
            name: "Top 5",
            description: "Elite del chat",
            condition: "Aparecer en Top 5",
            category: "ranking",
            rarity: "rare",
            icon: "5️⃣",
            rule: { field: "stats.bestRank", operator: "<=", value: 5 }
        },
        podium: {
            name: "Podium",
            description: "En el podio",
            condition: "Aparecer en Top 3",
            category: "ranking",
            rarity: "epic",
            icon: "🥉",
            rule: { field: "stats.bestRank", operator: "<=", value: 3 }
        },
        runner_up: {
            name: "Runner Up",
            description: "Segundo lugar",
            condition: "Posición #2",
            category: "ranking",
            rarity: "epic",
            icon: "🥈",
            rule: { field: "stats.bestRank", operator: "<=", value: 2 }
        },
        champion: {
            name: "Champion",
            description: "Campeón del chat",
            condition: "Posición #1",
            category: "ranking",
            rarity: "legendary",
            icon: "🥇",
            rule: { field: "stats.bestRank", operator: "==", value: 1 }
        },
        king_dethroner: {
            name: "King Dethroner",
            description: "Destronaste al #1",
            condition: "Quitar posición #1 a otro",
            category: "ranking",
            rarity: "legendary",
            icon: "👑",
            rule: { field: "stats.dethroned", operator: "==", value: true }
        },
        climber: {
            name: "Climber",
            description: "Escalador de ranking",
            condition: "Subir 5 posiciones",
            category: "ranking",
            rarity: "uncommon",
            icon: "🧗",
            rule: { field: "stats.bestClimb", operator: ">=", value: 5 }
        },
        rocket: {
            name: "Rocket",
            description: "Cohete al ranking",
            condition: "Subir 10 posiciones en un día",
            category: "ranking",
            rarity: "rare",
            icon: "🚀",
            rule: { field: "stats.bestDailyClimb", operator: ">=", value: 10 }
        },
        consistent_top: {
            name: "Consistent Top",
            description: "Top consistente",
            condition: "Top 10 por 7 días",
            category: "ranking",
            rarity: "epic",
            icon: "📈",
            rule: { field: "stats.daysInTop10", operator: ">=", value: 7 }
        },
        ranking_veteran: {
            name: "Ranking Veteran",
            description: "Veterano del ranking",
            condition: "Top 15 por 30 días",
            category: "ranking",
            rarity: "epic",
            icon: "🎖️",
            rule: { field: "stats.daysInTop15", operator: ">=", value: 30 }
        },
        untouchable: {
            name: "Untouchable",
            description: "Intocable",
            condition: "#1 por 7 días",
            category: "ranking",
            rarity: "legendary",
            icon: "🛡️",
            rule: { field: "stats.daysAsTop1", operator: ">=", value: 7 }
        },
        iron_throne: {
            name: "Iron Throne",
            description: "Trono de hierro",
            condition: "#1 por 30 días",
            category: "ranking",
            rarity: "legendary",
            icon: "🪑",
            rule: { field: "stats.daysAsTop1", operator: ">=", value: 30 }
        },
        comeback_king: {
            name: "Comeback King",
            description: "Rey del regreso",
            condition: "Volver al Top 10",
            category: "ranking",
            rarity: "rare",
            icon: "↩️",
            rule: { field: "stats.comebacks", operator: ">=", value: 1 }
        },
        rival_defeated: {
            name: "Rival Defeated",
            description: "Rival derrotado",
            condition: "Superar a quien te superó",
            category: "ranking",
            rarity: "rare",
            icon: "⚔️",
            rule: { field: "stats.rivalsDefeated", operator: ">=", value: 1 }
        },

        // ==================== STREAM ====================
        stream_opener: {
            name: "Stream Opener",
            description: "Abridor del stream",
            condition: "5 mensajes en primeros 5 min",
            category: "stream",
            rarity: "uncommon",
            icon: "🎬",
            rule: { field: "stats.streamOpenerCount", operator: ">=", value: 5 }
        },
        early_supporter: {
            name: "Early Supporter",
            description: "Apoyo temprano",
            condition: "10 mensajes de apertura",
            category: "stream",
            rarity: "rare",
            icon: "🌟",
            rule: { field: "stats.streamOpenerCount", operator: ">=", value: 10 }
        },
        live_regular: {
            name: "Live Regular",
            description: "Regular en directo",
            condition: "100 mensajes en stream",
            category: "stream",
            rarity: "uncommon",
            icon: "📺",
            image: "img/logros/live regular.png",
            rule: { field: "stats.liveMessages", operator: ">=", value: 100 }
        },
        live_devotee: {
            name: "Live Devotee",
            description: "Devoto del directo",
            condition: "200 mensajes en stream",
            category: "stream",
            rarity: "rare",
            icon: "🎥",
            image: "img/logros/live devotee.png",
            rule: { field: "stats.liveMessages", operator: ">=", value: 200 }
        },
        stream_marathoner: {
            name: "Stream Marathoner",
            description: "Maratonista de stream",
            condition: "Activo en stream de 4+ horas",
            category: "stream",
            rarity: "epic",
            icon: "🏃",
            rule: { field: "stats.marathonStreams", operator: ">=", value: 1 }
        },
        offline_chatter: {
            name: "Offline Chatter",
            description: "Activo cuando no hay stream",
            condition: "10 mensajes offline",
            category: "stream",
            rarity: "common",
            icon: "💤",
            rule: { field: "stats.offlineMessages", operator: ">=", value: 10 }
        },
        always_there: {
            name: "Always There",
            description: "Siempre presente",
            condition: "10 streams diferentes",
            category: "stream",
            rarity: "rare",
            icon: "📍",
            rule: { field: "stats.uniqueStreams", operator: ">=", value: 10 }
        },
        loyal_viewer: {
            name: "Loyal Viewer",
            description: "Viewer leal",
            condition: "50 streams diferentes",
            category: "stream",
            rarity: "epic",
            icon: "💝",
            rule: { field: "stats.uniqueStreams", operator: ">=", value: 50 }
        },
        stream_veteran: {
            name: "Stream Veteran",
            description: "Veterano de streams",
            condition: "100 streams diferentes",
            category: "stream",
            rarity: "legendary",
            icon: "🎖️",
            rule: { field: "stats.uniqueStreams", operator: ">=", value: 100 }
        },
        prime_time: {
            name: "Prime Time",
            description: "Activo en horario estelar",
            condition: "20 mensajes en hora pico",
            category: "stream",
            rarity: "uncommon",
            icon: "⏰",
            image: "img/logros/prime time.png",
            rule: { field: "stats.primeTimeMessages", operator: ">=", value: 20 }
        },


        // ==================== WATCH TIME ====================
        viewer_novice: {
            name: "Viewer Novice",
            description: "Espectador novato",
            condition: "10 horas de visualización",
            category: "watch_time",
            rarity: "common",
            icon: "🕒",
            image: "img/logros/default.png",
            rule: { field: "userData.watchTimeMinutes", operator: ">=", value: 600 } // 10h * 60m
        },
        viewer_regular: {
            name: "Viewer Regular",
            description: "Espectador habitual",
            condition: "50 horas de visualización",
            category: "watch_time",
            rarity: "common",
            icon: "⌚",
            image: "img/logros/default.png",
            rule: { field: "userData.watchTimeMinutes", operator: ">=", value: 3000 } // 50h
        },
        viewer_dedicated: {
            name: "Dedicated Viewer",
            description: "Espectador dedicado",
            condition: "100 horas de visualización",
            category: "watch_time",
            rarity: "uncommon",
            icon: "📅",
            image: "img/logros/default.png",
            rule: { field: "userData.watchTimeMinutes", operator: ">=", value: 6000 } // 100h
        },
        viewer_addict: {
            name: "Stream Addict",
            description: "Adicto al stream",
            condition: "200 horas de visualización",
            category: "watch_time",
            rarity: "uncommon",
            icon: "💉",
            image: "img/logros/default.png",
            rule: { field: "userData.watchTimeMinutes", operator: ">=", value: 12000 } // 200h
        },
        viewer_loyal: {
            name: "Loyal Viewer",
            description: "Lealtad demostrada",
            condition: "350 horas de visualización",
            category: "watch_time",
            rarity: "rare",
            icon: "🛡️",
            image: "img/logros/default.png",
            rule: { field: "userData.watchTimeMinutes", operator: ">=", value: 21000 } // 350h
        },
        viewer_insomniac: {
            name: "Insomniac",
            description: "¿Acaso duermes?",
            condition: "500 horas de visualización",
            category: "watch_time",
            rarity: "rare",
            icon: "💤",
            image: "img/logros/default.png",
            rule: { field: "userData.watchTimeMinutes", operator: ">=", value: 30000 } // 500h
        },
        viewer_veteran: {
            name: "Stream Veteran",
            description: "Veterano del canal",
            condition: "750 horas de visualización",
            category: "watch_time",
            rarity: "epic",
            icon: "🎖️",
            image: "img/logros/default.png",
            rule: { field: "userData.watchTimeMinutes", operator: ">=", value: 45000 } // 750h
        },
        viewer_eternal: {
            name: "Eternal Viewer",
            description: "Parte del mobiliario",
            condition: "1000 horas de visualización",
            category: "watch_time",
            rarity: "epic",
            icon: "🏛️",
            image: "img/logros/default.png",
            rule: { field: "userData.watchTimeMinutes", operator: ">=", value: 60000 } // 1000h
        },
        viewer_immortal: {
            name: "Immortal Witness",
            description: "Testigo inmortal",
            condition: "2000 horas de visualización",
            category: "watch_time",
            rarity: "legendary",
            icon: "👁️",
            image: "img/logros/default.png",
            rule: { field: "userData.watchTimeMinutes", operator: ">=", value: 120000 } // 2000h
        },

        // ==================== HOLIDAYS ====================
        new_year_chatter: {
            name: "New Year Chatter",
            description: "Primer mensaje del año",
            condition: "Mensaje el 1 de Enero",
            category: "holidays",
            rarity: "rare",
            icon: "🎆",
            rule: { field: "stats.holidays", operator: "includes", value: "new_year" }
        },
        new_year_countdown: {
            name: "Countdown Master",
            description: "Estuviste en el countdown",
            condition: "Mensaje 23:50-00:10 Año Nuevo",
            category: "holidays",
            rarity: "epic",
            icon: "🕐",
            rule: { field: "stats.holidays", operator: "includes", value: "countdown" }
        },
        valentines_love: {
            name: "Digital Love",
            description: "Amor en el chat",
            condition: "Mensaje el 14 de Febrero",
            category: "holidays",
            rarity: "rare",
            icon: "💕",
            rule: { field: "stats.holidays", operator: "includes", value: "valentines" }
        },
        spring_awakening: {
            name: "Spring Awakening",
            description: "Despertar primaveral",
            condition: "Mensaje el 21 de Marzo",
            category: "holidays",
            rarity: "uncommon",
            icon: "🌸",
            rule: { field: "stats.holidays", operator: "includes", value: "spring" }
        },
        april_fools: {
            name: "April Fools",
            description: "¡Inocente!",
            condition: "Mensaje el 1 de Abril",
            category: "holidays",
            rarity: "rare",
            icon: "🃏",
            rule: { field: "stats.holidays", operator: "includes", value: "april_fools" }
        },
        summer_vibes: {
            name: "Summer Vibes",
            description: "Vibras de verano",
            condition: "Mensaje el 21 de Junio",
            category: "holidays",
            rarity: "uncommon",
            icon: "☀️",
            rule: { field: "stats.holidays", operator: "includes", value: "summer" }
        },
        independence_day: {
            name: "Fireworks",
            description: "Fuegos artificiales",
            condition: "Mensaje el 4 de Julio",
            category: "holidays",
            rarity: "rare",
            icon: "🎇",
            rule: { field: "stats.holidays", operator: "includes", value: "july4" }
        },
        halloween_spirit: {
            name: "Halloween Spirit",
            description: "Espíritu de Halloween",
            condition: "Mensaje el 31 de Octubre",
            category: "holidays",
            rarity: "epic",
            icon: "🎃",
            rule: { field: "stats.holidays", operator: "includes", value: "halloween" }
        },
        day_of_dead: {
            name: "Día de Muertos",
            description: "Honrando a los caídos",
            condition: "Mensaje el 1-2 de Noviembre",
            category: "holidays",
            rarity: "rare",
            icon: "💀",
            rule: { field: "stats.holidays", operator: "includes", value: "day_of_dead" }
        },
        thanksgiving: {
            name: "Grateful Chatter",
            description: "Chatter agradecido",
            condition: "Mensaje en Thanksgiving",
            category: "holidays",
            rarity: "rare",
            icon: "🦃",
            rule: { field: "stats.holidays", operator: "includes", value: "thanksgiving" }
        },
        christmas_eve: {
            name: "Christmas Eve",
            description: "Nochebuena digital",
            condition: "Mensaje el 24 de Diciembre",
            category: "holidays",
            rarity: "epic",
            icon: "🎄",
            rule: { field: "stats.holidays", operator: "includes", value: "christmas_eve" }
        },
        christmas_day: {
            name: "Merry Glitchmas",
            description: "¡Feliz Glitchmas!",
            condition: "Mensaje el 25 de Diciembre",
            category: "holidays",
            rarity: "epic",
            icon: "🎅",
            rule: { field: "stats.holidays", operator: "includes", value: "christmas" }
        },
        new_years_eve: {
            name: "Year Ender",
            description: "Finalizador del año",
            condition: "Mensaje el 31 de Diciembre",
            category: "holidays",
            rarity: "rare",
            icon: "🥂",
            rule: { field: "stats.holidays", operator: "includes", value: "new_years_eve" }
        },
        friday_13th: {
            name: "Unlucky Day",
            description: "Día de mala suerte",
            condition: "Mensaje en Viernes 13",
            category: "holidays",
            rarity: "epic",
            icon: "🔮",
            rule: { field: "stats.holidays", operator: "includes", value: "friday_13" }
        },
        leap_year: {
            name: "Leap Chatter",
            description: "Solo cada 4 años",
            condition: "Mensaje el 29 de Febrero",
            category: "holidays",
            rarity: "legendary",
            icon: "🐸",
            rule: { field: "stats.holidays", operator: "includes", value: "leap_day" }
        },

        // ==================== ESPECIALES ====================
        achievement_hunter: {
            name: "Achievement Hunter",
            description: "Cazador de logros",
            condition: "Desbloquear 25 logros",
            category: "special",
            rarity: "rare",
            icon: "🏹",
            image: "img/logros/achievement hunter.png",
            rule: { field: "userData.achievements.length", operator: ">=", value: 25 }
        },
        completionist: {
            name: "Completionist",
            description: "Completista",
            condition: "Desbloquear 50 logros",
            category: "special",
            rarity: "epic",
            icon: "📋",
            rule: { field: "userData.achievements.length", operator: ">=", value: 50 }
        },
        master_collector: {
            name: "Master Collector",
            description: "Coleccionista maestro",
            condition: "Desbloquear 75 logros",
            category: "special",
            rarity: "epic",
            icon: "🗂️",
            rule: { field: "userData.achievements.length", operator: ">=", value: 75 }
        },
        platinum: {
            name: "Platinum",
            description: "Platino",
            condition: "Desbloquear 90 logros",
            category: "special",
            rarity: "legendary",
            icon: "🏅",
            rule: { field: "userData.achievements.length", operator: ">=", value: 90 }
        },
        cyberpunk_legend: {
            name: "Cyberpunk Legend",
            description: "Leyenda Cyberpunk",
            condition: "TODOS los logros",
            category: "special",
            rarity: "legendary",
            icon: "🌟",
            rule: { field: "userData.achievements.length", operator: ">=", value: 138 }
        },

        // ==================== BRO ====================
        bro_initiate: {
            name: "Bro Initiate",
            description: "Dijiste bro por primera vez",
            condition: "Decir \"bro\" 1 vez",
            category: "bro",
            rarity: "common",
            icon: "🤜",
            image: "img/logros/bro initiate.png",
            rule: { field: "stats.broCount", operator: ">=", value: 1 }
        },
        bro_regular: {
            name: "Bro Regular",
            description: "El bro habitual",
            condition: "Decir \"bro\" 10 veces",
            category: "bro",
            rarity: "uncommon",
            icon: "🤛",
            rule: { field: "stats.broCount", operator: ">=", value: 10 }
        },
        bro_fanatic: {
            name: "Bro Fanatic",
            description: "Fanático del bro",
            condition: "Decir \"bro\" 20 veces",
            category: "bro",
            rarity: "rare",
            icon: "😎",
            rule: { field: "stats.broCount", operator: ">=", value: 20 }
        },
        bro_master: {
            name: "Bro Master",
            description: "Maestro del bro",
            condition: "Decir \"bro\" 50 veces",
            category: "bro",
            rarity: "epic",
            icon: "🧢",
            rule: { field: "stats.broCount", operator: ">=", value: 50 }
        },
        bro_legend: {
            name: "Bro Legend",
            description: "Leyenda del bro",
            condition: "Decir \"bro\" 100 veces",
            category: "bro",
            rarity: "legendary",
            icon: "💪",
            rule: { field: "stats.broCount", operator: ">=", value: 100 }
        },

        // ==================== OTROS ====================
        gg_master: {
            name: "GG Master",
            description: "Siempre reconoces una buena partida",
            condition: "Decir \"gg\" 50 veces",
            category: "messages",
            rarity: "rare",
            icon: "🎮",
            rule: { field: "stats.ggCount", operator: ">=", value: 50 }
        },
        trasnochador: {
            name: "Trasnochador",
            description: "La noche es tu territorio",
            condition: "Mensaje entre 4:00-6:00 AM",
            category: "messages",
            rarity: "rare",
            icon: "🌙",
            image: "img/logros/trasnochador.png",
            rule: { field: "stats.earlyMorningMessages", operator: ">=", value: 1 }
        },

        // ==================== CYBERPUNK 2077 (Solo en categoría CP2077) ====================
        cp_welcome_to_nc: {
            name: "Welcome to Night City",
            description: "Tu primera conexión en Night City",
            condition: "1 mensaje en Cyberpunk 2077",
            category: "cyberpunk2077",
            rarity: "common",
            icon: "🌃",
            image: "img/logros/default.png",
            rule: { field: "stats.cyberpunk2077Messages", operator: ">=", value: 1 },
            gameCategory: "Cyberpunk 2077"
        },
        cp_street_samurai: {
            name: "Street Samurai",
            description: "Dominando las calles de Night City",
            condition: "25 mensajes en Cyberpunk 2077",
            category: "cyberpunk2077",
            rarity: "common",
            icon: "⚔️",
            image: "img/logros/default.png",
            rule: { field: "stats.cyberpunk2077Messages", operator: ">=", value: 25 },
            gameCategory: "Cyberpunk 2077"
        },
        cp_chrome_junkie: {
            name: "Chrome Junkie",
            description: "Adicto a los implantes cibernéticos",
            condition: "50 mensajes en Cyberpunk 2077",
            category: "cyberpunk2077",
            rarity: "uncommon",
            icon: "🦾",
            image: "img/logros/default.png",
            rule: { field: "stats.cyberpunk2077Messages", operator: ">=", value: 50 },
            gameCategory: "Cyberpunk 2077"
        },
        cp_edgerunner: {
            name: "Edgerunner",
            description: "Viviendo al límite en Night City",
            condition: "100 mensajes en Cyberpunk 2077",
            category: "cyberpunk2077",
            rarity: "uncommon",
            icon: "🔥",
            image: "img/logros/default.png",
            rule: { field: "stats.cyberpunk2077Messages", operator: ">=", value: 100 },
            gameCategory: "Cyberpunk 2077"
        },
        cp_arasaka_nightmare: {
            name: "Arasaka's Nightmare",
            description: "Una pesadilla para las corporaciones",
            condition: "200 mensajes en Cyberpunk 2077",
            category: "cyberpunk2077",
            rarity: "rare",
            icon: "🏢",
            image: "img/logros/default.png",
            rule: { field: "stats.cyberpunk2077Messages", operator: ">=", value: 200 },
            gameCategory: "Cyberpunk 2077"
        },
        cp_johnny_silverhand: {
            name: "Wake Up, Samurai",
            description: "Johnny estaría orgulloso",
            condition: "350 mensajes en Cyberpunk 2077",
            category: "cyberpunk2077",
            rarity: "rare",
            icon: "🎸",
            image: "img/logros/default.png",
            rule: { field: "stats.cyberpunk2077Messages", operator: ">=", value: 350 },
            gameCategory: "Cyberpunk 2077"
        },
        cp_relic_malfunction: {
            name: "Relic Malfunction",
            description: "El chip te está consumiendo",
            condition: "500 mensajes en Cyberpunk 2077",
            category: "cyberpunk2077",
            rarity: "epic",
            icon: "🧠",
            image: "img/logros/default.png",
            rule: { field: "stats.cyberpunk2077Messages", operator: ">=", value: 500 },
            gameCategory: "Cyberpunk 2077"
        },
        cp_afterlife_vip: {
            name: "Afterlife VIP",
            description: "Tienes tu bebida en el Afterlife",
            condition: "750 mensajes en Cyberpunk 2077",
            category: "cyberpunk2077",
            rarity: "epic",
            icon: "🍸",
            image: "img/logros/default.png",
            rule: { field: "stats.cyberpunk2077Messages", operator: ">=", value: 750 },
            gameCategory: "Cyberpunk 2077"
        },
        cp_never_fade_away: {
            name: "Never Fade Away",
            description: "Tu leyenda vivirá para siempre",
            condition: "1000 mensajes en Cyberpunk 2077",
            category: "cyberpunk2077",
            rarity: "legendary",
            icon: "💀",
            image: "img/logros/default.png",
            rule: { field: "stats.cyberpunk2077Messages", operator: ">=", value: 1000 },
            gameCategory: "Cyberpunk 2077"
        },
        cp_city_of_dreams: {
            name: "City of Dreams",
            description: "Night City es tu hogar",
            condition: "2000 mensajes en Cyberpunk 2077",
            category: "cyberpunk2077",
            rarity: "legendary",
            icon: "🌟",
            image: "img/logros/default.png",
            rule: { field: "stats.cyberpunk2077Messages", operator: ">=", value: 2000 },
            gameCategory: "Cyberpunk 2077"
        },

        // ==================== THE WITCHER 3 (Solo en categoría TW3) ====================
        tw3_white_wolf: {
            name: "The White Wolf",
            description: "Tu primera caza ha comenzado",
            condition: "1 mensaje en The Witcher 3",
            category: "witcher3",
            rarity: "common",
            icon: "🐺",
            image: "img/logros/thewhitewolf.png",
            rule: { field: "stats.witcher3Messages", operator: ">=", value: 1 },
            gameCategory: "The Witcher 3: Wild Hunt"
        },
        tw3_monster_slayer: {
            name: "Monster Slayer",
            description: "Matador de monstruos novato",
            condition: "25 mensajes en The Witcher 3",
            category: "witcher3",
            rarity: "common",
            icon: "🗡️",
            image: "img/logros/monsterslayer.png",
            rule: { field: "stats.witcher3Messages", operator: ">=", value: 25 },
            gameCategory: "The Witcher 3: Wild Hunt"
        },
        tw3_gwent_player: {
            name: "Gwent Player",
            description: "¿Una partidita de Gwent?",
            condition: "50 mensajes en The Witcher 3",
            category: "witcher3",
            rarity: "uncommon",
            icon: "🃏",
            image: "img/logros/gwentplayer.png",
            rule: { field: "stats.witcher3Messages", operator: ">=", value: 50 },
            gameCategory: "The Witcher 3: Wild Hunt"
        },
        tw3_path_warrior: {
            name: "Path Warrior",
            description: "Recorriendo el Sendero del Brujo",
            condition: "100 mensajes en The Witcher 3",
            category: "witcher3",
            rarity: "uncommon",
            icon: "🛤️",
            image: "img/logros/pathwarrior.png",
            rule: { field: "stats.witcher3Messages", operator: ">=", value: 100 },
            gameCategory: "The Witcher 3: Wild Hunt"
        },
        tw3_butcher_blaviken: {
            name: "Butcher of Blaviken",
            description: "La reputación te precede",
            condition: "200 mensajes en The Witcher 3",
            category: "witcher3",
            rarity: "rare",
            icon: "⚔️",
            image: "img/logros/default.png",
            rule: { field: "stats.witcher3Messages", operator: ">=", value: 200 },
            gameCategory: "The Witcher 3: Wild Hunt"
        },
        tw3_kaer_morhen: {
            name: "Kaer Morhen Guardian",
            description: "Protector de la fortaleza de brujos",
            condition: "350 mensajes en The Witcher 3",
            category: "witcher3",
            rarity: "rare",
            icon: "🏰",
            image: "img/logros/default.png",
            rule: { field: "stats.witcher3Messages", operator: ">=", value: 350 },
            gameCategory: "The Witcher 3: Wild Hunt"
        },
        tw3_wild_hunt_slayer: {
            name: "Wild Hunt Slayer",
            description: "Los jinetes fantasma te temen",
            condition: "500 mensajes en The Witcher 3",
            category: "witcher3",
            rarity: "epic",
            icon: "👻",
            image: "img/logros/default.png",
            rule: { field: "stats.witcher3Messages", operator: ">=", value: 500 },
            gameCategory: "The Witcher 3: Wild Hunt"
        },
        tw3_witcher_senses: {
            name: "Witcher Senses",
            description: "Tus sentidos están perfeccionados",
            condition: "750 mensajes en The Witcher 3",
            category: "witcher3",
            rarity: "epic",
            icon: "👁️",
            image: "img/logros/default.png",
            rule: { field: "stats.witcher3Messages", operator: ">=", value: 750 },
            gameCategory: "The Witcher 3: Wild Hunt"
        },
        tw3_master_witcher: {
            name: "Master Witcher",
            description: "Maestro de las dos espadas",
            condition: "1000 mensajes en The Witcher 3",
            category: "witcher3",
            rarity: "legendary",
            icon: "🎖️",
            image: "img/logros/default.png",
            rule: { field: "stats.witcher3Messages", operator: ">=", value: 1000 },
            gameCategory: "The Witcher 3: Wild Hunt"
        },
        tw3_legendary_witcher: {
            name: "Legendary Witcher",
            description: "Geralt de Rivia te reconoce como igual",
            condition: "2000 mensajes en The Witcher 3",
            category: "witcher3",
            rarity: "legendary",
            icon: "🌟",
            image: "img/logros/default.png",
            rule: { field: "stats.witcher3Messages", operator: ">=", value: 2000 },
            gameCategory: "The Witcher 3: Wild Hunt"
        },
        tw3_stream_2: {
            name: "First Contract",
            description: "Participar en 2 directos de The Witcher 3",
            condition: "2 directos distintos en TW3",
            category: "witcher3",
            rarity: "common",
            icon: "📜",
            image: "img/logros/firstcontract.png",
            rule: { field: "stats.witcher3Streams", operator: ">=", value: 2 },
            gameCategory: "The Witcher 3: Wild Hunt"
        },
        tw3_stream_5: {
            name: "Loyal Companion",
            description: "Acompañando a Geralt en su viaje",
            condition: "5 directos distintos en TW3",
            category: "witcher3",
            rarity: "rare",
            icon: "🛡️",
            image: "img/logros/default.png",
            rule: { field: "stats.witcher3Streams", operator: ">=", value: 5 },
            gameCategory: "The Witcher 3: Wild Hunt"
        },
        tw3_stream_10: {
            name: "Veteran of the Path",
            description: "Un verdadero veterano del sendero",
            condition: "10 directos distintos en TW3",
            category: "witcher3",
            rarity: "epic",
            icon: "🗺️",
            image: "img/logros/default.png",
            rule: { field: "stats.witcher3Streams", operator: ">=", value: 10 },
            gameCategory: "The Witcher 3: Wild Hunt"
        }
    }
};

// Congelar el objeto para evitar modificaciones accidentales
if (typeof Object.freeze === 'function') {
    Object.freeze(ACHIEVEMENTS_DATA);
    Object.freeze(ACHIEVEMENTS_DATA.achievements);
}
