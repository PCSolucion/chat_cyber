/**
 * LanguageFilterMiddleware - Filtra mensajes en idiomas no permitidos
 */
export default class LanguageFilterMiddleware {
    constructor(config) {
        this.config = config;
        // Regex para detectar caracteres fuera de los rangos latinos básicos y símbolos comunes
        this.foreignScriptRegex = /[^\u0000-\u024F\u2000-\u206F\u2E00-\u2E7F\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{2700}-\u{27BF}\u{1F000}-\u{1Faff}\s]/u;
    }

    execute(ctx, next) {
        if (!this.config.LANGUAGE_FILTER_ENABLED) return next();

        if (this.foreignScriptRegex.test(ctx.message)) {
            return; // Bloqueado, no llamar a next()
        }
        next();
    }
}
