import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

export default class TopCommand extends BaseCommand {
    constructor() {
        super('top', {
            aliases: ['leaderboard', 'ranking'],
            description: 'Muestra el top 3 de usuarios con más nivel'
        });
    }

    execute({ services }) {
        if (!services.xp) return;

        // Obtener leaderboard (top 5)
        const leaderboard = services.xp.getXPLeaderboard(3);

        if (!leaderboard || leaderboard.length === 0) {
            EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, 'Aún no hay datos de ranking.');
            return;
        }

        // Formatear mensaje
        // 1. User (Lvl X) | 2. User (Lvl X) ...
        const parts = leaderboard.map((entry, index) => {
            const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : '🥉');
            return `${medal} ${entry.username} (Lvl ${entry.level})`;
        });

        const message = `TOP 3: ${parts.join(' | ')}`;
        EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, message);
    }
}
