import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import Logger from '../utils/Logger.js';

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
                Logger.debug('Command', `Command execution: !${ctx.commandName} by ${ctx.username}`);
            }
            next();
        });

        // Middleware de Cooldown (Anti-Spam)
        this.addMiddleware((ctx, next) => {
            const now = Date.now();
            const lastUsed = ctx.command.lastUsed.get(ctx.username) || 0;
            const cooldown = ctx.command.cooldown || 5000;

            if (now - lastUsed < cooldown) {
                const remaining = Math.ceil((cooldown - (now - lastUsed)) / 1000);
                if (this.config.DEBUG) {
                    Logger.debug('Command', `Cooldown active for !${ctx.commandName} (${remaining}s remaining for ${ctx.username})`);
                }
                return; // Bloquear ejecución silenciosamente
            }

            // Actualizar último uso antes de ejecutar
            ctx.command.lastUsed.set(ctx.username, now);
            next();
        });

        // Middleware de Permisos
        this.addMiddleware((ctx, next) => {
            if (this.checkPermissions(ctx.tags, ctx.command.requiredPermission)) {
                next();
            } else {
                Logger.warn('Command', `Access denied for !${ctx.commandName} (User: ${ctx.username}, Required: ${ctx.command.requiredPermission})`);
            }
        });
    }

    _setupEventListeners() {
        EventManager.on(EVENTS.CHAT.MESSAGE_RECEIVED, (data) => {
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
            userId: tags?.['user-id'], // El ID numérico de Twitch
            args,
            tags,
            message,
            services: this.services,
            config: this.config,
            manager: this // Pasar referencia al manager para comandos como !ayuda
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
                    console.log(`[CommandManager] 🛠️ Executing command: !${commandName} for ${context.username}`);
                    await command.execute(context);
                } catch (error) {
                    console.error(`❌ Error executing command !${commandName}:`, error);
                    // Emitir error visual para el usuario
                    EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, `⚠️ ERROR: !${commandName} could not be executed.`);
                }
            }
        };

        await next();
    }
}
