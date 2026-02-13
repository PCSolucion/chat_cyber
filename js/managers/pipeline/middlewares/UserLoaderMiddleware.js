import Logger from '../../../utils/Logger.js';

/**
 * UserLoaderMiddleware - Asegura que los datos del usuario estén en memoria
 * antes de pasarlos al resto de la tubería.
 */
export default class UserLoaderMiddleware {
    constructor(stateManager) {
        this.stateManager = stateManager;
    }

    async execute(ctx, next) {
        if (!this.stateManager) return next();

        try {
            // Intentar precargar el usuario (On-Demand)
            // ctx.userId es el ID numérico de Twitch
            const loaded = await this.stateManager.ensureUserLoaded(ctx.userId, ctx.username);
            
            if (!loaded) {
                Logger.warn('Pipeline', `⚠️ Saltando mensaje: No se pudo verificar la identidad de ${ctx.username}`);
                return; // Detener ejecución de este mensaje
            }
        } catch (error) {
            Logger.error('Pipeline', `❌ ABORTANDO: Error crítico cargando usuario ${ctx.username}.`, error);
            return; // DETENER: No procesar para evitar inconsistencias (Nivel 1, etc)
        }

        // Continuar con el siguiente middleware (ahora el usuario está en memoria)
        await next();
    }
}
