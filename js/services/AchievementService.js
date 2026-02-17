import { ACHIEVEMENTS_DATA } from '../../viewer/data/AchievementsData.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

/**
 * AchievementService - Sistema de Logros (Refactorizado Username Key)
 * 
 * - Ya no usa `userId` numérico.
 * - Toda la lógica se basa en `username` (lowercase).
 * - Se integra con UserStateManager v2.0
 */
export default class AchievementService {
    constructor(config, experienceService, stateManager) {
        this.config = config;
        this.experienceService = experienceService;
        this.stateManager = stateManager;

        this.achievements = {};
        this.isLoaded = false;
        
        // Map<username, statsObject>
        this.userStats = new Map();
        
        this.currentStreamCategory = null;

        this._loadAchievementsFromModule();

        if (this.config.DEBUG) {
            console.log(`✅ AchievementService inicializado: ${Object.keys(this.achievements).length} logros definidos`);
        }

        EventManager.on(EVENTS.STREAM.STATUS_CHANGED, (isOnline) => this.setStreamStatus(isOnline));
        EventManager.on(EVENTS.STREAM.CATEGORY_UPDATED, (category) => this.setStreamCategory(category));
        
        EventManager.on(EVENTS.USER.RANKING_UPDATED, (data) => {
            const username = data.username;
            const isInitialLoad = data.isInitialLoad || false;
            this.checkAchievements(username, { isRankingUpdate: true, isInitialLoad });
        });

        // RETRO: Escuchar carga de usuarios para otorgar logros retroactivos
        EventManager.on(EVENTS.USER.LOADED, (eventData) => {
            const username = eventData.username;
            if (this.config.DEBUG) {
                // console.log(`🔄 Checking retroactive achievements for ${username}`);
            }
            // isInitialLoad=true silencia el popup (para no spammear al inicio), pero otorga el logro
            this.checkAchievements(username, { isInitialLoad: true, isRetroactiveCheck: true });
        });
    }

    _loadAchievementsFromModule() {
        try {
            // Checkeo seguro
            if (typeof ACHIEVEMENTS_DATA !== 'undefined' && ACHIEVEMENTS_DATA.achievements) {
                this._processAchievementData(ACHIEVEMENTS_DATA);
                this.isLoaded = true;
            } else {
                console.warn('⚠️ ACHIEVEMENTS_DATA no encontrado, logros vacíos.');
                this.achievements = {};
            }
        } catch (e) {
            console.error('❌ Error cargando logros:', e);
            this.achievements = {};
        }
    }

    _processAchievementData(data) {
        const achievementEntries = data.achievements || {};
        for (const [id, achData] of Object.entries(achievementEntries)) {
            this.achievements[id] = {
                id: id,
                name: achData.name,
                description: achData.description,
                condition: achData.condition,
                category: achData.category,
                rarity: achData.rarity,
                image: achData.image || 'img/logros/default.png',
                icon: null, 
                check: this._createCheckFunction(achData.rule)
            };
        }
    }

    _createCheckFunction(rule) {
        if (!rule) return () => false;
        return (userData, stats) => {
            try {
                const fieldValue = this._getFieldValue(rule.field, userData, stats);
                return this._evaluateOperator(fieldValue, rule.operator, rule.value);
            } catch (e) {
                return false;
            }
        };
    }

    _getFieldValue(field, userData, stats) {
        const parts = field.split('.');
        let obj;

        if (parts[0] === 'userData') {
            obj = userData;
            parts.shift();
        } else if (parts[0] === 'stats') {
            obj = stats;
            parts.shift();
        } else {
            return undefined;
        }

        for (const part of parts) {
            if (obj === undefined || obj === null) return undefined;
            obj = obj[part];
        }

        if (obj === undefined || obj === null) {
            if (field.includes('level')) return 1;
            if (field.includes('Count') || field.includes('Messages') || field.includes('Days')) return 0;
            if (field.includes('achievements')) return [];
            return 0;
        }
        return obj;
    }

    _evaluateOperator(fieldValue, operator, targetValue) {
        switch (operator) {
            case '>=': return (fieldValue || 0) >= targetValue;
            case '<=': return (fieldValue || 999) <= targetValue;
            case '>': return (fieldValue || 0) > targetValue;
            case '<': return (fieldValue || 999) < targetValue;
            case '==': 
            case '===': return fieldValue === targetValue;
            case '!=': 
            case '!==': return fieldValue !== targetValue;
            case 'includes':
                if (Array.isArray(fieldValue)) return fieldValue.includes(targetValue);
                return false;
            default: return false;
        }
    }

    /**
     * Obtiene stats auxiliares para logros (mensajes, rachas, etc.)
     */
    getUserStats(username) {
        if (!username) return {};
        const key = username.toLowerCase();

        if (!this.userStats.has(key)) {
            // Cargar inicial desde lo que tenga el usuario guardado
            const userData = this.stateManager.getUser(key);
            const savedStats = (userData && userData.achievementStats) ? userData.achievementStats : {};

            this.userStats.set(key, {
                // Defaults seguros
                firstMessageDays: savedStats.firstMessageDays || 0,
                messagesWithEmotes: savedStats.messagesWithEmotes || 0,
                mentionCount: savedStats.mentionCount || 0,
                nightMessages: savedStats.nightMessages || 0,
                broCount: savedStats.broCount || 0,
                ggCount: savedStats.ggCount || 0,
                earlyMorningMessages: savedStats.earlyMorningMessages || 0,
                streakResets: savedStats.streakResets || 0,
                maxStreakLost: savedStats.maxStreakLost || 0,
                phoenixAchieved: savedStats.phoenixAchieved || false,
                levelUpsToday: savedStats.levelUpsToday || 0,
                levelUpsThisWeek: savedStats.levelUpsThisWeek || 0,
                lastLevelUpDate: savedStats.lastLevelUpDate || null,
                usedMultiplier15: savedStats.usedMultiplier15 || false,
                usedMultiplier2: savedStats.usedMultiplier2 || false,
                usedMultiplier3: savedStats.usedMultiplier3 || false,
                streakBonusCount: savedStats.streakBonusCount || 0,
                bestRank: savedStats.bestRank || 999,
                currentRank: savedStats.currentRank || 999,
                daysInTop10: savedStats.daysInTop10 || 0,
                daysAsTop1: savedStats.daysAsTop1 || 0,
                liveMessages: savedStats.liveMessages || 0,
                offlineMessages: savedStats.offlineMessages || 0,
                streamOpenerCount: savedStats.streamOpenerCount || 0,
                primeTimeMessages: savedStats.primeTimeMessages || 0,
                holidays: savedStats.holidays || [],
                cyberpunk2077Messages: savedStats.cyberpunk2077Messages || 0,
                witcher3Messages: savedStats.witcher3Messages || 0,
                witcher3Streams: savedStats.witcher3Streams || 0,
                lastWitcher3Date: savedStats.lastWitcher3Date || null,
                // Preservar cualquier otro
                ...savedStats
            });
        }
 
        return this.userStats.get(key);
    }

    updateUserStats(username, context = {}) {
        if (!username) return;
        const key = username.toLowerCase();
        
        const stats = this.getUserStats(key);
        const now = new Date();
        const hour = now.getHours();

        // Actualizar lógica de contadores...
        if (context.isFirstMessageOfDay) stats.firstMessageDays = (stats.firstMessageDays || 0) + 1;
        if (context.hasEmotes) stats.messagesWithEmotes = (stats.messagesWithEmotes || 0) + 1;
        if (context.hasMention) stats.mentionCount = (stats.mentionCount || 0) + 1;
        
        if (hour >= 0 && hour < 5) stats.nightMessages = (stats.nightMessages || 0) + 1;
        if (hour >= 4 && hour < 6) stats.earlyMorningMessages = (stats.earlyMorningMessages || 0) + 1;

        if (context.message) {
            if (/\bbro\b/i.test(context.message)) {
                const matches = context.message.match(/\bbro\b/gi);
                if (matches) stats.broCount = (stats.broCount || 0) + matches.length;
            }
            if (/\bgg\b/i.test(context.message)) {
                const matches = context.message.match(/\bgg\b/gi);
                if (matches) stats.ggCount = (stats.ggCount || 0) + matches.length;
            }
        }

        if (context.streakMultiplier) {
            if (context.streakMultiplier >= 1.5) stats.usedMultiplier15 = true;
            if (context.streakMultiplier >= 2.0) stats.usedMultiplier2 = true;
            if (context.streakMultiplier >= 3.0) stats.usedMultiplier3 = true;
            if (context.streakMultiplier > 1.0) stats.streakBonusCount = (stats.streakBonusCount || 0) + 1;
        }

        if (context.isStreamLive) {
            stats.liveMessages = (stats.liveMessages || 0) + 1;
            if (context.isStreamStart) stats.streamOpenerCount = (stats.streamOpenerCount || 0) + 1;
            if (hour >= 19 && hour < 23) stats.primeTimeMessages = (stats.primeTimeMessages || 0) + 1;
        } else {
            stats.offlineMessages = (stats.offlineMessages || 0) + 1;
        }

        this._updateHolidayStats(stats, now);

        // Game specific
        if (this.currentStreamCategory && this.isStreamOnline) {
            const cat = this.currentStreamCategory.toLowerCase();
            if (cat.includes('cyberpunk') && cat.includes('2077')) {
                stats.cyberpunk2077Messages = (stats.cyberpunk2077Messages || 0) + 1;
            }
            if (cat.includes('witcher 3')) {
                stats.witcher3Messages = (stats.witcher3Messages || 0) + 1;
                const todayStr = now.toDateString();
                if (stats.lastWitcher3Date !== todayStr) {
                    stats.witcher3Streams = (stats.witcher3Streams || 0) + 1;
                    stats.lastWitcher3Date = todayStr;
                }
            }
        }

        // Guardar en RAM stateManager para persistencia
        const userData = this.stateManager.getUser(key);
        if (userData) {
            userData.achievementStats = stats;
            this.stateManager.markDirty(key);
        }
    }

    _updateHolidayStats(stats, now) {
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const holidays = stats.holidays || [];
        // Lógica simplificada de festivos
        const key = `${month}-${day}`; 
        // Implementación completa sería extensa, mantenemos lo básico
        if (!stats.holidays) stats.holidays = [];
    }

    async checkAchievements(username, context = {}) {
        if (!username) return [];
        const key = username.toLowerCase();

        // 1. Asegurar usuario cargado
        await this.stateManager.ensureUserLoaded(key);

        // 2. Update Stats
        this.updateUserStats(key, context);

        const userData = this.stateManager.getUser(key);
        const userStats = this.getUserStats(key);
        const unlockedNow = [];

        let existingAchievements = userData.achievements || [];
        // Support legacy strings
        const unlockedIds = existingAchievements.map(a => (typeof a === 'string' ? a : a.id));

        // 3. Check All
        for (const [achId, achievement] of Object.entries(this.achievements)) {
            if (unlockedIds.includes(achId)) continue;

            if (achievement.check(userData, userStats)) {
                // UNLOCKED
                const entry = { id: achId, unlockedAt: new Date().toISOString() };
                
                // Dar XP
                await this.experienceService.addAchievementXP(key, achievement.rarity, { 
                    suppressEvents: context.isInitialLoad 
                });

                existingAchievements.push(entry);
                unlockedNow.push(achievement);
                unlockedIds.push(achId); // Prevent double add in same loop

                if (this.config.DEBUG && !context.isInitialLoad) {
                    console.log(`🏆 LOGRO: ${key} -> ${achievement.name}`);
                }
            }
        }

        if (unlockedNow.length > 0) {
            userData.achievements = existingAchievements;
            this.stateManager.markDirty(key);

            if (!context.isInitialLoad) {
                unlockedNow.forEach(ach => this.emitAchievementUnlocked(key, ach));
            }
        }

        return unlockedNow;
    }

    emitAchievementUnlocked(username, achievement) {
        if (this.config.DEBUG) {
            console.log(`[AchievementService] Emitting achievement unlocked for ${username}:`, achievement.name);
        }
        EventManager.emit(EVENTS.USER.ACHIEVEMENT_UNLOCKED, {
            userId: null, 
            username: username,
            achievement: achievement,
            timestamp: Date.now()
        });
    }

    getUserAchievements(username) {
        if (!username) return [];
        const userData = this.stateManager.getUser(username.toLowerCase());
        const data = userData?.achievements || [];
        
        return data.map(ach => {
            const id = typeof ach === 'string' ? ach : ach.id;
            const def = this.achievements[id];
            if (!def) return null;
            return {
                ...def,
                unlockedAt: (typeof ach === 'object' ? ach.unlockedAt : null)
            };
        }).filter(Boolean);
    }

    // Útiles
    getAchievement(id) { return this.achievements[id]; }
    getAchievementsByCategory(cat) { return Object.values(this.achievements).filter(a => a.category === cat); }
    getTotalAchievements() { return Object.keys(this.achievements).length; }
    
    setStreamCategory(cat) { this.currentStreamCategory = cat; }
    setStreamStatus(online) { this.isStreamOnline = online; }
}
