/**
 * UIRendererMiddleware - Envía el mensaje y los datos a la interfaz
 */
export default class UIRendererMiddleware {
    constructor(uiManager, xpService) {
        this.uiManager = uiManager;
        this.xpService = xpService;
    }

    execute(ctx, next) {
        if (!this.uiManager) return next();

        const isSub = ctx.tags.subscriber === true || ctx.tags.subscriber === '1';
        const subInfo = { 
            isSubscriber: isSub, 
            badges: ctx.tags.badges || {}, 
            badgeInfo: ctx.tags['badge-info'] || {} 
        };

        // Actualizar suscripción en segundo plano si es necesario
        if (isSub && this.xpService) {
            const months = parseInt(subInfo.badgeInfo?.subscriber) || 1;
            this.xpService.updateSubscription(ctx.username, months);
        }

        this.uiManager.displayMessage(ctx.username, ctx.message, ctx.tags.emotes, subInfo, ctx.xpResult);
        next();
    }
}
