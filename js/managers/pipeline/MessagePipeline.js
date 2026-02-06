import Logger from '../../utils/Logger.js';

/**
 * MessagePipeline - Ejecutor secuencial de lógica de mensajes
 * 
 * Permite procesar un mensaje a través de una serie de pasos (middlewares)
 * independientes, facilitando la mantenibilidad y escalabilidad.
 */
export default class MessagePipeline {
    constructor() {
        this.middlewares = [];
    }

    /**
     * Añade un paso al pipeline
     * @param {string} name - Nombre descriptivo
     * @param {Function} middleware - Función (context, next) => Promise|void
     */
    use(name, middleware) {
        this.middlewares.push({ name, execute: middleware });
        return this;
    }

    /**
     * Ejecuta el pipeline para un mensaje
     * @param {Object} context - Objeto compartido entre pasos
     */
    async run(context) {
        let index = 0;

        const next = async () => {
            if (index < this.middlewares.length) {
                const middleware = this.middlewares[index++];
                try {
                    // Si el middleware es asíncrono, esperamos. 
                    // Si no, la ejecución sigue siendo secuencial.
                    await middleware.execute(context, next);
                } catch (error) {
                    Logger.error('Pipeline', `Error en paso [${middleware.name}]:`, error);
                    // En caso de error, intentamos seguir con el resto
                    await next();
                }
            }
        };

        await next();
    }
}
