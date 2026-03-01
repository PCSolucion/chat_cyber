import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import Logger from '../utils/Logger.js';

export default class ShoutoutCommand extends BaseCommand {
    constructor() {
        super('so', {
            aliases: ['shoutout', 'streamer'],
            requiredPermission: 'moderator',
            description: 'Envía un grito (shoutout) a otro streamer'
        });
    }

    async execute({ args }) {
        if (!args || args.length === 0) return;

        // Limpiar nombre de usuario (quitar @ si existe)
        let targetUser = args[0].replace('@', '');
        
        if (!targetUser) return;

        try {
            // Obtener el juego/categoría del streamer objetivo
            const response = await fetch(`https://decapi.me/twitch/game/${targetUser}`);
            let game = 'Desconocido';
            
            if (response.ok) {
                const text = await response.text();
                game = text.trim();
                if (game.includes('No channel found')) {
                    // Si el usuario no existe
                    return; 
                }
            }

            const message = `📢 ¡Seguid a este crack! twitch.tv/${targetUser} (Último juego: ${game}) - ¡Dadle amor! 💜`;
            EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, message);

        } catch (error) {
            Logger.error('ShoutoutCommand', 'Error executing !so:', error);
        }
    }
}
