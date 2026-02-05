/**
 * BaseCommand - Clase base para todos los comandos del chat
 */
export default class BaseCommand {
    constructor(name, aliases = [], requiredPermission = 'everyone') {
        this.name = name;
        this.aliases = aliases;
        this.requiredPermission = requiredPermission; // everyone, subscriber, vip, moderator, broadcaster
    }

    /**
     * Verifica si el mensaje invoca este comando
     * @param {string} commandName - El nombre del comando extraído del mensaje (sin !)
     */
    matches(commandName) {
        return this.name === commandName || this.aliases.includes(commandName);
    }

    /**
     * Ejecuta la lógica del comando
     * @param {Object} context - { username, args, services, message }
     */
    execute(context) {
        throw new Error('Method execute() must be implemented');
    }
}
