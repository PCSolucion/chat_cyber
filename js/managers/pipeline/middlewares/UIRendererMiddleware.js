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

        // Limpiar comandos de radio para la visualización en el chat normal también
        let displayMessage = ctx.message;
        const lower = displayMessage.toLowerCase();
        if (lower.startsWith('!voz ') || lower.startsWith('!radio ')) {
            displayMessage = displayMessage.substring(displayMessage.indexOf(' ') + 1);
        }

        this.uiManager.displayMessage(ctx.username, displayMessage, ctx.tags.emotes, subInfo, ctx.xpResult);
        next();
    }
}
