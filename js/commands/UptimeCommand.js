import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

export default class UptimeCommand extends BaseCommand {
    constructor() {
        super('uptime', {
            aliases: ['on', 'tiempo', 'directo', 'livetime'],
            description: 'Muestra el tiempo que lleva el stream en directo'
        });
    }

    execute({ services }) {
        // We need to rely on SessionStatsService for session start time
        if (!services.sessionStats) return;

        if (!services.sessionStats.isLive || !services.sessionStats.sessionStart) {
             EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, '🔴 El stream está OFFLINE (o no se han detectado datos aún).');
             return;
        }

        const diff = Date.now() - services.sessionStats.sessionStart;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const timeStr = `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        
        EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, `⏱️ Stream en directo: ${timeStr}`);
    }
}
