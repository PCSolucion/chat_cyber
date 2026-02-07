import CONFIG from '../config.js';
import ScrambleEngine from './ScrambleEngine.js';

/**
 * UIUtils - Utilidades para la Interfaz de Usuario
 * 
 * Funciones auxiliares para:
 * - Procesamiento de texto
 * - Sanitización HTML
 * - Efectos visuales
 * - Procesamiento de emotes
 * 
 * @namespace UIUtils
 */
const UIUtils = {
    /**
     * Escapa caracteres HTML para prevenir XSS de forma eficiente
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    escapeHTML(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    /**
     * Procesa los emotes de Twitch en un mensaje
     * - Reemplaza IDs de emotes con imágenes
     * - Mantiene el texto escapado para seguridad
     * - También procesa emotes de terceros (7TV, BTTV, FFZ) si están disponibles
     * 
     * @param {string} text - Texto del mensaje
     * @param {Object} emotes - Objeto de emotes de Twitch (tags.emotes)
     * @param {string} emoteSize - Tamaño de los emotes (ej: '1.2em')
     * @returns {string} HTML con emotes procesados
     */
    /**
     * Procesa los emotes de Twitch en un mensaje
     * - Reemplaza IDs de emotes con imágenes
     * - Mantiene el texto escapado para seguridad
     * - También procesa emotes de terceros (7TV, BTTV, FFZ) si están disponibles
     * 
     * @param {string} text - Texto del mensaje
     * @param {Object} emotes - Objeto de emotes de Twitch (tags.emotes)
     * @param {Object} [thirdPartyService] - Servicio de emotes de terceros (opcional)
     * @param {string} emoteSize - Tamaño de los emotes (ej: '1.2em')
     * @returns {string} HTML con emotes procesados
     */
    processEmotes(text, emotes, thirdPartyService, emoteSize = '1.2em') {
        let result = text;

        // Primero procesar emotes de Twitch
        if (emotes) {
            try {
                let splitText = text.split('');
                let emoteReplacements = [];

                // Recopilar todas las posiciones de emotes
                Object.entries(emotes).forEach(([emoteId, positions]) => {
                    positions.forEach(pos => {
                        const [start, end] = pos.split('-').map(Number);
                        emoteReplacements.push({ start, end, id: emoteId });
                    });
                });

                // Ordenar de mayor a menor para reemplazar sin afectar índices
                emoteReplacements.sort((a, b) => b.start - a.start);

                // Reemplazar emotes con imágenes
                emoteReplacements.forEach(({ start, end, id }) => {
                    const emoteImg = `<img src="https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0" alt="emote" class="emote-img" style="height:${emoteSize};vertical-align:middle;">`;
                    splitText.splice(start, end - start + 1, emoteImg);
                });

                // Escapar caracteres que no son emotes
                result = splitText.map(char => {
                    return char.startsWith('<img') ? char : this.escapeHTML(char);
                }).join('');

            } catch (error) {
                console.error('Error al procesar emotes de Twitch:', error);
                result = this.escapeHTML(text);
            }
        } else {
            result = this.escapeHTML(text);
        }

        // Luego procesar emotes de terceros (7TV, BTTV, FFZ)
        if (thirdPartyService && thirdPartyService.isLoaded) {
            try {
                result = thirdPartyService.processThirdPartyEmotes(result, emoteSize);
            } catch (error) {
                console.error('Error al procesar emotes de terceros:', error);
            }
        }

        return result;
    },

    scrambleText(element, finalText, speed = 30, addQuotes = true, onComplete = null) {
        // La velocidad en ScrambleEngine se controla por revealSpeed (caracteres por frame)
        // Mapeamos el 'speed' de 30ms (un frame de reveal cada 30ms aprox) a revealSpeed
        // frames por segundo = 60. 30ms interval = ~33hz. revealSpeed = 0.3 aprox.
        const mappedRevealSpeed = Math.max(0.1, 10 / speed);

        ScrambleEngine.scramble(element, finalText, {
            revealSpeed: mappedRevealSpeed,
            addQuotes: addQuotes,
            onComplete: onComplete
        });
    },

    /**
     * Limpia un nombre de usuario para mostrar
     * - Convierte a mayúsculas
     * - Aplica transformaciones especiales para ciertos usuarios
     * 
     * @param {string} username - Nombre de usuario original
     * @returns {string} Nombre procesado
     */
    cleanUsername(username) {
        let upperUsername = username.toUpperCase();

        // Transformaciones especiales
        const transformations = {
            'C_H_A_N_D_A_L_F': 'CHANDALF'
        };

        return transformations[upperUsername] || upperUsername;
    },

    /**
     * Formatea un nombre de usuario para mostrarlo (Capitalize)
     * @param {string} username 
     * @returns {string}
     */
    formatUsername(username) {
        if (!username) return '';
        return username.charAt(0).toUpperCase() + username.slice(1);
    },

    /**
     * Formatea una duración en milisegundos a texto legible (Xh Ym Zs)
     * @param {number} ms - Milisegundos
     * @returns {string} Texto formateado
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    },

    /**
     * Formatea un número con separadores de miles
     * @param {number} num 
     * @returns {string}
     */
    formatNumber(num) {
        return new Intl.NumberFormat('es-ES').format(num);
    },

    /**
     * Formatea una fecha/timestamp a HH:MM
     * @param {Date|number} date 
     * @returns {string}
     */
    formatClockTime(date) {
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    },

    /**
     * Verifica si un texto procesado contiene imágenes HTML
     * @param {string} html - HTML a verificar
     * @returns {boolean} true si contiene <img>
     */
    hasImages(html) {
        return html.includes('<img');
    },

    /**
     * Detecta si un mensaje procesado contiene SOLO emotes (sin texto)
     * Funciona con emotes de Twitch (class="emote-img") y 
     * de terceros como 7TV, BTTV, FFZ (class="emote-img emote-3p")
     * 
     * @param {string} html - HTML procesado del mensaje
     * @returns {Object} { isEmoteOnly: boolean, emoteCount: number }
     */
    isEmoteOnlyMessage(html) {
        // Regex para detectar cualquier emote (Twitch o terceros)
        // Ambos usan class="emote-img..." 
        const emoteRegex = /<img[^>]*class="emote-img[^"]*"[^>]*>/gi;

        // Remover todas las imágenes de emotes temporalmente
        const withoutEmotes = html.replace(emoteRegex, '');

        // Verificar si queda solo espacios o nada
        const hasOnlyWhitespace = withoutEmotes.trim() === '';

        // Contar emotes
        const emoteMatches = html.match(emoteRegex);
        const emoteCount = emoteMatches ? emoteMatches.length : 0;

        return {
            isEmoteOnly: hasOnlyWhitespace && emoteCount > 0,
            emoteCount: emoteCount
        };
    },

    /**
     * Inicializa el ecualizador generando las barras dinámicamente
     * Esto evita tener 40+ líneas de HTML repetitivo
     * 
     * @param {string} containerId - ID del contenedor del ecualizador
     * @param {number} barCount - Número de barras a generar (default: 20)
     */
    initEqualizer(containerId = 'equalizer', barCount = 20) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`⚠️ Equalizer container #${containerId} not found`);
            return;
        }

        // Limpiar contenido previo
        container.innerHTML = '';

        // Crear barras con delays de animación variados
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'bar';

            // Delay aleatorio entre 0 y 0.25s para efecto más orgánico
            const delay = (Math.random() * 0.25).toFixed(3);
            bar.style.animationDelay = `${delay}s`;

            fragment.appendChild(bar);
        }

        container.appendChild(fragment);

        if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG) {
            console.log(`🎵 Equalizer initialized with ${barCount} bars`);
        }
    },
    /**
     * Anima un valor numérico contando hacia arriba
     * @param {string} elementId ID del elemento DOM
     * @param {number} start Valor inicial
     * @param {number} end Valor final
     * @param {number} duration Duración de la animación
     */
    animateValue(elementId, start, end, duration) {
        const obj = document.getElementById(elementId);
        if (!obj) return;
        
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Easing easeOutExpo
            const ease = (progress === 1) ? 1 : 1 - Math.pow(2, -10 * progress);
            
            obj.textContent = Math.floor(ease * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                 obj.textContent = end; // Ensure final value
            }
        };
        window.requestAnimationFrame(step);
    }
};



export default UIUtils;
