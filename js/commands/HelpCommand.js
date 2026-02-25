import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

export default class HelpCommand extends BaseCommand {
    constructor() {
        super('ayuda', {
            aliases: ['commands', 'comandos', 'help'],
            description: 'Muestra los comandos disponibles'
        });
    }

    execute({ username, manager }) {
        // Obtener comandos únicos (evitar duplicados por alias)
        const uniqueCommands = Array.from(new Set(manager.commands.values()));
        
        const commandList = uniqueCommands
            .filter(cmd => cmd.requiredPermission === 'everyone') // Solo mostrar comunes
            .map(cmd => `!${cmd.name}`)
            .join(', ');
        
        const message = `@${username} -> Comandos: ${commandList}`;
        EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, message);
    }
}
