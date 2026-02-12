import EventManager from '../../../utils/EventEmitter.js';
import { EVENTS } from '../../../utils/EventTypes.js';

/**
 * StatsTrackerMiddleware - Registra estadísticas de la sesión
 */
export default class StatsTrackerMiddleware {
    constructor(sessionStatsService) {
        this.sessionStats = sessionStatsService;
    }

    execute(ctx, next) {
        if (this.sessionStats) {
            this.sessionStats.trackMessage(ctx.userId, ctx.username, ctx.message, {
                emoteCount: ctx.emoteCount,
                emoteNames: ctx.emoteNames
            });
        }
        
        // Emitir actividad global
        EventManager.emit(EVENTS.USER.ACTIVITY, { userId: ctx.userId, username: ctx.username });
        
        next();
    }
}
