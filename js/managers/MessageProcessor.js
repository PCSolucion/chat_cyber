import MessagePipeline from './pipeline/MessagePipeline.js';
import RankingSystem from '../services/RankingSystem.js';
import GistStorageService from '../services/GistStorageService.js';
import StreamHistoryService from '../services/StreamHistoryService.js';
import ExperienceService from '../services/ExperienceService.js';
import AchievementService from '../services/AchievementService.js';
import ThirdPartyEmoteService from '../services/ThirdPartyEmoteService.js';
import SessionStatsService from '../services/SessionStatsService.js';

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
                
                this.services.streamHistory = new StreamHistoryService(this.config, this.services.gist);
                this.services.streamHistory.startMonitoring();
                
                this.services.xp = new ExperienceService(this.config, this.services.gist);
                this.services.achievements = new AchievementService(this.config, this.services.xp);
            }

            if (this.config.THIRD_PARTY_EMOTES_ENABLED) {
                this.services.thirdPartyEmotes = new ThirdPartyEmoteService(this.config);
            }

            this.services.sessionStats = new SessionStatsService(this.config, this.services.xp, this.services.achievements);
            
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

        // Regex para detectar caracteres fuera del rango latino/estándar
        // Incluye: A-Z, acentos comunes, símbolos básicos y emojis
        // Excluye: CJK (Chino/Japo/Koreano), Cirílico, Árabe, etc.
        const foreignScriptRegex = /[^\u0000-\u024F\u2000-\u206F\u2E00-\u2E7F\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{2700}-\u{27BF}\u{1F000}-\u{1Faff}\s]/u;

        if (foreignScriptRegex.test(ctx.message)) {
            // Logger.info('Filter', `Mensaje ignorado (idioma no soportado) de ${ctx.username}`);
            return; // Detiene el pipeline, el mensaje se ignora
        }
        next();
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
    }

    _checkIsStreamStart() {
        if (!this.isStreamOnline || !this.streamStartTime) return false;
        return (Date.now() - this.streamStartTime) < TIMING.STREAM_START_WINDOW_MS;
    }

    async destroy() {
        Logger.info('App', '🛑 MessageProcessor: Shutting down...');
        if (this.services.xp?.persistence) await this.services.xp.persistence.saveImmediately();
        if (this.services.sessionStats) this.services.sessionStats.destroy();
        if (this.managers.idleDisplay) this.managers.idleDisplay.stop();
    }

    getService(name) { return this.services[name]; }
    getManager(name) { return this.managers[name]; }
}
