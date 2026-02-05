import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

export default class StatsCommand extends BaseCommand {
    constructor() {
        super('stats', ['me', 'session', 'misdatos']);
    }

    execute({ username, services }) {
        if (!services.sessionStats) return;

        // Force lowercase for lookup as per SessionStatsService
        const lowerUser = username.toLowerCase();
        
        const msgCount = services.sessionStats.stats.userMessageCounts.get(lowerUser) || 0;
        const watchTimeMinutes = services.sessionStats.stats.sessionWatchTime.get(lowerUser) || 0;
        
        // Format duration
        const hours = Math.floor(watchTimeMinutes / 60);
        const mins = watchTimeMinutes % 60;
        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        const message = `@${username} -> 📊 Sesión actual: ${msgCount} mensajes | ⏱️ Tiempo: ${timeStr}`;
        EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, message);
    }
}
