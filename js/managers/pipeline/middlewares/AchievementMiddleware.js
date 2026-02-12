import EventManager from '../../../utils/EventEmitter.js';
import { EVENTS } from '../../../utils/EventTypes.js';

/**
 * AchievementMiddleware - Comprueba logros y progreso de misiones
 */
export default class AchievementMiddleware {
    constructor(achievementService, xpService) {
        this.achievementService = achievementService;
        this.xpService = xpService;
    }

    execute(ctx, next) {
        if (!this.achievementService) return next();

        const achContext = {
            ...ctx.xpContext,
            isFirstMessageOfDay: ctx.xpResult?.xpSources?.some(s => s.source === 'FIRST_MESSAGE_DAY'),
            streakMultiplier: ctx.xpResult?.streakMultiplier || 1
        };

        this.achievementService.checkAchievements(ctx.userId, ctx.username, achContext);
        
        // Logros específicos: Progreso de Bro
        this._handleBroProgress(ctx.userId, ctx.username, ctx.message);

        // Actualizar objeto de logros para el renderizado
        if (ctx.xpResult) {
            const freshData = this.xpService.getUserData(ctx.userId, ctx.username);
            ctx.xpResult.achievements = freshData.achievements || [];
            ctx.xpResult.level = freshData.level;
            ctx.xpResult.xp = freshData.xp;
            ctx.xpResult.totalXP = freshData.xp;
        }

        next();
    }

    _handleBroProgress(userId, username, message) {
        if (/\bbro\b/i.test(message)) {
            const stats = this.achievementService.getUserStats(userId, username);
            const broCount = stats.broCount || 0;
            const broMilestones = [1, 10, 20, 50, 100];
            let nextM = broMilestones.find(m => m > broCount) || (Math.ceil((broCount + 1) / 100) * 100);
            EventManager.emit(EVENTS.USER.BRO_PROGRESS, { current: broCount, max: nextM });
        }
    }
}
