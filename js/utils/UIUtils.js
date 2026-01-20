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
     * Escapa caracteres HTML para prevenir XSS
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

    /**
     * Efecto de desencriptación/scramble de texto
     * - Revela el texto carácter por carácter
     * - Usa caracteres aleatorios durante la revelación
     * 
     * @param {HTMLElement} element - Elemento DOM donde aplicar el efecto
     * @param {string} finalText - Texto final a mostrar
     * @param {number} speed - Velocidad del efecto (ms entre frames)
     */
    scrambleText(element, finalText, speed = 30) {
        // Si el texto es muy corto, mostrarlo directamente
        if (finalText.length < 2) {
            element.innerHTML = `"${finalText}"`;
            return;
        }

        let iteration = 0;
        const chars = '!<>-_\\/[]{}—=+*^?#________'; // Caracteres "tecno"

        // Limpiar intervalo anterior si existe
        if (element.interval) {
            clearInterval(element.interval);
        }

        element.interval = setInterval(() => {
            element.innerText = '"' + finalText
                .split("")
                .map((letter, index) => {
                    if (index < iteration) {
                        return finalText[index];
                    }
                    return chars[Math.floor(Math.random() * chars.length)];
                })
                .join("") + '"';

            if (iteration >= finalText.length) {
                clearInterval(element.interval);
                element.innerHTML = `"${finalText}"`;
            }

            iteration += 1 / 2; // Velocidad de revelado
        }, speed);
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
     * Verifica si un texto procesado contiene imágenes HTML
     * @param {string} html - HTML a verificar
     * @returns {boolean} true si contiene <img>
     */
    hasImages(html) {
        return html.includes('<img');
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
    }
};

// Auto-inicializar el ecualizador cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    UIUtils.initEqualizer('equalizer', 20);
});

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIUtils;
}
