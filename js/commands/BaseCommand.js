/**
 * BaseCommand - Clase base para todos los comandos del chat
 */
export default class BaseCommand {
    constructor(name, params = {}) {
        this.name = name;
        this.aliases = params.aliases || [];
        this.requiredPermission = params.requiredPermission || 'everyone'; // everyone, subscriber, vip, moderator, broadcaster
        this.cooldown = params.cooldown || 5000; // Cooldown por defecto de 5s
        this.description = params.description || '';
        
        // Registro de último uso por usuario (para cooldown personal)
        this.lastUsed = new Map();
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
