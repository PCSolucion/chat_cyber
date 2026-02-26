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

        EventManager.on(EVENTS.USER.LEVEL_UP, (data) => {
            const username = data.username;
            this.checkAchievements(username, { isLevelUp: true });
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

        // Fallbacks inteligentes según el campo
        if (obj === undefined || obj === null) {
            if (field.includes('level')) return 1;
            if (field.includes('achieved') || field.includes('used')) return false;
            if (field.includes('Count') || field.includes('Messages') || field.includes('Days') || field.includes('Rank') || field.includes('xp')) return 0;
            if (field.includes('achievements') || field.includes('holidays')) return [];
            return 0;
        }
        return obj;
    }

    _evaluateOperator(fieldValue, operator, targetValue) {
        // Asegurar tipos básicos para comparaciones numéricas
        const isNumericOp = ['>', '>=', '<', '<='].includes(operator);
        const val = isNumericOp ? Number(fieldValue || 0) : fieldValue;
        const target = isNumericOp ? Number(targetValue) : targetValue;

        switch (operator) {
            case '>=': return val >= target;
            case '<=': return val <= target;
            case '>': return val > target;
            case '<': return val < target;
            case '==': 
            case '===': return val === target;
            case '!=': 
            case '!==': return val !== target;
            case 'includes':
                if (Array.isArray(val)) return val.includes(target);
                if (typeof val === 'string') return val.includes(String(target));
                return false;
            default: 
                console.warn(`[AchievementService] Operador no soportado: ${operator}`);
                return false;
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

        if (this.isStreamOnline) {
            stats.liveMessages = (stats.liveMessages || 0) + 1;
            
            // Si el stream empezó hace menos de 5 minutos
            const streamDurationMinutes = this.streamStartTime ? (Date.now() - this.streamStartTime) / 60000 : 999;
            if (streamDurationMinutes <= 5) stats.streamOpenerCount = (stats.streamOpenerCount || 0) + 1;
            
            if (hour >= 19 && hour < 23) stats.primeTimeMessages = (stats.primeTimeMessages || 0) + 1;
        } else {
            stats.offlineMessages = (stats.offlineMessages || 0) + 1;
        }

        this._updateHolidayStats(stats, now);



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

        // 2. Update Stats (Mutación controlada)
        this.updateUserStats(key, context);

        const userData = this.stateManager.getUser(key);
        if (!userData) return [];

        const userStats = this.getUserStats(key);
        const unlockedNow = [];

        // 2.5 Determinar categorías a chequear (Optimización)
        let categoriesToCheck = null;
        if (context.isRankingUpdate) {
            categoriesToCheck = ['ranking', 'special'];
        } else if (context.isLevelUp) {
            categoriesToCheck = ['levels', 'special'];
        } else if (context.isRetroactiveCheck) {
            categoriesToCheck = null; // Check all
        } else {
            // Mensaje normal de chat
            categoriesToCheck = ['messages', 'streaks', 'xp', 'stream', 'holidays', 'bro', 'special'];
        }

        // 3. Normalización de persistencia (Legacy Fix)
        if (!userData.achievements) userData.achievements = [];
        
        // Convertir strings legacy a objetos {id, unlockedAt} de una sola vez
        let needsNormalization = false;
        userData.achievements = userData.achievements.map(ach => {
            if (typeof ach === 'string') {
                needsNormalization = true;
                return { id: ach, unlockedAt: new Date().toISOString(), isLegacy: true };
            }
            return ach;
        });

        if (needsNormalization) {
            this.stateManager.markDirty(key);
        }

        const unlockedIds = new Set(userData.achievements.map(a => a.id));

        // 4. Check All
        for (const [achId, achievement] of Object.entries(this.achievements)) {
            if (unlockedIds.has(achId)) continue; // Ya lo tiene

            // Filtrado por categoría (Optimización)
            if (categoriesToCheck && !categoriesToCheck.includes(achievement.category)) {
                continue;
            }

            if (achievement.check(userData, userStats)) {
                // UNLOCKED!
                const entry = { 
                    id: achId, 
                    unlockedAt: new Date().toISOString() 
                };
                
                // Dar XP
                await this.experienceService.addAchievementXP(key, achievement.rarity, { 
                    suppressEvents: context.isInitialLoad 
                });

                userData.achievements.push(entry);
                unlockedNow.push(achievement);
                unlockedIds.add(achId); // Evitar duplicados en el mismo ciclo

                if (this.config.DEBUG && !context.isInitialLoad) {
                    console.log(`🏆 LOGRO DESBLOQUEADO: [${key}] -> ${achievement.name}`);
                }
            }
        }

        if (unlockedNow.length > 0) {
            this.stateManager.markDirty(key);

            if (!context.isInitialLoad) {
                // Throttling básico: Emitir eventos con un pequeño delay si son muchos
                unlockedNow.forEach((ach, index) => {
                    setTimeout(() => {
                        this.emitAchievementUnlocked(key, ach);
                    }, index * 500); // 500ms entre popups
                });
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
    setStreamStatus(online) { 
        this.isStreamOnline = online; 
        if (online) {
            this.streamStartTime = this.streamStartTime || Date.now();
        } else {
            this.streamStartTime = null;
        }
    }
}
