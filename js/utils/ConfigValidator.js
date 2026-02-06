import Logger from './Logger.js';
import { DEFAULTS } from '../constants/AppConstants.js';

/**
 * ConfigValidator - Validador de Integridad de la Configuración
 * 
 * Se encarga de verificar que el archivo config.js tenga todos los campos
 * necesarios para que la aplicación funcione sin errores fatales.
 * Ahora integra un sistema de valores por defecto (DEFAULTS).
 */
export default class ConfigValidator {
    /**
     * Esquema de validación
     * Define qué campos son obligatorios y sus tipos.
     * @private
     */
    static get SCHEMA() {
        return {
            // Campos Críticos (Si faltan, la app falla)
            TWITCH_CHANNEL: { required: true, type: 'string', description: 'Canal de Twitch' },
            XP_GIST_ID: { required: true, type: 'string', description: 'ID del Gist de GitHub' },
            XP_GIST_TOKEN: { required: true, type: 'string', description: 'Token de acceso de GitHub' },
            
            // La mayoría de los otros campos ahora se toman de DEFAULTS si no están presentes
            BROADCASTER_USERNAME: { required: false, type: 'string' },
            MESSAGE_DISPLAY_TIME: { required: false, type: 'number' },
            IDLE_TIMEOUT_MS: { required: false, type: 'number' },
            IDLE_ROTATION_MS: { required: false, type: 'number' },
            ANIMATION_COOLDOWN_MS: { required: false, type: 'number' },
            XP_SYSTEM_ENABLED: { required: false, type: 'boolean' },
            THIRD_PARTY_EMOTES_ENABLED: { required: false, type: 'boolean' },
            
            // Estructuras anidadas
            UI: { required: false, type: 'object' },
            ACCESSIBILITY: { required: false, type: 'object' }
        };
    }

    /**
     * Ejecuta la validación y el merge con defaults
     * @param {Object} userConfig - Configuración proporcionada por el usuario
     * @returns {Object} Configuración final validada y completada con defaults
     */
    static validate(userConfig) {
        const errors = [];
        const warnings = [];
        
        Logger.info('System', '🔍 Verificando integridad de configuración...');

        // 1. Validar campos críticos primero
        for (const [key, rules] of Object.entries(this.SCHEMA)) {
            const value = userConfig[key];

            if (rules.required) {
                if (!value || value === '' || value.includes('_AQUI') || value.includes('tu_')) {
                    errors.push(`Falta campo CRÍTICO: ${key} (${rules.description || ''})`);
                }
            }
        }

        // 2. Realizar Deep Merge: DEFAULTS <- userConfig
        const finalConfig = this._deepMerge(DEFAULTS, userConfig);

        // 3. Validar tipos de los campos resultantes (opcional, para avisos)
        for (const [key, rules] of Object.entries(this.SCHEMA)) {
            const value = finalConfig[key];
            if (value !== undefined && typeof value !== rules.type && rules.type) {
                warnings.push(`Tipo de dato inusual en '${key}'. Se esperaba ${rules.type}, se tiene ${typeof value}.`);
            }
        }

        // Reportar resultados
        if (warnings.length > 0) {
            warnings.forEach(w => Logger.warn('Config', w));
        }

        if (errors.length > 0) {
            errors.forEach(e => Logger.error('Config', e));
            this._displayFatalError(errors);
            return finalConfig; 
        }

        Logger.info('System', '✅ Configuración validada y combinada con éxito.');
        return finalConfig;
    }

    /**
     * Realiza un merge profundo de dos objetos
     * @private
     */
    static _deepMerge(target, source) {
        const output = { ...target };
        if (this._isObject(target) && this._isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this._isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this._deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    static _isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    /**
     * Muestra un error fatal visualmente si es posible
     * @private
     */
    static _displayFatalError(errors) {
        console.error('%c 🛑 ERROR DE CONFIGURACIÓN FATAL ', 'background: red; color: white; font-size: 20px;');
        errors.forEach(e => console.error(`- ${e}`));
        
        setTimeout(() => {
            const errorDiv = document.createElement('div');
            errorDiv.id = 'fatal-config-error';
            errorDiv.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(20, 0, 0, 0.95); color: #ff0055; 
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                z-index: 100000; font-family: 'Courier New', monospace; padding: 20px;
                border: 5px solid #ff0055; text-transform: uppercase;
            `;
            
            errorDiv.innerHTML = `
                <h1 style="font-size: 30px; margin-bottom: 20px;">[ CONFIGURATION FATAL ERROR ]</h1>
                <div style="background: #000; padding: 20px; border: 1px solid #ff0055; max-width: 800px; text-align: left;">
                    ${errors.map(e => `<p style="margin: 10px 0;">> ${e}</p>`).join('')}
                </div>
                <p style="margin-top: 30px; color: #fff;">Por favor, actualiza tu archivo <b>js/config.js</b> con los datos correctos.</p>
                <p style="color: #666; font-size: 12px; margin-top: 10px;">Asegúrate de configurar tu Canal de Twitch y el Token de GitHub Gist.</p>
            `;
            
            document.body.appendChild(errorDiv);
        }, 500);
    }
}

