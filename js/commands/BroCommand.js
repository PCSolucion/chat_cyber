import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

export default class BroCommand extends BaseCommand {
    constructor() {
        super('bro', {
            aliases: ['bros'],
            description: 'Muestra cuántas veces has dicho "bro"'
        });
    }

    execute({ userId, username, services }) {
        if (!services.achievements) return;

        // Comprobamos si el usuario está preguntando por sus propios "bros" o el total global (si tuvieramos)
        // Por ahora lo hacemos personal como los otros comandos. Pasamos null como ID.
        const stats = services.achievements.getUserStats(null, username);
        const broCount = stats.broCount || 0;

        const message = `@${username} -> Has dicho "bro" ${broCount} veces. Bro...`;
        EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, message);
    }
}
