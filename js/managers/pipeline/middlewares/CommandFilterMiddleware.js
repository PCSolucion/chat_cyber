import EventManager from '../../../utils/EventEmitter.js';
import { EVENTS } from '../../../utils/EventTypes.js';

/**
 * CommandFilterMiddleware - Detecta comandos y detiene el pipeline
 */
export default class CommandFilterMiddleware {
    execute(ctx, next) {
        if (ctx.message.startsWith('!')) {
            // Permitir que !voz y !radio lleguen al RadioInterceptor
            const lower = ctx.message.toLowerCase();
            if (lower.startsWith('!voz') || lower.startsWith('!radio')) {
                return next();
            }

            // Notificar actividad aunque sea comando
            EventManager.emit(EVENTS.USER.ACTIVITY, { userId: ctx.userId, username: ctx.username });
            return;
        }
        next();
    }
}
