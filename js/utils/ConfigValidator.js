import Logger from './Logger.js';
import { TIMING, IDLE } from '../constants/AppConstants.js';

/**
 * ConfigValidator - Validador de Integridad de la Configuración
 * 
 * Se encarga de verificar que el archivo config.js tenga todos los campos
 * necesarios para que la aplicación funcione sin errores fatales.
 */
export default class ConfigValidator {
    /**
     * Esquema de validación
     * @private
     */
    static get SCHEMA() {
        return {
            // Campos Críticos (Si faltan, la app falla)
            TWITCH_CHANNEL: { required: true, type: 'string', description: 'Canal de Twitch' },
            XP_GIST_ID: { required: true, type: 'string', description: 'ID del Gist de GitHub' },
            XP_GIST_TOKEN: { required: true, type: 'string', description: 'Token de acceso de GitHub' },
            
            // Campos Importantes con valores por defecto
            BROADCASTER_USERNAME: { required: false, type: 'string', default: 'liiukiin' },
            MESSAGE_DISPLAY_TIME: { required: false, type: 'number', default: TIMING.MESSAGE_DISPLAY_TIME_MS },
            IDLE_TIMEOUT_MS: { required: false, type: 'number', default: IDLE.DEFAULT_TIMEOUT_MS },
            IDLE_ROTATION_MS: { required: false, type: 'number', default: IDLE.DEFAULT_ROTATION_MS },
            ANIMATION_COOLDOWN_MS: { required: false, type: 'number', default: TIMING.ANIMATION_COOLDOWN_MS },
            
            // Estructuras anidadas
            UI: { 
                required: false, 
                type: 'object', 
                default: { RANK_ICONS: {}, SPECIAL_ICONS: {}, USER_THEMES: {} } 
            },
            ACCESSIBILITY: {
                required: false,
                type: 'object',
                default: { ENABLE_ARIA: true, ENABLE_SCREEN_READER: false }
            }
        };
    }

    /**
     * Ejecuta la validación completa
     * @param {Object} config - Configuración a validar
     * @returns {Object} Configuración saneada
     */
    static validate(config) {
        const errors = [];
        const warnings = [];
        const sanitized = { ...config };
        
        Logger.info('System', '🔍 Verificando integridad de configuración...');

        for (const [key, rules] of Object.entries(this.SCHEMA)) {
            const value = config[key];

            // 1. Verificar presencia de campos obligatorios
            if (rules.required) {
                if (value === undefined || value === null || value === '' || 
                    value === 'TU_GIST_ID_AQUI' || value === 'TU_TOKEN_AQUI' || value === 'tu_canal_aqui') {
                    errors.push(`Falta campo CRÍTICO: ${key} (${rules.description || ''})`);
                    continue;
                }
            }

            // 2. Aplicar valores por defecto si faltan
            if (value === undefined || value === null) {
                if (rules.default !== undefined) {
                    sanitized[key] = rules.default;
                    warnings.push(`Campo '${key}' ausente. Usando valor por defecto: ${JSON.stringify(rules.default)}`);
                }
            } else {
                // 3. Verificar tipo de dato
                if (typeof value !== rules.type) {
                    warnings.push(`Tipo de dato incorrecto para '${key}'. Se esperaba ${rules.type}, se recibió ${typeof value}.`);
                }
            }
        }

        // Reportar resultados
        if (warnings.length > 0) {
            warnings.forEach(w => Logger.warn('Config', w));
        }

        if (errors.length > 0) {
            errors.forEach(e => Logger.error('Config', e));
            this._displayFatalError(errors);
            return sanitized; // Retornamos lo que tenemos, pero la app probablemente fallará
        }

        Logger.info('System', '✅ Configuración validada correctamente.');
        return sanitized;
    }

    /**
     * Muestra un error fatal visualmente si es posible
     * @private
     */
    static _displayFatalError(errors) {
        console.error('%c 🛑 ERROR DE CONFIGURACIÓN FATAL ', 'background: red; color: white; font-size: 20px;');
        errors.forEach(e => console.error(`- ${e}`));
        
        // Intentar mostrar en el body después de un pequeño delay
        setTimeout(() => {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(20, 0, 0, 0.9); color: #ff0055; 
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                z-index: 99999; font-family: 'Courier New', monospace; padding: 20px;
                border: 5px solid #ff0055; text-transform: uppercase;
            `;
            
            errorDiv.innerHTML = `
                <h1 style="font-size: 30px; margin-bottom: 20px;">[ CONFIGURATION FATAL ERROR ]</h1>
                <div style="background: #000; padding: 20px; border: 1px solid #ff0055; max-width: 800px;">
                    ${errors.map(e => `<p style="margin: 10px 0;">> ${e}</p>`).join('')}
                </div>
                <p style="margin-top: 30px; color: #fff;">Please update your <b>js/config.js</b> and reload the page.</p>
            `;
            
            document.body.appendChild(errorDiv);
        }, 1000);
    }
}
