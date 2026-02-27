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
        this.userStats = new Map(); // Mapa de stats auxiliares por usuario
        this.isLoaded = false;
        
        this._unsubscribers = [];

        this._loadAchievementsFromModule();

        if (this.config.DEBUG) {
            console.log(`✅ AchievementService inicializado: ${Object.keys(this.achievements).length} logros definidos`);
        }

        this._unsubscribers.push(
            EventManager.on(EVENTS.STREAM.STATUS_CHANGED, (isOnline) => this.setStreamStatus(isOnline)),
            EventManager.on(EVENTS.STREAM.CATEGORY_UPDATED, (category) => this.setStreamCategory(category)),
            
            EventManager.on(EVENTS.USER.RANKING_UPDATED, (data) => {
                const username = data.username;
                const isInitialLoad = data.isInitialLoad || false;
                this.checkAchievements(username, { isRankingUpdate: true, isInitialLoad });
            }),

            // [FIX] También escuchar eventos batch (≥5 usuarios) para no perder chequeos de ranking
            EventManager.on(EVENTS.USER.RANKING_BATCH_UPDATED, (data) => {
                const isInitialLoad = data.isInitialLoad || false;
                if (data.users && Array.isArray(data.users)) {
                    data.users.forEach(u => {
                        this.checkAchievements(u.username, { isRankingUpdate: true, isInitialLoad });
                    });
                }
            }),

            EventManager.on(EVENTS.USER.LEVEL_UP, (data) => {
                const username = data.username;
                this.checkAchievements(username, { isLevelUp: true });
            }),

            // RETRO: Escuchar carga de usuarios para otorgar logros retroactivos
            EventManager.on(EVENTS.USER.LOADED, (eventData) => {
                const username = eventData.username;
                // isInitialLoad=true silencia el popup (para no spammear al inicio), pero otorga el logro
                this.checkAchievements(username, { isInitialLoad: true, isRetroactiveCheck: true });
            })
        );
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
                uniqueStreams: savedStats.uniqueStreams || 0,
                marathonStreams: savedStats.marathonStreams || 0,
                attendedStreams: savedStats.attendedStreams || [], // Array de IDs de streams
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

        // [FIX] Tracking de Level Ups diarios/semanales (para logros fast_learner, grinder)
        if (context.isLevelUp) {
            const todayStr = now.toDateString();
            if (stats.lastLevelUpDate !== todayStr) {
                stats.levelUpsToday = 1;
                stats.lastLevelUpDate = todayStr;
            } else {
                stats.levelUpsToday = (stats.levelUpsToday || 0) + 1;
            }
            stats.levelUpsThisWeek = (stats.levelUpsThisWeek || 0) + 1;

            // Resetear contador semanal cada lunes
            const dayOfWeek = now.getDay();
            if (dayOfWeek === 1 && stats._lastWeekReset !== todayStr) {
                stats.levelUpsThisWeek = 1;
                stats._lastWeekReset = todayStr;
            }
        }

        // [FIX] Tracking de Streak Resets y Phoenix (para logros streak_recovery, never_give_up, phoenix)
        const userData = this.stateManager.getUser(key);
        if (userData) {
            const currentStreak = userData.streakDays || 0;
            const previousStreak = stats._previousStreakSnapshot || 0;

            // Detectar rotura de racha: la racha bajó a 1 desde un valor mayor
            if (currentStreak === 1 && previousStreak > 1) {
                stats.streakResets = (stats.streakResets || 0) + 1;
                stats.maxStreakLost = Math.max(stats.maxStreakLost || 0, previousStreak);
            }

            // Lógica Phoenix: alcanzar 7 días después de haber perdido una racha de 14+
            if (!stats.phoenixAchieved && currentStreak >= 7 && (stats.maxStreakLost || 0) >= 14) {
                stats.phoenixAchieved = true;
            }

            // Actualizar snapshot de racha para comparaciones futuras
            stats._previousStreakSnapshot = currentStreak;
        }

        if (this.isStreamOnline) {
            stats.liveMessages = (stats.liveMessages || 0) + 1;
            
            // Si el stream empezó hace menos de 5 minutos
            const streamDurationMinutes = this.streamStartTime ? (Date.now() - this.streamStartTime) / 60000 : 999;
            if (streamDurationMinutes <= 5) stats.streamOpenerCount = (stats.streamOpenerCount || 0) + 1;
            
            if (hour >= 19 && hour < 23) stats.primeTimeMessages = (stats.primeTimeMessages || 0) + 1;

            // [FIX] Lógica de Unique Streams y Maratones
            if (this.currentStreamId) {
                // 1. Unique Streams (Asistencia a diferentes directos)
                if (!stats.attendedStreams) stats.attendedStreams = [];
                if (!stats.attendedStreams.includes(this.currentStreamId)) {
                    stats.attendedStreams.push(this.currentStreamId);
                    stats.uniqueStreams = stats.attendedStreams.length;
                    
                    // Limpieza opcional: Mantener solo los últimos 110 (suficiente para el logro legendario)
                    if (stats.attendedStreams.length > 120) {
                        stats.attendedStreams.shift();
                    }
                }

                // 2. Marathon Streams (Activo por 4+ horas en un stream)
                const streamDurationHours = (Date.now() - this.streamStartTime) / 3600000;
                if (streamDurationHours >= 4 && stats._lastMarathonStreamId !== this.currentStreamId) {
                    stats.marathonStreams = (stats.marathonStreams || 0) + 1;
                    stats._lastMarathonStreamId = this.currentStreamId; 
                }
            }
        } else {
            stats.offlineMessages = (stats.offlineMessages || 0) + 1;
        }

        this._updateHolidayStats(stats, now);

        // Guardar en RAM stateManager para persistencia
        if (userData) {
            userData.achievementStats = stats;
            this.stateManager.markDirty(key);
        }
    }

    /**
     * Detecta festivos y añade las claves correspondientes al array de holidays del usuario.
     * Cada clave sólo se añade una vez (idempotente).
     * @private
     */
    _updateHolidayStats(stats, now) {
        if (!stats.holidays) stats.holidays = [];
        const holidays = stats.holidays;
        const month = now.getMonth() + 1; // 1-12
        const day = now.getDate();
        const hour = now.getHours();
        const dayOfWeek = now.getDay(); // 0=domingo

        const toAdd = [];

        // Año Nuevo: 1 de Enero
        if (month === 1 && day === 1) toAdd.push('new_year');

        // Countdown: 31 Dic 23:50+ o 1 Ene 00:00-00:10
        if ((month === 12 && day === 31 && hour >= 23) || (month === 1 && day === 1 && hour === 0)) {
            toAdd.push('countdown');
        }

        // San Valentín: 14 de Febrero
        if (month === 2 && day === 14) toAdd.push('valentines');

        // Año bisiesto: 29 de Febrero
        if (month === 2 && day === 29) toAdd.push('leap_day');

        // Primavera: 21 de Marzo
        if (month === 3 && day === 21) toAdd.push('spring');

        // April Fools: 1 de Abril
        if (month === 4 && day === 1) toAdd.push('april_fools');

        // Verano: 21 de Junio
        if (month === 6 && day === 21) toAdd.push('summer');

        // 4 de Julio
        if (month === 7 && day === 4) toAdd.push('july4');

        // Halloween: 31 de Octubre
        if (month === 10 && day === 31) toAdd.push('halloween');

        // Día de Muertos: 1-2 de Noviembre
        if (month === 11 && (day === 1 || day === 2)) toAdd.push('day_of_dead');

        // Thanksgiving: 4to jueves de Noviembre
        if (month === 11 && dayOfWeek === 4 && day >= 22 && day <= 28) toAdd.push('thanksgiving');

        // Nochebuena: 24 de Diciembre
        if (month === 12 && day === 24) toAdd.push('christmas_eve');

        // Navidad: 25 de Diciembre
        if (month === 12 && day === 25) toAdd.push('christmas');

        // Fin de Año: 31 de Diciembre
        if (month === 12 && day === 31) toAdd.push('new_years_eve');

        // Viernes 13
        if (dayOfWeek === 5 && day === 13) toAdd.push('friday_13');

        // Añadir solo los que no estén ya registrados (idempotente)
        for (const key of toAdd) {
            if (!holidays.includes(key)) {
                holidays.push(key);
            }
        }
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
            // [FIX] Añadida 'watch_time' para que logros de visualización se comprueben con mensajes normales
            categoriesToCheck = ['messages', 'streaks', 'xp', 'stream', 'holidays', 'bro', 'watch_time', 'special'];
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
            username,
            achievement,
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
            // Generar un ID único para este stream si no existe (ej. formato 'YYYY-MM-DD-HH')
            if (!this.currentStreamId) {
                const now = new Date();
                this.currentStreamId = `stream-${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}-${now.getHours()}`;
            }
        } else {
            this.streamStartTime = null;
            this.currentStreamId = null;
        }
    }

    /**
     * Limpia los recursos y desuscribe eventos
     */
    destroy() {
        if (this._unsubscribers && this._unsubscribers.length > 0) {
            this._unsubscribers.forEach(unsub => {
                if (typeof unsub === 'function') unsub();
            });
            this._unsubscribers = [];
        }
        this.userStats.clear();
        if (this.config.DEBUG) console.log('🛑 AchievementService: Destroyed');
    }
}
