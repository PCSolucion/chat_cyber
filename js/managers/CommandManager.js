import EventManager from '../utils/EventEmitter.js';

/**
 * CommandManager - Gestión modular de comandos de chat
 */
export default class CommandManager {
    constructor(services, config) {
        this.services = services;
        this.config = config;
        this.commands = new Map();
        this.middlewares = [];

        this._setupEventListeners();
        this._registerDefaultMiddlewares();
    }

    /**
     * Registra múltiples comandos
     * @param {BaseCommand[]} commands 
     */
    registerAll(commands) {
        commands.forEach(cmd => this.registerCommand(cmd));
    }

    /**
     * Registra un comando en el sistema
     * @param {BaseCommand} commandInstance 
     */
    registerCommand(commandInstance) {
        this.commands.set(commandInstance.name.toLowerCase(), commandInstance);
        
        if (commandInstance.aliases) {
            commandInstance.aliases.forEach(alias => {
                this.commands.set(alias.toLowerCase(), commandInstance);
            });
        }
    }

    /**
     * Añade un middleware al flujo de ejecución de comandos
     * @param {Function} middlewareFn - (ctx, next) => { ... }
     */
    addMiddleware(middlewareFn) {
        this.middlewares.push(middlewareFn);
    }

    _registerDefaultMiddlewares() {
        // Middleware de Logging
        this.addMiddleware((ctx, next) => {
            if (this.config.DEBUG) {
                console.log(`⚡ Command execution: !${ctx.commandName} by ${ctx.username}`);
            }
            next();
        });

        // Middleware de Permisos
        this.addMiddleware((ctx, next) => {
            if (this.checkPermissions(ctx.tags, ctx.command.requiredPermission)) {
                next();
            } else {
                console.warn(`🚫 Access denied for !${ctx.commandName} (User: ${ctx.username}, Required: ${ctx.command.requiredPermission})`);
            }
        });
    }

    _setupEventListeners() {
        EventManager.on('chat:messageReceived', (data) => {
            this.handleMessage(data);
        });
    }

    /**
     * Verifica si un usuario tiene permisos para ejecutar un comando
     */
    checkPermissions(tags, required) {
        if (!required || required === 'everyone') return true;
        if (!tags) return false;

        const isBroadcaster = tags.badges?.broadcaster === '1';
        const isMod = tags.mod || isBroadcaster;
        const isVip = tags.badges?.vip === '1' || isMod;
        const isSubscriber = tags.subscriber || isVip;

        switch (required) {
            case 'broadcaster': return isBroadcaster;
            case 'moderator': return isMod;
            case 'vip': return isVip;
            case 'subscriber': return isSubscriber;
            default: return true;
        }
    }

    async handleMessage({ username, message, tags }) {
        if (!message.startsWith('!')) return;

        const args = message.slice(1).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();
        const command = this.commands.get(commandName);

        if (!command) return;

        // Crear contexto de ejecución
        const context = {
            command,
            commandName,
            username,
            args,
            tags,
            message,
            services: this.services,
            config: this.config
        };

        // Ejecutar cadena de middlewares
        let index = 0;
        const next = async () => {
            if (index < this.middlewares.length) {
                const middleware = this.middlewares[index++];
                await middleware(context, next);
            } else {
                // Ejecución final del comando
                try {
                    await command.execute(context);
                } catch (error) {
                    console.error(`❌ Error executing command !${commandName}:`, error);
                }
            }
        };

        await next();
    }
}
