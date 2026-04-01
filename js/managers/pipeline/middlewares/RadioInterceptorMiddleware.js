import Logger from '../../../utils/Logger.js';

/**
 * RadioInterceptorMiddleware - Intercepta comandos de radio (!voz, !radio)
 * para mostrar el nuevo RadioWidgetComponent.
 */
export default class RadioInterceptorMiddleware {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    async execute(ctx, next) {
        if (!this.uiManager || !ctx.message) return next();

        const lowerMsg = ctx.message.toLowerCase().trim();
        const isRadio = lowerMsg.startsWith('!voz') || lowerMsg.startsWith('!radio');

        if (isRadio) {
            Logger.info('Pipeline', `📻 Radio command detected from ${ctx.username}`);
            
            // Extraer el mensaje real quitando el comando
            const words = ctx.message.trim().split(/\s+/);
            words.shift(); // Quitar comando (!voz o !radio)
            const radioMsg = words.join(' ');

            if (radioMsg) {
                // Notificar al UIManager para que muestre el RadioWidget
                if (this.uiManager.showRadioMessage) {
                    this.uiManager.showRadioMessage(ctx.username, radioMsg, ctx.xpResult);
                }
            }
        }

        // Continuar con la visualización normal en el widget estándar
        next();
    }
}
