/**
 * AchievementService - Sistema de Logros
 * 
 * Responsabilidades:
 * - Definir logros disponibles
 * - Detectar cuándo se desbloquea un logro
 * - Guardar logros desbloqueados
 * - Emitir eventos de logro desbloqueado
 * 
 * @class AchievementService
 */
class AchievementService {
    /**
     * Constructor del servicio de logros
     * @param {Object} config - Configuración global
     * @param {ExperienceService} experienceService - Servicio de XP
     */
    constructor(config, experienceService) {
        this.config = config;
        this.experienceService = experienceService;

        // Callbacks para eventos de logro desbloqueado
        this.achievementCallbacks = [];

        // Definir todos los logros disponibles
        this.achievements = this.initAchievements();

        // Cache de estadísticas adicionales por usuario (para logros que necesitan tracking extra)
        this.userStats = new Map();

        if (this.config.DEBUG) {
            console.log(`✅ AchievementService inicializado: ${Object.keys(this.achievements).length} logros definidos`);
        }
    }

    /**
     * Inicializa la definición de logros
     * Cada logro tiene: id, name, description, condition (texto), category, rarity, check (función)
     * @returns {Object}
     */
    initAchievements() {
        return {
            // ==================== MENSAJES (20 logros) ====================

            // Logros de cantidad de mensajes
            first_words: {
                id: 'first_words',
                name: 'First Words',
                description: 'Tus primeros mensajes en el chat',
                condition: '10 mensajes enviados',
                category: 'messages',
                rarity: 'common',
                icon: '💬',
                check: (userData) => userData.totalMessages >= 10
            },
            chatterbox: {
                id: 'chatterbox',
                name: 'Chatterbox',
                description: 'No puedes parar de escribir',
                condition: '50 mensajes',
                category: 'messages',
                rarity: 'common',
                icon: '🗣️',
                check: (userData) => userData.totalMessages >= 50
            },
            talkative: {
                id: 'talkative',
                name: 'Talkative',
                description: 'Comunicación constante',
                condition: '100 mensajes',
                category: 'messages',
                rarity: 'common',
                icon: '📢',
                check: (userData) => userData.totalMessages >= 100
            },
            motormouth: {
                id: 'motormouth',
                name: 'Motormouth',
                description: 'Hablas más que un fixer',
                condition: '250 mensajes',
                category: 'messages',
                rarity: 'uncommon',
                icon: '🎙️',
                check: (userData) => userData.totalMessages >= 250
            },
            choom_speaker: {
                id: 'choom_speaker',
                name: 'Choom Speaker',
                description: 'Maestro de la conversación',
                condition: '500 mensajes',
                category: 'messages',
                rarity: 'uncommon',
                icon: '🔊',
                check: (userData) => userData.totalMessages >= 500
            },
            voice_of_night_city: {
                id: 'voice_of_night_city',
                name: 'Voice of Night City',
                description: 'Tu voz resuena en las calles',
                condition: '1,000 mensajes',
                category: 'messages',
                rarity: 'rare',
                icon: '🌃',
                check: (userData) => userData.totalMessages >= 1000
            },
            legendary_talker: {
                id: 'legendary_talker',
                name: 'Legendary Talker',
                description: 'Leyenda del chat',
                condition: '2,500 mensajes',
                category: 'messages',
                rarity: 'rare',
                icon: '⭐',
                check: (userData) => userData.totalMessages >= 2500
            },
            chrome_tongue: {
                id: 'chrome_tongue',
                name: 'Chrome Tongue',
                description: 'Lengua mejorada cyberware',
                condition: '5,000 mensajes',
                category: 'messages',
                rarity: 'epic',
                icon: '🦾',
                check: (userData) => userData.totalMessages >= 5000
            },
            infinite_broadcast: {
                id: 'infinite_broadcast',
                name: 'Infinite Broadcast',
                description: 'Emisión sin fin',
                condition: '10,000 mensajes',
                category: 'messages',
                rarity: 'epic',
                icon: '📡',
                check: (userData) => userData.totalMessages >= 10000
            },
            netrunner_comms: {
                id: 'netrunner_comms',
                name: 'Netrunner Comms',
                description: 'Comunicaciones de élite',
                condition: '25,000 mensajes',
                category: 'messages',
                rarity: 'legendary',
                icon: '🧠',
                check: (userData) => userData.totalMessages >= 25000
            },

            // Logros de primer mensaje del día
            early_bird: {
                id: 'early_bird',
                name: 'Early Bird',
                description: 'Madrugador del chat',
                condition: '3 primeros mensajes del día',
                category: 'messages',
                rarity: 'common',
                icon: '🐦',
                check: (userData, stats) => (stats.firstMessageDays || 0) >= 3
            },
            morning_regular: {
                id: 'morning_regular',
                name: 'Morning Regular',
                description: 'Madrugador habitual',
                condition: '10 primeros mensajes',
                category: 'messages',
                rarity: 'uncommon',
                icon: '🌅',
                check: (userData, stats) => (stats.firstMessageDays || 0) >= 10
            },
            dawn_patrol: {
                id: 'dawn_patrol',
                name: 'Dawn Patrol',
                description: 'Patrulla del amanecer',
                condition: '30 primeros mensajes',
                category: 'messages',
                rarity: 'rare',
                icon: '🌄',
                check: (userData, stats) => (stats.firstMessageDays || 0) >= 30
            },

            // Logros de emotes
            emote_user: {
                id: 'emote_user',
                name: 'Emote User',
                description: 'Fan de los emotes',
                condition: '25 mensajes con emotes',
                category: 'messages',
                rarity: 'common',
                icon: '😀',
                check: (userData, stats) => (stats.messagesWithEmotes || 0) >= 25
            },
            emote_spammer: {
                id: 'emote_spammer',
                name: 'Emote Spammer',
                description: 'Fan de los emotes',
                condition: '100 mensajes con emotes',
                category: 'messages',
                rarity: 'uncommon',
                icon: '🎭',
                check: (userData, stats) => (stats.messagesWithEmotes || 0) >= 100
            },
            emote_master: {
                id: 'emote_master',
                name: 'Emote Master',
                description: 'Maestro del emote',
                condition: '500 mensajes con emotes',
                category: 'messages',
                rarity: 'rare',
                icon: '👑',
                check: (userData, stats) => (stats.messagesWithEmotes || 0) >= 500
            },

            // Logros de menciones
            mention_someone: {
                id: 'mention_someone',
                name: 'Mention Someone',
                description: 'Mencionas a otros usuarios',
                condition: '10 menciones',
                category: 'messages',
                rarity: 'common',
                icon: '👋',
                check: (userData, stats) => (stats.mentionCount || 0) >= 10
            },
            social_butterfly: {
                id: 'social_butterfly',
                name: 'Social Butterfly',
                description: 'Muy sociable',
                condition: '50 menciones',
                category: 'messages',
                rarity: 'uncommon',
                icon: '🦋',
                check: (userData, stats) => (stats.mentionCount || 0) >= 50
            },
            connector: {
                id: 'connector',
                name: 'Connector',
                description: 'Conectas a la gente',
                condition: '200 menciones',
                category: 'messages',
                rarity: 'rare',
                icon: '🔗',
                check: (userData, stats) => (stats.mentionCount || 0) >= 200
            },

            // Logro nocturno
            night_owl: {
                id: 'night_owl',
                name: 'Night Owl',
                description: 'Activo después de medianoche',
                condition: '5 mensajes después de 00:00',
                category: 'messages',
                rarity: 'uncommon',
                icon: '🦉',
                check: (userData, stats) => (stats.nightMessages || 0) >= 5
            },

            // ==================== RACHAS (15 logros) ====================

            streak_starter: {
                id: 'streak_starter', name: 'Streak Starter', description: 'Iniciaste una racha',
                condition: '2 días consecutivos', category: 'streaks', rarity: 'common', icon: '🔥',
                check: (userData) => (userData.streakDays || 0) >= 2
            },
            consistency: {
                id: 'consistency', name: 'Consistency', description: 'La constancia es clave',
                condition: '3 días consecutivos', category: 'streaks', rarity: 'common', icon: '📆',
                check: (userData) => (userData.streakDays || 0) >= 3
            },
            dedicated: {
                id: 'dedicated', name: 'Dedicated', description: 'Dedicación al chat',
                condition: '5 días consecutivos', category: 'streaks', rarity: 'uncommon', icon: '💪',
                check: (userData) => (userData.streakDays || 0) >= 5
            },
            week_warrior: {
                id: 'week_warrior', name: 'Week Warrior', description: 'Una semana sin faltar',
                condition: '7 días consecutivos', category: 'streaks', rarity: 'uncommon', icon: '🗓️',
                check: (userData) => (userData.streakDays || 0) >= 7
            },
            fortnight_fighter: {
                id: 'fortnight_fighter', name: 'Fortnight Fighter', description: 'Dos semanas seguidas',
                condition: '14 días consecutivos', category: 'streaks', rarity: 'rare', icon: '⚔️',
                check: (userData) => (userData.streakDays || 0) >= 14
            },
            monthly_devotion: {
                id: 'monthly_devotion', name: 'Monthly Devotion', description: 'Un mes entero',
                condition: '30 días consecutivos', category: 'streaks', rarity: 'rare', icon: '📅',
                check: (userData) => (userData.streakDays || 0) >= 30
            },
            iron_will: {
                id: 'iron_will', name: 'Iron Will', description: 'Voluntad de hierro',
                condition: '50 días consecutivos', category: 'streaks', rarity: 'epic', icon: '🔩',
                check: (userData) => (userData.streakDays || 0) >= 50
            },
            quarter_commitment: {
                id: 'quarter_commitment', name: 'Quarter Commitment', description: 'Compromiso trimestral',
                condition: '90 días consecutivos', category: 'streaks', rarity: 'epic', icon: '🏅',
                check: (userData) => (userData.streakDays || 0) >= 90
            },
            chrome_heart: {
                id: 'chrome_heart', name: 'Chrome Heart', description: 'Corazón de cromo',
                condition: '100 días consecutivos', category: 'streaks', rarity: 'epic', icon: '💎',
                check: (userData) => (userData.streakDays || 0) >= 100
            },
            half_year_hero: {
                id: 'half_year_hero', name: 'Half Year Hero', description: 'Medio año sin parar',
                condition: '180 días consecutivos', category: 'streaks', rarity: 'legendary', icon: '🦸',
                check: (userData) => (userData.streakDays || 0) >= 180
            },
            immortal_presence: {
                id: 'immortal_presence', name: 'Immortal Presence', description: 'Presencia inmortal',
                condition: '200 días consecutivos', category: 'streaks', rarity: 'legendary', icon: '👁️',
                check: (userData) => (userData.streakDays || 0) >= 200
            },
            annual_legend: {
                id: 'annual_legend', name: 'Annual Legend', description: 'Leyenda anual',
                condition: '365 días consecutivos', category: 'streaks', rarity: 'legendary', icon: '🏆',
                check: (userData) => (userData.streakDays || 0) >= 365
            },
            streak_recovery: {
                id: 'streak_recovery', name: 'Streak Recovery', description: 'Volviste después de perder racha',
                condition: 'Reiniciar racha 5 veces', category: 'streaks', rarity: 'uncommon', icon: '🔄',
                check: (userData, stats) => (stats.streakResets || 0) >= 5
            },
            never_give_up: {
                id: 'never_give_up', name: 'Never Give Up', description: 'Nunca te rindes',
                condition: 'Reiniciar racha 10 veces', category: 'streaks', rarity: 'rare', icon: '💥',
                check: (userData, stats) => (stats.streakResets || 0) >= 10
            },
            phoenix: {
                id: 'phoenix', name: 'Phoenix', description: 'Renaces de las cenizas',
                condition: 'Alcanzar 7d después de perder 14+', category: 'streaks', rarity: 'epic', icon: '🔥',
                check: (userData, stats) => (stats.phoenixAchieved || false)
            },

            // ==================== NIVELES (20 logros) ====================

            level_up_first: {
                id: 'level_up_first', name: 'First Level Up', description: 'Tu primer level up',
                condition: 'Alcanzar nivel 2', category: 'levels', rarity: 'common', icon: '⬆️',
                check: (userData) => (userData.level || 1) >= 2
            },
            street_kid: {
                id: 'street_kid', name: 'Street Kid', description: 'Ya no eres un novato',
                condition: 'Alcanzar nivel 5', category: 'levels', rarity: 'common', icon: '🛹',
                check: (userData) => (userData.level || 1) >= 5
            },
            mercenary_rank: {
                id: 'mercenary_rank', name: 'Mercenary Rank', description: 'Rango de mercenario',
                condition: 'Alcanzar nivel 10', category: 'levels', rarity: 'uncommon', icon: '🎖️',
                check: (userData) => (userData.level || 1) >= 10
            },
            solo_status: {
                id: 'solo_status', name: 'Solo Status', description: 'Status de Solo',
                condition: 'Alcanzar nivel 15', category: 'levels', rarity: 'uncommon', icon: '🔫',
                check: (userData) => (userData.level || 1) >= 15
            },
            netrunner_tier: {
                id: 'netrunner_tier', name: 'Netrunner Tier', description: 'Tier de Netrunner',
                condition: 'Alcanzar nivel 20', category: 'levels', rarity: 'rare', icon: '💻',
                check: (userData) => (userData.level || 1) >= 20
            },
            level_milestone_25: {
                id: 'level_milestone_25', name: 'Quarter Century', description: '25 niveles alcanzados',
                condition: 'Alcanzar nivel 25', category: 'levels', rarity: 'rare', icon: '🎯',
                check: (userData) => (userData.level || 1) >= 25
            },
            fixer_class: {
                id: 'fixer_class', name: 'Fixer Class', description: 'Clase Fixer',
                condition: 'Alcanzar nivel 30', category: 'levels', rarity: 'rare', icon: '🤝',
                check: (userData) => (userData.level || 1) >= 30
            },
            corpo_elite: {
                id: 'corpo_elite', name: 'Corpo Elite', description: 'Elite Corpo',
                condition: 'Alcanzar nivel 40', category: 'levels', rarity: 'epic', icon: '🏢',
                check: (userData) => (userData.level || 1) >= 40
            },
            night_city_legend: {
                id: 'night_city_legend', name: 'Night City Legend', description: 'Leyenda de Night City',
                condition: 'Alcanzar nivel 50', category: 'levels', rarity: 'epic', icon: '🌃',
                check: (userData) => (userData.level || 1) >= 50
            },
            cyberpsycho_tier: {
                id: 'cyberpsycho_tier', name: 'Cyberpsycho Tier', description: 'Nivel Cyberpsycho',
                condition: 'Alcanzar nivel 60', category: 'levels', rarity: 'epic', icon: '🤖',
                check: (userData) => (userData.level || 1) >= 60
            },
            maxtac_rank: {
                id: 'maxtac_rank', name: 'MaxTac Rank', description: 'Rango MaxTac',
                condition: 'Alcanzar nivel 70', category: 'levels', rarity: 'legendary', icon: '🚔',
                check: (userData) => (userData.level || 1) >= 70
            },
            level_milestone_75: {
                id: 'level_milestone_75', name: 'Diamond Tier', description: 'Tier diamante',
                condition: 'Alcanzar nivel 75', category: 'levels', rarity: 'legendary', icon: '💠',
                check: (userData) => (userData.level || 1) >= 75
            },
            trauma_team: {
                id: 'trauma_team', name: 'Trauma Team', description: 'Miembro del Trauma Team',
                condition: 'Alcanzar nivel 80', category: 'levels', rarity: 'legendary', icon: '🚑',
                check: (userData) => (userData.level || 1) >= 80
            },
            afterlife_legend: {
                id: 'afterlife_legend', name: 'Afterlife Legend', description: 'Leyenda del Afterlife',
                condition: 'Alcanzar nivel 90', category: 'levels', rarity: 'legendary', icon: '☠️',
                check: (userData) => (userData.level || 1) >= 90
            },
            choomba_supreme: {
                id: 'choomba_supreme', name: 'Choomba Supreme', description: 'El Choomba Supremo',
                condition: 'Alcanzar nivel 100', category: 'levels', rarity: 'legendary', icon: '👑',
                check: (userData) => (userData.level || 1) >= 100
            },
            beyond_legend: {
                id: 'beyond_legend', name: 'Beyond Legend', description: 'Más allá de la leyenda',
                condition: 'Alcanzar nivel 125', category: 'levels', rarity: 'legendary', icon: '🌟',
                check: (userData) => (userData.level || 1) >= 125
            },
            mythic_status: {
                id: 'mythic_status', name: 'Mythic Status', description: 'Status mítico',
                condition: 'Alcanzar nivel 150', category: 'levels', rarity: 'legendary', icon: '🔱',
                check: (userData) => (userData.level || 1) >= 150
            },
            transcendent: {
                id: 'transcendent', name: 'Transcendent', description: 'Trascendencia digital',
                condition: 'Alcanzar nivel 200', category: 'levels', rarity: 'legendary', icon: '✨',
                check: (userData) => (userData.level || 1) >= 200
            },
            fast_learner: {
                id: 'fast_learner', name: 'Fast Learner', description: 'Aprendiz rápido',
                condition: '3 level ups en un día', category: 'levels', rarity: 'rare', icon: '📚',
                check: (userData, stats) => (stats.levelUpsToday || 0) >= 3
            },
            grinder: {
                id: 'grinder', name: 'Grinder', description: 'El que muele XP',
                condition: '5 level ups en una semana', category: 'levels', rarity: 'epic', icon: '⚙️',
                check: (userData, stats) => (stats.levelUpsThisWeek || 0) >= 5
            },

            // ==================== EXPERIENCIA (15 logros) ====================

            first_xp: {
                id: 'first_xp', name: 'First XP', description: 'Empezando a ganar experiencia',
                condition: 'Ganar 50 XP', category: 'xp', rarity: 'common', icon: '✨',
                check: (userData) => (userData.xp || 0) >= 50
            },
            hundred_xp: {
                id: 'hundred_xp', name: 'Hundred XP', description: 'Centenar de experiencia',
                condition: 'Acumular 100 XP', category: 'xp', rarity: 'common', icon: '💯',
                check: (userData) => (userData.xp || 0) >= 100
            },
            thousand_xp: {
                id: 'thousand_xp', name: 'Thousand XP', description: 'Mil experiencias',
                condition: 'Acumular 1,000 XP', category: 'xp', rarity: 'common', icon: '🔢',
                check: (userData) => (userData.xp || 0) >= 1000
            },
            xp_collector: {
                id: 'xp_collector', name: 'XP Collector', description: 'Coleccionista de XP',
                condition: 'Acumular 5,000 XP', category: 'xp', rarity: 'uncommon', icon: '📦',
                check: (userData) => (userData.xp || 0) >= 5000
            },
            xp_hoarder: {
                id: 'xp_hoarder', name: 'XP Hoarder', description: 'Acumulador de XP',
                condition: 'Acumular 10,000 XP', category: 'xp', rarity: 'uncommon', icon: '🏦',
                check: (userData) => (userData.xp || 0) >= 10000
            },
            xp_magnate: {
                id: 'xp_magnate', name: 'XP Magnate', description: 'Magnate del XP',
                condition: 'Acumular 25,000 XP', category: 'xp', rarity: 'rare', icon: '💰',
                check: (userData) => (userData.xp || 0) >= 25000
            },
            xp_tycoon: {
                id: 'xp_tycoon', name: 'XP Tycoon', description: 'Tycoon del XP',
                condition: 'Acumular 50,000 XP', category: 'xp', rarity: 'rare', icon: '🏭',
                check: (userData) => (userData.xp || 0) >= 50000
            },
            xp_empire: {
                id: 'xp_empire', name: 'XP Empire', description: 'Imperio de XP',
                condition: 'Acumular 100,000 XP', category: 'xp', rarity: 'epic', icon: '🏰',
                check: (userData) => (userData.xp || 0) >= 100000
            },
            xp_legend: {
                id: 'xp_legend', name: 'XP Legend', description: 'Leyenda del XP',
                condition: 'Acumular 250,000 XP', category: 'xp', rarity: 'epic', icon: '🌠',
                check: (userData) => (userData.xp || 0) >= 250000
            },
            xp_god: {
                id: 'xp_god', name: 'XP God', description: 'Dios del XP',
                condition: 'Acumular 500,000 XP', category: 'xp', rarity: 'legendary', icon: '⚡',
                check: (userData) => (userData.xp || 0) >= 500000
            },
            million_xp: {
                id: 'million_xp', name: 'Millionaire', description: 'Millonario en XP',
                condition: 'Acumular 1,000,000 XP', category: 'xp', rarity: 'legendary', icon: '💎',
                check: (userData) => (userData.xp || 0) >= 1000000
            },
            multiplier_bonus: {
                id: 'multiplier_bonus', name: 'Multiplier Active', description: 'Multiplicador activo',
                condition: 'Ganar XP con x1.5+', category: 'xp', rarity: 'uncommon', icon: '✖️',
                check: (userData, stats) => (stats.usedMultiplier15 || false)
            },
            double_power: {
                id: 'double_power', name: 'Double Power', description: 'Doble poder',
                condition: 'Ganar XP con x2', category: 'xp', rarity: 'rare', icon: '2️⃣',
                check: (userData, stats) => (stats.usedMultiplier2 || false)
            },
            triple_threat: {
                id: 'triple_threat', name: 'Triple Threat', description: 'Triple amenaza',
                condition: 'Ganar XP con x3', category: 'xp', rarity: 'epic', icon: '3️⃣',
                check: (userData, stats) => (stats.usedMultiplier3 || false)
            },
            bonus_hunter: {
                id: 'bonus_hunter', name: 'Bonus Hunter', description: 'Cazador de bonus',
                condition: 'Bonus de racha 10 veces', category: 'xp', rarity: 'rare', icon: '🎯',
                check: (userData, stats) => (stats.streakBonusCount || 0) >= 10
            },

            // ==================== RANKING (15 logros) ====================

            top_15: {
                id: 'top_15', name: 'Top 15', description: 'Entraste al Top 15',
                condition: 'Aparecer en Top 15', category: 'ranking', rarity: 'uncommon', icon: '📊',
                check: (userData, stats) => (stats.bestRank || 999) <= 15
            },
            top_10: {
                id: 'top_10', name: 'Top 10', description: 'Entraste al Top 10',
                condition: 'Aparecer en Top 10', category: 'ranking', rarity: 'rare', icon: '🔟',
                check: (userData, stats) => (stats.bestRank || 999) <= 10
            },
            top_5: {
                id: 'top_5', name: 'Top 5', description: 'Elite del chat',
                condition: 'Aparecer en Top 5', category: 'ranking', rarity: 'rare', icon: '5️⃣',
                check: (userData, stats) => (stats.bestRank || 999) <= 5
            },
            podium: {
                id: 'podium', name: 'Podium', description: 'En el podio',
                condition: 'Aparecer en Top 3', category: 'ranking', rarity: 'epic', icon: '🥉',
                check: (userData, stats) => (stats.bestRank || 999) <= 3
            },
            runner_up: {
                id: 'runner_up', name: 'Runner Up', description: 'Segundo lugar',
                condition: 'Posición #2', category: 'ranking', rarity: 'epic', icon: '🥈',
                check: (userData, stats) => (stats.bestRank || 999) <= 2
            },
            champion: {
                id: 'champion', name: 'Champion', description: 'Campeón del chat',
                condition: 'Posición #1', category: 'ranking', rarity: 'legendary', icon: '🥇',
                check: (userData, stats) => (stats.bestRank || 999) === 1
            },
            king_dethroner: {
                id: 'king_dethroner', name: 'King Dethroner', description: 'Destronaste al #1',
                condition: 'Quitar posición #1 a otro', category: 'ranking', rarity: 'legendary', icon: '👑',
                check: (userData, stats) => (stats.dethroned || false)
            },
            climber: {
                id: 'climber', name: 'Climber', description: 'Escalador de ranking',
                condition: 'Subir 5 posiciones', category: 'ranking', rarity: 'uncommon', icon: '🧗',
                check: (userData, stats) => (stats.bestClimb || 0) >= 5
            },
            rocket: {
                id: 'rocket', name: 'Rocket', description: 'Cohete al ranking',
                condition: 'Subir 10 posiciones en un día', category: 'ranking', rarity: 'rare', icon: '🚀',
                check: (userData, stats) => (stats.bestDailyClimb || 0) >= 10
            },
            consistent_top: {
                id: 'consistent_top', name: 'Consistent Top', description: 'Top consistente',
                condition: 'Top 10 por 7 días', category: 'ranking', rarity: 'epic', icon: '📈',
                check: (userData, stats) => (stats.daysInTop10 || 0) >= 7
            },
            ranking_veteran: {
                id: 'ranking_veteran', name: 'Ranking Veteran', description: 'Veterano del ranking',
                condition: 'Top 15 por 30 días', category: 'ranking', rarity: 'epic', icon: '🎖️',
                check: (userData, stats) => (stats.daysInTop15 || 0) >= 30
            },
            untouchable: {
                id: 'untouchable', name: 'Untouchable', description: 'Intocable',
                condition: '#1 por 7 días', category: 'ranking', rarity: 'legendary', icon: '🛡️',
                check: (userData, stats) => (stats.daysAsTop1 || 0) >= 7
            },
            iron_throne: {
                id: 'iron_throne', name: 'Iron Throne', description: 'Trono de hierro',
                condition: '#1 por 30 días', category: 'ranking', rarity: 'legendary', icon: '🪑',
                check: (userData, stats) => (stats.daysAsTop1 || 0) >= 30
            },
            comeback_king: {
                id: 'comeback_king', name: 'Comeback King', description: 'Rey del regreso',
                condition: 'Volver al Top 10', category: 'ranking', rarity: 'rare', icon: '↩️',
                check: (userData, stats) => (stats.comebacks || 0) >= 1
            },
            rival_defeated: {
                id: 'rival_defeated', name: 'Rival Defeated', description: 'Rival derrotado',
                condition: 'Superar a quien te superó', category: 'ranking', rarity: 'rare', icon: '⚔️',
                check: (userData, stats) => (stats.rivalsDefeated || 0) >= 1
            },

            // ==================== STREAM (10 logros) ====================

            stream_opener: {
                id: 'stream_opener', name: 'Stream Opener', description: 'Abridor del stream',
                condition: '5 mensajes en primeros 5 min', category: 'stream', rarity: 'uncommon', icon: '🎬',
                check: (userData, stats) => (stats.streamOpenerCount || 0) >= 5
            },
            early_supporter: {
                id: 'early_supporter', name: 'Early Supporter', description: 'Apoyo temprano',
                condition: '10 mensajes de apertura', category: 'stream', rarity: 'rare', icon: '🌟',
                check: (userData, stats) => (stats.streamOpenerCount || 0) >= 10
            },
            live_regular: {
                id: 'live_regular', name: 'Live Regular', description: 'Regular en directo',
                condition: '100 mensajes en stream', category: 'stream', rarity: 'uncommon', icon: '📺',
                check: (userData, stats) => (stats.liveMessages || 0) >= 100
            },
            live_devotee: {
                id: 'live_devotee', name: 'Live Devotee', description: 'Devoto del directo',
                condition: '200 mensajes en stream', category: 'stream', rarity: 'rare', icon: '🎥',
                check: (userData, stats) => (stats.liveMessages || 0) >= 200
            },
            stream_marathoner: {
                id: 'stream_marathoner', name: 'Stream Marathoner', description: 'Maratonista de stream',
                condition: 'Activo en stream de 4+ horas', category: 'stream', rarity: 'epic', icon: '🏃',
                check: (userData, stats) => (stats.marathonStreams || 0) >= 1
            },
            offline_chatter: {
                id: 'offline_chatter', name: 'Offline Chatter', description: 'Activo cuando no hay stream',
                condition: '10 mensajes offline', category: 'stream', rarity: 'common', icon: '💤',
                check: (userData, stats) => (stats.offlineMessages || 0) >= 10
            },
            always_there: {
                id: 'always_there', name: 'Always There', description: 'Siempre presente',
                condition: '10 streams diferentes', category: 'stream', rarity: 'rare', icon: '📍',
                check: (userData, stats) => (stats.uniqueStreams || 0) >= 10
            },
            loyal_viewer: {
                id: 'loyal_viewer', name: 'Loyal Viewer', description: 'Viewer leal',
                condition: '50 streams diferentes', category: 'stream', rarity: 'epic', icon: '💝',
                check: (userData, stats) => (stats.uniqueStreams || 0) >= 50
            },
            stream_veteran: {
                id: 'stream_veteran', name: 'Stream Veteran', description: 'Veterano de streams',
                condition: '100 streams diferentes', category: 'stream', rarity: 'legendary', icon: '🎖️',
                check: (userData, stats) => (stats.uniqueStreams || 0) >= 100
            },
            prime_time: {
                id: 'prime_time', name: 'Prime Time', description: 'Activo en horario estelar',
                condition: '20 mensajes en hora pico', category: 'stream', rarity: 'uncommon', icon: '⏰',
                check: (userData, stats) => (stats.primeTimeMessages || 0) >= 20
            },

            // ==================== FECHAS FESTIVAS (15 logros) ====================

            new_year_chatter: {
                id: 'new_year_chatter', name: 'New Year Chatter', description: 'Primer mensaje del año',
                condition: 'Mensaje el 1 de Enero', category: 'holidays', rarity: 'rare', icon: '🎆',
                check: (userData, stats) => (stats.holidays || []).includes('new_year')
            },
            new_year_countdown: {
                id: 'new_year_countdown', name: 'Countdown Master', description: 'Estuviste en el countdown',
                condition: 'Mensaje 23:50-00:10 Año Nuevo', category: 'holidays', rarity: 'epic', icon: '🕐',
                check: (userData, stats) => (stats.holidays || []).includes('countdown')
            },
            valentines_love: {
                id: 'valentines_love', name: 'Digital Love', description: 'Amor en el chat',
                condition: 'Mensaje el 14 de Febrero', category: 'holidays', rarity: 'rare', icon: '💕',
                check: (userData, stats) => (stats.holidays || []).includes('valentines')
            },
            spring_awakening: {
                id: 'spring_awakening', name: 'Spring Awakening', description: 'Despertar primaveral',
                condition: 'Mensaje el 21 de Marzo', category: 'holidays', rarity: 'uncommon', icon: '🌸',
                check: (userData, stats) => (stats.holidays || []).includes('spring')
            },
            april_fools: {
                id: 'april_fools', name: 'April Fools', description: '¡Inocente!',
                condition: 'Mensaje el 1 de Abril', category: 'holidays', rarity: 'rare', icon: '🃏',
                check: (userData, stats) => (stats.holidays || []).includes('april_fools')
            },
            summer_vibes: {
                id: 'summer_vibes', name: 'Summer Vibes', description: 'Vibras de verano',
                condition: 'Mensaje el 21 de Junio', category: 'holidays', rarity: 'uncommon', icon: '☀️',
                check: (userData, stats) => (stats.holidays || []).includes('summer')
            },
            independence_day: {
                id: 'independence_day', name: 'Fireworks', description: 'Fuegos artificiales',
                condition: 'Mensaje el 4 de Julio', category: 'holidays', rarity: 'rare', icon: '🎇',
                check: (userData, stats) => (stats.holidays || []).includes('july4')
            },
            halloween_spirit: {
                id: 'halloween_spirit', name: 'Halloween Spirit', description: 'Espíritu de Halloween',
                condition: 'Mensaje el 31 de Octubre', category: 'holidays', rarity: 'epic', icon: '🎃',
                check: (userData, stats) => (stats.holidays || []).includes('halloween')
            },
            day_of_dead: {
                id: 'day_of_dead', name: 'Día de Muertos', description: 'Honrando a los caídos',
                condition: 'Mensaje el 1-2 de Noviembre', category: 'holidays', rarity: 'rare', icon: '💀',
                check: (userData, stats) => (stats.holidays || []).includes('day_of_dead')
            },
            thanksgiving: {
                id: 'thanksgiving', name: 'Grateful Chatter', description: 'Chatter agradecido',
                condition: 'Mensaje en Thanksgiving', category: 'holidays', rarity: 'rare', icon: '🦃',
                check: (userData, stats) => (stats.holidays || []).includes('thanksgiving')
            },
            christmas_eve: {
                id: 'christmas_eve', name: 'Christmas Eve', description: 'Nochebuena digital',
                condition: 'Mensaje el 24 de Diciembre', category: 'holidays', rarity: 'epic', icon: '🎄',
                check: (userData, stats) => (stats.holidays || []).includes('christmas_eve')
            },
            christmas_day: {
                id: 'christmas_day', name: 'Merry Glitchmas', description: '¡Feliz Glitchmas!',
                condition: 'Mensaje el 25 de Diciembre', category: 'holidays', rarity: 'epic', icon: '🎅',
                check: (userData, stats) => (stats.holidays || []).includes('christmas')
            },
            new_years_eve: {
                id: 'new_years_eve', name: 'Year Ender', description: 'Finalizador del año',
                condition: 'Mensaje el 31 de Diciembre', category: 'holidays', rarity: 'rare', icon: '🥂',
                check: (userData, stats) => (stats.holidays || []).includes('new_years_eve')
            },
            friday_13th: {
                id: 'friday_13th', name: 'Unlucky Day', description: 'Día de mala suerte',
                condition: 'Mensaje en Viernes 13', category: 'holidays', rarity: 'epic', icon: '🔮',
                check: (userData, stats) => (stats.holidays || []).includes('friday_13')
            },
            leap_year: {
                id: 'leap_year', name: 'Leap Chatter', description: 'Solo cada 4 años',
                condition: 'Mensaje el 29 de Febrero', category: 'holidays', rarity: 'legendary', icon: '🐸',
                check: (userData, stats) => (stats.holidays || []).includes('leap_day')
            },

            // ==================== ESPECIALES (5 logros) ====================

            achievement_hunter: {
                id: 'achievement_hunter', name: 'Achievement Hunter', description: 'Cazador de logros',
                condition: 'Desbloquear 25 logros', category: 'special', rarity: 'rare', icon: '🏹',
                check: (userData) => (userData.achievements || []).length >= 25
            },
            completionist: {
                id: 'completionist', name: 'Completionist', description: 'Completista',
                condition: 'Desbloquear 50 logros', category: 'special', rarity: 'epic', icon: '📋',
                check: (userData) => (userData.achievements || []).length >= 50
            },
            master_collector: {
                id: 'master_collector', name: 'Master Collector', description: 'Coleccionista maestro',
                condition: 'Desbloquear 75 logros', category: 'special', rarity: 'epic', icon: '🗂️',
                check: (userData) => (userData.achievements || []).length >= 75
            },
            platinum: {
                id: 'platinum', name: 'Platinum', description: 'Platino',
                condition: 'Desbloquear 90 logros', category: 'special', rarity: 'legendary', icon: '🏅',
                check: (userData) => (userData.achievements || []).length >= 90
            },
            cyberpunk_legend: {
                id: 'cyberpunk_legend', name: 'Cyberpunk Legend', description: 'Leyenda Cyberpunk',
                condition: 'TODOS los logros', category: 'special', rarity: 'legendary', icon: '🌟',
                check: (userData) => (userData.achievements || []).length >= 114 // Total - 1 (este mismo)
            }
        };
    }

    /**
     * Obtiene o crea las estadísticas de un usuario
     * Sincroniza con userData.achievementStats del Gist
     * @param {string} username 
     * @returns {Object}
     */
    getUserStats(username) {
        const lowerUser = username.toLowerCase();

        // Si no está en cache, cargar desde userData (Gist)
        if (!this.userStats.has(lowerUser)) {
            const userData = this.experienceService.getUserData(lowerUser);
            const savedStats = userData.achievementStats || {};

            this.userStats.set(lowerUser, {
                // Mensajes
                firstMessageDays: savedStats.firstMessageDays || 0,
                messagesWithEmotes: savedStats.messagesWithEmotes || 0,
                mentionCount: savedStats.mentionCount || 0,
                nightMessages: savedStats.nightMessages || 0,

                // Rachas
                streakResets: savedStats.streakResets || 0,
                maxStreakLost: savedStats.maxStreakLost || 0,
                phoenixAchieved: savedStats.phoenixAchieved || false,

                // Niveles
                levelUpsToday: savedStats.levelUpsToday || 0,
                levelUpsThisWeek: savedStats.levelUpsThisWeek || 0,
                lastLevelUpDate: savedStats.lastLevelUpDate || null,
                lastLevelUpWeek: savedStats.lastLevelUpWeek || null,

                // XP Multiplicadores
                usedMultiplier15: savedStats.usedMultiplier15 || false,
                usedMultiplier2: savedStats.usedMultiplier2 || false,
                usedMultiplier3: savedStats.usedMultiplier3 || false,
                streakBonusCount: savedStats.streakBonusCount || 0,

                // Ranking
                bestRank: savedStats.bestRank || 999,
                currentRank: savedStats.currentRank || 999,
                daysInTop10: savedStats.daysInTop10 || 0,
                daysInTop15: savedStats.daysInTop15 || 0,
                daysAsTop1: savedStats.daysAsTop1 || 0,
                bestClimb: savedStats.bestClimb || 0,
                bestDailyClimb: savedStats.bestDailyClimb || 0,
                dethroned: savedStats.dethroned || false,
                comebacks: savedStats.comebacks || 0,
                rivalsDefeated: savedStats.rivalsDefeated || 0,

                // Stream
                streamOpenerCount: savedStats.streamOpenerCount || 0,
                liveMessages: savedStats.liveMessages || 0,
                offlineMessages: savedStats.offlineMessages || 0,
                marathonStreams: savedStats.marathonStreams || 0,
                uniqueStreams: savedStats.uniqueStreams || 0,
                primeTimeMessages: savedStats.primeTimeMessages || 0,

                // Festivos
                holidays: savedStats.holidays || []
            });
        }

        return this.userStats.get(lowerUser);
    }

    /**
     * Actualiza estadísticas del usuario basado en el contexto del mensaje
     * @param {string} username 
     * @param {Object} context - Contexto del mensaje
     */
    updateUserStats(username, context = {}) {
        const lowerUser = username.toLowerCase();
        const stats = this.getUserStats(lowerUser);
        const now = new Date();
        const today = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
        const currentWeek = this.getWeekNumber(now);

        // ===== MENSAJES =====
        if (context.isFirstMessageOfDay) {
            stats.firstMessageDays = (stats.firstMessageDays || 0) + 1;
        }

        if (context.hasEmotes) {
            stats.messagesWithEmotes = (stats.messagesWithEmotes || 0) + 1;
        }

        if (context.hasMention) {
            stats.mentionCount = (stats.mentionCount || 0) + 1;
        }

        // Mensaje nocturno (00:00 - 05:00)
        const hour = now.getHours();
        if (hour >= 0 && hour < 5) {
            stats.nightMessages = (stats.nightMessages || 0) + 1;
        }

        // ===== XP MULTIPLICADORES =====
        if (context.streakMultiplier) {
            if (context.streakMultiplier >= 1.5) stats.usedMultiplier15 = true;
            if (context.streakMultiplier >= 2.0) stats.usedMultiplier2 = true;
            if (context.streakMultiplier >= 3.0) stats.usedMultiplier3 = true;
            if (context.streakMultiplier > 1.0) {
                stats.streakBonusCount = (stats.streakBonusCount || 0) + 1;
            }
        }

        // ===== STREAM =====
        if (context.isStreamLive) {
            stats.liveMessages = (stats.liveMessages || 0) + 1;

            if (context.isStreamStart) {
                stats.streamOpenerCount = (stats.streamOpenerCount || 0) + 1;
            }

            // Prime time (19:00 - 23:00)
            if (hour >= 19 && hour < 23) {
                stats.primeTimeMessages = (stats.primeTimeMessages || 0) + 1;
            }
        } else {
            stats.offlineMessages = (stats.offlineMessages || 0) + 1;
        }

        // ===== FECHAS FESTIVAS =====
        const month = now.getMonth() + 1; // 1-12
        const day = now.getDate();
        const dayOfWeek = now.getDay(); // 0 = Sunday

        if (!stats.holidays) stats.holidays = [];

        // Detectar fecha festiva
        const holidayChecks = [
            { condition: month === 1 && day === 1, key: 'new_year' },
            { condition: month === 2 && day === 14, key: 'valentines' },
            { condition: month === 3 && day === 21, key: 'spring' },
            { condition: month === 4 && day === 1, key: 'april_fools' },
            { condition: month === 6 && day === 21, key: 'summer' },
            { condition: month === 7 && day === 4, key: 'july4' },
            { condition: month === 10 && day === 31, key: 'halloween' },
            { condition: month === 11 && (day === 1 || day === 2), key: 'day_of_dead' },
            { condition: month === 12 && day === 24, key: 'christmas_eve' },
            { condition: month === 12 && day === 25, key: 'christmas' },
            { condition: month === 12 && day === 31, key: 'new_years_eve' },
            { condition: month === 2 && day === 29, key: 'leap_day' },
            { condition: dayOfWeek === 5 && day === 13, key: 'friday_13' }
        ];

        // Countdown de Año Nuevo (23:50 del 31 Dic a 00:10 del 1 Ene)
        if ((month === 12 && day === 31 && hour >= 23 && now.getMinutes() >= 50) ||
            (month === 1 && day === 1 && hour === 0 && now.getMinutes() <= 10)) {
            if (!stats.holidays.includes('countdown')) stats.holidays.push('countdown');
        }

        // Thanksgiving (4to jueves de Noviembre)
        if (month === 11 && dayOfWeek === 4) {
            const firstDayOfMonth = new Date(now.getFullYear(), 10, 1).getDay();
            const firstThursday = firstDayOfMonth <= 4 ? (5 - firstDayOfMonth) : (12 - firstDayOfMonth);
            const fourthThursday = firstThursday + 21;
            if (day >= fourthThursday && day < fourthThursday + 7) {
                if (!stats.holidays.includes('thanksgiving')) stats.holidays.push('thanksgiving');
            }
        }

        holidayChecks.forEach(({ condition, key }) => {
            if (condition && !stats.holidays.includes(key)) {
                stats.holidays.push(key);
            }
        });

        this.userStats.set(lowerUser, stats);

        // Sincronizar con userData para guardar en Gist
        const userData = this.experienceService.getUserData(lowerUser);
        userData.achievementStats = stats;
    }

    /**
     * Obtiene el número de semana del año
     * @param {Date} date
     * @returns {number}
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    /**
     * Verifica y desbloquea logros para un usuario después de un mensaje
     * @param {string} username 
     * @param {Object} context - Contexto del mensaje
     * @returns {Array} Lista de logros desbloqueados
     */
    checkAchievements(username, context = {}) {
        const lowerUser = username.toLowerCase();

        // Actualizar estadísticas primero
        this.updateUserStats(lowerUser, context);

        // Obtener datos del usuario desde ExperienceService
        const userData = this.experienceService.getUserData(lowerUser);
        const userStats = this.getUserStats(lowerUser);

        // Lista de logros desbloqueados en esta verificación
        const unlockedNow = [];

        // Obtener logros ya desbloqueados
        const existingAchievements = userData.achievements || [];

        // Verificar TODOS los logros de TODAS las categorías
        for (const [achievementId, achievement] of Object.entries(this.achievements)) {
            // Saltar si ya está desbloqueado
            if (existingAchievements.includes(achievementId)) continue;

            // Verificar si cumple la condición
            try {
                if (achievement.check(userData, userStats)) {
                    // ¡Logro desbloqueado!
                    existingAchievements.push(achievementId);
                    unlockedNow.push(achievement);

                    if (this.config.DEBUG) {
                        console.log(`🏆 LOGRO DESBLOQUEADO: ${username} -> ${achievement.name}`);
                    }
                }
            } catch (error) {
                console.error(`Error verificando logro ${achievementId}:`, error);
            }
        }

        // Guardar logros actualizados si hay nuevos
        if (unlockedNow.length > 0) {
            userData.achievements = existingAchievements;
            this.experienceService.usersXP.set(lowerUser, userData);
            this.experienceService.pendingChanges.add(lowerUser);
            this.experienceService.saveData();

            // Emitir eventos para cada logro desbloqueado
            unlockedNow.forEach(achievement => {
                this.emitAchievementUnlocked(username, achievement);
            });
        }

        return unlockedNow;
    }

    /**
     * Registra un callback para eventos de logro desbloqueado
     * @param {Function} callback 
     */
    onAchievementUnlocked(callback) {
        this.achievementCallbacks.push(callback);
    }

    /**
     * Emite evento de logro desbloqueado
     * @param {string} username 
     * @param {Object} achievement 
     */
    emitAchievementUnlocked(username, achievement) {
        const eventData = {
            username,
            achievement,
            timestamp: Date.now()
        };

        this.achievementCallbacks.forEach(callback => {
            try {
                callback(eventData);
            } catch (error) {
                console.error('Error en callback de achievement:', error);
            }
        });
    }

    /**
     * Obtiene los logros desbloqueados de un usuario
     * @param {string} username 
     * @returns {Array}
     */
    getUserAchievements(username) {
        const userData = this.experienceService.getUserData(username.toLowerCase());
        const achievementIds = userData.achievements || [];

        return achievementIds.map(id => this.achievements[id]).filter(Boolean);
    }

    /**
     * Obtiene información de un logro por ID
     * @param {string} achievementId 
     * @returns {Object|null}
     */
    getAchievement(achievementId) {
        return this.achievements[achievementId] || null;
    }

    /**
     * Obtiene todos los logros de una categoría
     * @param {string} category 
     * @returns {Array}
     */
    getAchievementsByCategory(category) {
        return Object.values(this.achievements).filter(a => a.category === category);
    }

    /**
     * Carga estadísticas adicionales desde los datos del usuario
     * (Para cuando se cargan datos del Gist)
     * @param {string} username 
     * @param {Object} savedStats 
     */
    loadUserStats(username, savedStats) {
        if (savedStats) {
            this.userStats.set(username.toLowerCase(), savedStats);
        }
    }

    /**
     * Obtiene estadísticas para guardar en Gist
     * @param {string} username 
     * @returns {Object}
     */
    getStatsForSave(username) {
        return this.getUserStats(username);
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AchievementService;
}
