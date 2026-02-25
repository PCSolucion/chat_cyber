import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

export default class StatsCommand extends BaseCommand {
    constructor() {
        super('stats', {
            aliases: ['estadisticas'],
            description: 'Muestra tus estadísticas de la sesión actual'
        });
    }

    execute({ userId, username, services }) {
        if (!services.sessionStats) return;

        const lowerUser = username.toLowerCase();
        // Usamos solo el nombre de usuario como ID
        const id = lowerUser;
        
        const msgCount = services.sessionStats.stats.userMessageCounts.get(id) || 0;
        const watchTimeMinutes = services.sessionStats.stats.sessionWatchTime.get(id) || 0;
        
        // Format duration
        const hours = Math.floor(watchTimeMinutes / 60);
        const mins = watchTimeMinutes % 60;
        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        const message = `@${username} -> 📊 Sesión actual: ${msgCount} mensajes | ⏱️ Tiempo: ${timeStr}`;
        EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, message);
    }
}
