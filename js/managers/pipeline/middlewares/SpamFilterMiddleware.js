import Logger from '../../../utils/Logger.js';

/**
 * SpamFilterMiddleware - Anti-Spam Shield
 */
export default class SpamFilterMiddleware {
    constructor(spamFilterService) {
        this.spamFilter = spamFilterService;
    }

    execute(ctx, next) {
        if (this.spamFilter?.shouldBlock(ctx.username, ctx.message, ctx.timestamp)) {
            return; // Bloqueado, no llamar a next()
        }
        next();
    }
}
