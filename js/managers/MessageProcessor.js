import MessagePipeline from './pipeline/MessagePipeline.js';
import RankingSystem from '../services/RankingSystem.js';
import GistStorageService from '../services/GistStorageService.js';
import StreamHistoryService from '../services/StreamHistoryService.js';
import ExperienceService from '../services/ExperienceService.js';
import AchievementService from '../services/AchievementService.js';
import ThirdPartyEmoteService from '../services/ThirdPartyEmoteService.js';
import SessionStatsService from '../services/SessionStatsService.js';
import WatchTimeService from '../services/WatchTimeService.js';
import UserStateManager from '../services/UserStateManager.js';

import XPDisplayManager from './XPDisplayManager.js';
import UIManager from './UIManager.js';
import IdleDisplayManager from './IdleDisplayManager.js';
import NotificationManager from './NotificationManager.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import { TIMING } from '../constants/AppConstants.js';
import Logger from '../utils/Logger.js';

/**
 * MessageProcessor - Orquestador central de la lógica de mensajes
 * 
 * REFACTORIZADO: Ahora utiliza un patrón de Pipeline con Middlewares para 
 * procesar los mensajes de forma desacoplada y eficiente.
 */
export default class MessageProcessor {
    constructor(config) {
        this.config = config;
        this.services = {};
        this.managers = {};
        this.isInitialized = false;
        
        // Estado del stream
        this.isStreamOnline = false;
        this.streamStartTime = null;

        this.notificationManager = null;
        
        // Nueva tubería de procesamiento
        this.pipeline = new MessagePipeline();

        // Anti-Spam Shield State
        this._spamState = {
            // Historial por usuario: { username: [{ text, timestamp }] }
            userHistory: new Map(),
            // Historial global reciente: [{ text, username, timestamp }]
            globalHistory: [],
            // Copypasta tracker: { textHash: { count, firstTime, usernames, rendered } }
            copypastaTracker: new Map(),
            // Mensajes por usuario en ventana de tiempo: { username: [timestamps] }
            floodTracker: new Map()
        };

        // Configuración Anti-Spam (overrideable via config)
        this._spamConfig = {
            maxRepeatMessages: 3,          // Mensajes iguales consecutivos para bloquear
            charFloodThreshold: 0.8,       // 80% del mismo carácter = flood
            charFloodMinLength: 8,         // Mínimo de caracteres para evaluar char flood
            copypastaWindow: 10000,        // 10s ventana para detectar copypasta
            copypastaMinUsers: 3,          // 3+ usuarios = copypasta
            floodWindow: 10000,            // 10s ventana para flood por usuario
            floodMaxMessages: 5,           // Max mensajes en la ventana
            floodShowRatio: 3,             // Mostrar 1 de cada N cuando está en flood
            historyMaxSize: 50,            // Tamaño máximo del buffer global
            cleanupInterval: 30000         // Limpiar estado viejo cada 30s
        };

        // Limpieza periódica del estado de spam
        this._spamCleanupTimer = setInterval(() => this._cleanupSpamState(), this._spamConfig.cleanupInterval);
    }

    /**
     * Inicializa todos los servicios y configura la tubería de mensajes
     */
    init() {
        Logger.info('App', '⚙️ Inicializando procesador de mensajes...');

        // 1. Inicializar Servicios Base
        this._initServices();
        
        // 2. Inicializar Managers Base
        this._initManagers();

        // 3. Configurar la Tubería (Middleware Pipeline)
        this._setupPipeline();

        this.isInitialized = true;
    }

    /**
     * Inicialización de servicios (Separado para limpieza)
     * @private
     */
    _initServices() {
        try {
            this.services.ranking = new RankingSystem(this.config);
            
            if (this.config.XP_SYSTEM_ENABLED) {
                this.services.gist = new GistStorageService(this.config);
                this.services.gist.configure(this.config.XP_GIST_ID, this.config.XP_GIST_TOKEN, this.config.XP_GIST_FILENAME);
                
                // Nuevo Gestor de Estado Centralizado
                this.services.stateManager = new UserStateManager(this.config, this.services.gist);
                
                this.services.streamHistory = new StreamHistoryService(this.config, this.services.gist);
                
                // Inyectar stateManager en los servicios que lo necesitan
                this.services.xp = new ExperienceService(this.config, this.services.stateManager);
                this.services.achievements = new AchievementService(this.config, this.services.xp, this.services.stateManager);
            }

            if (this.config.THIRD_PARTY_EMOTES_ENABLED) {
                this.services.thirdPartyEmotes = new ThirdPartyEmoteService(this.config);
            }

            this.services.sessionStats = new SessionStatsService(this.config, this.services.xp, this.services.achievements, this.services.stateManager);
            
            // Inicializar WatchTimeService (Requiere TwitchService inyectado después)
            this.services.watchTime = new WatchTimeService(this.config, this.services.xp, this.services.sessionStats);
            
            EventManager.on(EVENTS.STREAM.STATUS_CHANGED, (isOnline) => this.updateStreamStatus(isOnline));
        } catch (e) {
            Logger.error('App', 'Error initializing Services:', e);
        }
    }

    /**
     * Inicialización de managers (Separado para limpieza)
     * @private
     */
    _initManagers() {
        try {
            if (this.services.xp) {
                this.managers.xpDisplay = new XPDisplayManager(this.config, this.services.xp, this.services.achievements);
            }

            this.managers.ui = new UIManager(this.config, this.services.ranking, this.services.xp, this.services.thirdPartyEmotes, this.managers.xpDisplay);
            this.managers.idleDisplay = new IdleDisplayManager(this.config, this.services.sessionStats, this.managers.ui);
            this.notificationManager = new NotificationManager(this.config, this.managers.ui);
            this.managers.notification = this.notificationManager;
        } catch (e) {
            Logger.error('App', 'Error initializing Managers:', e);
        }
    }

    /**
     * Configura el orden de procesamiento de los mensajes
     * @private
     */
    _setupPipeline() {
        this.pipeline
            .use('Blacklist', (ctx, next) => this._mwBlacklist(ctx, next))
            .use('LanguageFilter', (ctx, next) => this._mwLanguageFilter(ctx, next))
            .use('SpamFilter', (ctx, next) => this._mwSpamFilter(ctx, next))
            .use('EmoteParser', (ctx, next) => this._mwEmoteParser(ctx, next))
            .use('CommandFilter', (ctx, next) => this._mwCommandFilter(ctx, next))
            .use('XPProcessor', (ctx, next) => this._mwXPProcessor(ctx, next))
            .use('AchievementChecker', (ctx, next) => this._mwAchievementChecker(ctx, next))
            .use('UIRenderer', (ctx, next) => this._mwUIRenderer(ctx, next))
            .use('StatsTracker', (ctx, next) => this._mwStatsTracker(ctx, next));
    }

    // =========================================================================
    // MIDDLEWARES DE PROCESAMIENTO
    // =========================================================================

    /** 🛑 Paso 1: Verificar usuarios bloqueados */
    _mwBlacklist(ctx, next) {
        const lowerUser = ctx.username.toLowerCase();
        if (this.config.BLACKLISTED_USERS?.includes(lowerUser)) return;
        next();
    }

    /** 🌐 Paso 1.5: Filtrar idiomas no deseados (CJK, etc.) */
    _mwLanguageFilter(ctx, next) {
        if (!this.config.LANGUAGE_FILTER_ENABLED) return next();

        const foreignScriptRegex = /[^\u0000-\u024F\u2000-\u206F\u2E00-\u2E7F\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{2700}-\u{27BF}\u{1F000}-\u{1Faff}\s]/u;

        if (foreignScriptRegex.test(ctx.message)) {
            return;
        }
        next();
    }

    /** 🛡️ Paso 1.7: Anti-Spam Shield */
    _mwSpamFilter(ctx, next) {
        const lowerUser = ctx.username.toLowerCase();
        const text = ctx.message.trim();
        const now = ctx.timestamp || Date.now();

        // --- 1. Detección de char flood (AAAAAAA) ---
        if (this._isCharFlood(text)) {
            Logger.info('SpamFilter', `Char flood blocked from ${ctx.username}`);
            return; // Detiene pipeline
        }

        // --- 2. Mensajes repetidos del mismo usuario ---
        if (this._isRepeatMessage(lowerUser, text, now)) {
            Logger.info('SpamFilter', `Repeat message blocked from ${ctx.username}`);
            return;
        }

        // --- 3. Copypasta detection (múltiples usuarios, mismo texto) ---
        const copypastaResult = this._checkCopypasta(lowerUser, text, now);
        if (copypastaResult === 'block') {
            return; // Ya se mostró el primero, bloquear repeticiones
        }

        // --- 4. Flood throttle por usuario ---
        if (this._isUserFlooding(lowerUser, now)) {
            Logger.info('SpamFilter', `Flood throttled from ${ctx.username}`);
            return;
        }

        // --- Registrar mensaje en historial ---
        this._recordMessage(lowerUser, text, now);

        next();
    }

    /**
     * Detecta si un mensaje es char flood (>80% del mismo carácter)
     * @private
     */
    _isCharFlood(text) {
        if (text.length < this._spamConfig.charFloodMinLength) return false;

        const chars = Array.from(text.replace(/\s/g, ''));
        if (chars.length === 0) return false;

        // Contar frecuencia del carácter más común
        const freq = {};
        let maxCount = 0;
        for (const c of chars) {
            freq[c] = (freq[c] || 0) + 1;
            if (freq[c] > maxCount) maxCount = freq[c];
        }

        return (maxCount / chars.length) >= this._spamConfig.charFloodThreshold;
    }

    /**
     * Detecta mensajes repetidos del mismo usuario
     * @private
     */
    _isRepeatMessage(username, text, now) {
        const history = this._spamState.userHistory.get(username) || [];
        const textLower = text.toLowerCase();

        // Contar cuántos de los últimos mensajes son iguales
        let repeatCount = 0;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].text === textLower) repeatCount++;
            else break; // Dejar de contar al encontrar uno diferente
        }

        return repeatCount >= this._spamConfig.maxRepeatMessages;
    }

    /**
     * Detecta copypasta (3+ usuarios enviando el mismo texto en <10s)
     * @private
     */
    _checkCopypasta(username, text, now) {
        const textLower = text.toLowerCase();
        // Ignorar mensajes muy cortos (emotes, "lol", etc.)
        if (textLower.length < 15) return 'pass';

        let entry = this._spamState.copypastaTracker.get(textLower);

        if (!entry) {
            // Primera vez que se ve este texto
            this._spamState.copypastaTracker.set(textLower, {
                count: 1,
                firstTime: now,
                usernames: new Set([username]),
                rendered: true // El primero siempre pasa
            });
            return 'pass';
        }

        // Si está fuera de la ventana, resetear
        if (now - entry.firstTime > this._spamConfig.copypastaWindow) {
            this._spamState.copypastaTracker.set(textLower, {
                count: 1,
                firstTime: now,
                usernames: new Set([username]),
                rendered: true
            });
            return 'pass';
        }

        // Dentro de la ventana: incrementar
        entry.usernames.add(username);
        entry.count++;

        // Si supera el umbral, bloquear
        if (entry.usernames.size >= this._spamConfig.copypastaMinUsers) {
            Logger.info('SpamFilter', `Copypasta blocked (${entry.count} copies from ${entry.usernames.size} users)`);
            return 'block';
        }

        return 'pass';
    }

    /**
     * Detecta flood por usuario (>5 mensajes en 10s)
     * @private
     */
    _isUserFlooding(username, now) {
        const timestamps = this._spamState.floodTracker.get(username) || [];

        // Limpiar timestamps antiguos
        const recentTimestamps = timestamps.filter(t => now - t < this._spamConfig.floodWindow);
        this._spamState.floodTracker.set(username, recentTimestamps);

        if (recentTimestamps.length >= this._spamConfig.floodMaxMessages) {
            // Throttle: mostrar solo 1 de cada N
            const totalInWindow = recentTimestamps.length + 1;
            return (totalInWindow % this._spamConfig.floodShowRatio) !== 0;
        }

        return false;
    }

    /**
     * Registra un mensaje en los historiales
     * @private
     */
    _recordMessage(username, text, now) {
        const textLower = text.toLowerCase();

        // Historial por usuario (últimos 5 mensajes)
        const userHist = this._spamState.userHistory.get(username) || [];
        userHist.push({ text: textLower, timestamp: now });
        if (userHist.length > 5) userHist.shift();
        this._spamState.userHistory.set(username, userHist);

        // Historial global (buffer circular)
        this._spamState.globalHistory.push({ text: textLower, username, timestamp: now });
        if (this._spamState.globalHistory.length > this._spamConfig.historyMaxSize) {
            this._spamState.globalHistory.shift();
        }

        // Flood tracker
        const floodTs = this._spamState.floodTracker.get(username) || [];
        floodTs.push(now);
        this._spamState.floodTracker.set(username, floodTs);
    }

    /**
     * Limpia estado antiguo de spam para evitar memory leaks
     * @private
     */
    _cleanupSpamState() {
        const now = Date.now();
        const maxAge = 60000; // 1 minuto

        // Limpiar copypasta tracker
        for (const [key, entry] of this._spamState.copypastaTracker) {
            if (now - entry.firstTime > maxAge) {
                this._spamState.copypastaTracker.delete(key);
            }
        }

        // Limpiar flood tracker (timestamps viejos)
        for (const [user, timestamps] of this._spamState.floodTracker) {
            const recent = timestamps.filter(t => now - t < maxAge);
            if (recent.length === 0) {
                this._spamState.floodTracker.delete(user);
            } else {
                this._spamState.floodTracker.set(user, recent);
            }
        }

        // Limpiar historial global
        this._spamState.globalHistory = this._spamState.globalHistory.filter(
            entry => now - entry.timestamp < maxAge
        );
    }

    /** 🧩 Paso 2: Extraer y normalizar emotes */
    _mwEmoteParser(ctx, next) {
        ctx.emoteCount = 0;
        ctx.emoteNames = [];

        // Twitch Emotes
        if (ctx.tags.emotes) {
            Object.entries(ctx.tags.emotes).forEach(([id, positions]) => {
                ctx.emoteCount += positions.length;
                const pos = positions[0].split('-');
                const emoteName = ctx.message.substring(parseInt(pos[0]), parseInt(pos[1]) + 1);
                ctx.emoteNames.push({ 
                    name: emoteName, 
                    provider: 'twitch', 
                    url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/1.0` 
                });
            });
        }

        // Third Party (7TV, BTTV, FFZ)
        if (this.services.thirdPartyEmotes) {
            ctx.message.split(/\s+/).forEach(word => {
                const data = this.services.thirdPartyEmotes.getEmote(word);
                if (data) {
                    ctx.emoteCount++;
                    ctx.emoteNames.push({ name: word, provider: data.provider, url: data.url });
                }
            });
        }
        next();
    }

    /** 🛡️ Paso 3: Filtrar comandos (ejecución técnica pero salida visual) */
    _mwCommandFilter(ctx, next) {
        if (ctx.message.startsWith('!')) {
            EventManager.emit(EVENTS.USER.ACTIVITY, ctx.username);
            return; // Detiene el pipeline para comandos
        }
        next();
    }

    /** ✨ Paso 4: Calcular XP y Niveles */
    _mwXPProcessor(ctx, next) {
        if (!this.services.xp) return next();

        const xpContext = {
            hasEmotes: ctx.emoteCount > 0,
            emoteCount: ctx.emoteCount,
            emoteNames: ctx.emoteNames || [],
            isStreamLive: this.isStreamOnline,
            isStreamStart: this._checkIsStreamStart(),
            hasMention: ctx.message.includes('@'),
            message: ctx.message
        };

        ctx.xpResult = this.services.xp.trackMessage(ctx.username, xpContext);
        ctx.xpContext = xpContext;

        if (this.managers.xpDisplay) {
            this.managers.xpDisplay.setVisible(true);
            // ELIMINADO: updateXPDisplay se llama ahora desde UIManager al procesar la cola
        }
        next();
    }

    /** 🏆 Paso 5: Comprobar Logros */
    _mwAchievementChecker(ctx, next) {
        if (!this.services.achievements) return next();

        const achContext = {
            ...ctx.xpContext,
            isFirstMessageOfDay: ctx.xpResult?.xpSources?.some(s => s.source === 'FIRST_MESSAGE_DAY'),
            streakMultiplier: ctx.xpResult?.streakMultiplier || 1
        };

        this.services.achievements.checkAchievements(ctx.username, achContext);
        
        // Logros específicos: Progreso de Bro
        this._handleBroProgress(ctx.username, ctx.message);

        // Actualizar objeto de logros para el renderizado (Sincronización forzada)
        if (ctx.xpResult) {
            const freshData = this.services.xp.getUserData(ctx.username);
            ctx.xpResult.achievements = freshData.achievements || [];
            ctx.xpResult.level = freshData.level;
            ctx.xpResult.xp = freshData.xp;
            ctx.xpResult.totalXP = freshData.xp;
        }
        next();
    }

    /** 🖥️ Paso 6: Renderizar UI */
    _mwUIRenderer(ctx, next) {
        if (!this.managers.ui) return next();

        const isSub = ctx.tags.subscriber === true || ctx.tags.subscriber === '1';
        const subInfo = { isSubscriber: isSub, badges: ctx.tags.badges || {}, badgeInfo: ctx.tags['badge-info'] || {} };

        // Actualizar suscripción en segundo plano
        if (isSub && this.services.xp) {
            const months = parseInt(subInfo.badgeInfo?.subscriber) || 1;
            this.services.xp.updateSubscription(ctx.username, months);
        }

        this.managers.ui.displayMessage(ctx.username, ctx.message, ctx.tags.emotes, subInfo, ctx.xpResult);
        next();
    }

    /** 📈 Paso 7: Trackear Estadísticas de sesión */
    _mwStatsTracker(ctx, next) {
        if (this.services.sessionStats) {
            this.services.sessionStats.trackMessage(ctx.username, ctx.message, {
                emoteCount: ctx.emoteCount,
                emoteNames: ctx.emoteNames
            });
        }
        EventManager.emit(EVENTS.USER.ACTIVITY, ctx.username);
        next();
    }

    // =========================================================================
    // MÉTODOS AUXILIARES
    // =========================================================================

    /**
     * Punto de entrada principal para mensajes entrantes
     */
    process(tags, message) {
        if (!this.isInitialized) return;

        const context = {
            tags,
            message,
            username: tags['display-name'] || tags.username,
            timestamp: Date.now()
        };

        // Emitir evento global de recibido (para sistemas externos)
        EventManager.emit(EVENTS.CHAT.MESSAGE_RECEIVED, { 
            username: context.username, 
            message, 
            tags 
        });

        // Lanzar la tubería
        this.pipeline.run(context);
    }

    _handleBroProgress(username, message) {
        if (/\bbro\b/i.test(message) && this.notificationManager) {
            const stats = this.services.achievements.getUserStats(username);
            const broCount = stats.broCount || 0;
            const broMilestones = [1, 10, 20, 50, 100];
            let nextM = broMilestones.find(m => m > broCount) || (Math.ceil((broCount + 1) / 100) * 100);
            EventManager.emit(EVENTS.USER.BRO_PROGRESS, { current: broCount, max: nextM });
        }
    }

    /**
     * Carga datos asíncronos (Rankings, XP, Emotes de terceros)
     */
    async loadAsyncData() {
        if (this.services.ranking) await this.services.ranking.loadRankings().catch(e => console.error(e));

        if (this.services.xp) {
            await this.services.xp.loadData().catch(e => console.error(e));
            
            // Si el ranking está cargado, actualizar estadísticas de ranking en XP service
            if (this.services.ranking && this.services.ranking.isLoaded) {
                 this.services.xp.updateRankingStats(this.services.ranking.userRankings, true);
            }

            if (this.services.gist?.isConfigured) {
                this.services.gist.testConnection().then(conn => {
                    Logger.info('XP', conn ? '✅ Gist connected' : '⚠️ Local mode only');
                });
            }
        }

        if (this.services.thirdPartyEmotes) {
            await this.services.thirdPartyEmotes.loadEmotes().catch(e => console.warn(e));
        }

        if (this.managers.idleDisplay) this.managers.idleDisplay.start();

        return {
            rankedUsers: this.services.ranking?.getTotalRankedUsers() || 0,
            xpEnabled: !!this.services.xp,
            thirdPartyEmotes: this.services.thirdPartyEmotes?.getStats() || null
        };
    }

    updateStreamStatus(isOnline) {
        if (isOnline && !this.isStreamOnline) {
            this.streamStartTime = Date.now();
            Logger.info('Stream', `Online at ${new Date(this.streamStartTime).toLocaleTimeString()}`);
        } else if (!isOnline) {
            this.streamStartTime = null;
        }
        this.isStreamOnline = isOnline;

        // Notificar a WatchTimeService
        if (this.services.watchTime) {
            this.services.watchTime.updateStreamStatus(isOnline);
        }
    }

    _checkIsStreamStart() {
        if (!this.isStreamOnline || !this.streamStartTime) return false;
        return (Date.now() - this.streamStartTime) < TIMING.STREAM_START_WINDOW_MS;
    }

    async destroy() {
        Logger.info('App', '🛑 MessageProcessor: Shutting down...');
        if (this.services.stateManager) await this.services.stateManager.saveImmediately();
        if (this.services.sessionStats) this.services.sessionStats.destroy();
        if (this.services.watchTime) this.services.watchTime.stop();
        if (this.managers.idleDisplay) this.managers.idleDisplay.stop();
        if (this._spamCleanupTimer) clearInterval(this._spamCleanupTimer);
    }

    getService(name) { return this.services[name]; }
    getManager(name) { return this.managers[name]; }

    /**
     * Inyecta el servicio de Twitch después de la inicialización de la app
     * @param {TwitchService} twitchService 
     */
    setTwitchService(twitchService) {
        this.services.twitch = twitchService;
        if (this.services.watchTime) {
            this.services.watchTime.setTwitchService(twitchService);
        }
    }
}
