/**
 * XPProcessorMiddleware - Calcula XP y niveles
 */
export default class XPProcessorMiddleware {
    constructor(xpService, xpDisplayManager, isStreamOnlineGetter, isStreamStartCheck) {
        this.xpService = xpService;
        this.xpDisplayManager = xpDisplayManager;
        this.isStreamOnlineGetter = isStreamOnlineGetter;
        this.isStreamStartCheck = isStreamStartCheck;
    }

    async execute(ctx, next) {
        if (!this.xpService) return await next();

        const xpContext = {
            hasEmotes: ctx.emoteCount > 0,
            emoteCount: ctx.emoteCount,
            emoteNames: ctx.emoteNames || [],
            isStreamLive: this.isStreamOnlineGetter(),
            isStreamStart: this.isStreamStartCheck(),
            hasMention: ctx.message.includes('@'),
            message: ctx.message
        };

        ctx.xpResult = this.xpService.trackMessage(ctx.userId, ctx.username, xpContext);
        ctx.xpContext = xpContext;

        if (this.xpDisplayManager) {
            this.xpDisplayManager.setVisible(true);
        }

        await next();
    }
}
