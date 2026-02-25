import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

export default class EmotesCommand extends BaseCommand {
    constructor() {
        super('emotes', {
            aliases: ['topemotes', 'trending'],
            description: 'Muestra los emotes más usados en la sesión'
        });
    }

    execute({ services }) {
        if (!services.sessionStats) return;

        const topEmotes = services.sessionStats.getTopEmotes(3);

        if (topEmotes.length === 0) {
            EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, '🤔 Aún no se han usado emotes en esta sesión.');
            return;
        }

        const parts = topEmotes.map((e, i) => {
            const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : '🥉');
            return `${medal} ${e.name} (${e.count})`;
        });
        
        const message = `🔥 Emotes Trending: ${parts.join(' | ')}`;
        
        EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, message);
    }
}
