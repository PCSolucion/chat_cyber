import EventManager from '../../../utils/EventEmitter.js';
import { EVENTS } from '../../../utils/EventTypes.js';

/**
 * CommandFilterMiddleware - Detecta comandos y detiene el pipeline
 */
export default class CommandFilterMiddleware {
    execute(ctx, next) {
        if (ctx.message.startsWith('!')) {
            // Notificar actividad aunque sea comando
            EventManager.emit(EVENTS.USER.ACTIVITY, { userId: ctx.userId, username: ctx.username });
            
            // Aquí podríamos procesar el comando o dejarlo pasar para que otro lo procese.
            // Por ahora, detenemos el pipeline para los comandos de Twitch.
            return;
        }
        next();
    }
}
