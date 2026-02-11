/**
 * BlacklistMiddleware - Filtra usuarios bloqueados
 */
export default class BlacklistMiddleware {
    constructor(config) {
        this.config = config;
    }

    execute(ctx, next) {
        const lowerUser = ctx.username.toLowerCase();
        if (this.config.BLACKLISTED_USERS?.includes(lowerUser)) {
            return; // Bloqueado, no llamar a next()
        }
        next();
    }
}
