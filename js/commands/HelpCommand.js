import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';

export default class HelpCommand extends BaseCommand {
    constructor() {
        super('ayuda', ['commands', 'comandos', 'help']);
    }

    execute({ username }) {
        const commands = [
            '!nivel (XP/Rank)',
            '!top (Leaderboard)',
            '!logros (Tus logros)',
            '!stats (Tus datos sesión)',
            '!emotes (Top Emotes)',
            '!racha (Días seguidos)',
            '!bro (Contador Bro)',
            '!uptime (Tiempo directo)'
        ];
        
        const message = `@${username} -> Comandos: ${commands.join(', ')}`;
        EventManager.emit('ui:systemMessage', message);
    }
}
