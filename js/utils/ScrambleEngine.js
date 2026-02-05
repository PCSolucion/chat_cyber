/**
 * ScrambleEngine - Motor de animación de texto "Cyberpunk Scramble"
 * 
 * Centraliza y optimiza el efecto de descifrado de texto usando requestAnimationFrame.
 * Reemplaza las implementaciones basadas en setInterval para mejor rendimiento y control.
 * 
 * @class ScrambleEngine
 */
class ScrambleEngine {
    constructor() {
        this.activeAnimations = new Map();
        this.characters = '!<>-_\\/[]{}—=+*^?#________';
    }

    /**
     * Aplica el efecto de scramble a un elemento
     * 
     * @param {HTMLElement} element - El elemento DOM
     * @param {string} text - El texto final
     * @param {Object} options - Opciones de configuración
     */
    scramble(element, text, options = {}) {
        const {
            speed = 1,           // Factor de velocidad (mayor = más lento)
            revealSpeed = 0.5,   // Cuántos caracteres se revelan por frame (aprox)
            addQuotes = false,
            onComplete = null,
            scrambleChars = this.characters
        } = options;

        // Limpiar animación previa si existe en este elemento
        this.cancel(element);

        const quote = addQuotes ? '"' : '';
        
        // Estado de la animación
        const state = {
            text: text,
            frame: 0,
            iteration: 0,
            element: element,
            quote: quote,
            chars: scrambleChars,
            revealSpeed: revealSpeed,
            onComplete: onComplete,
            lastUpdate: 0
        };

        const animate = (timestamp) => {
            if (!this.activeAnimations.has(element)) return;

            // Control de frames (throttle si es necesario, pero rAF es 60fps)
            // Aquí simplemente aumentamos la iteración basada en revealSpeed
            
            const content = quote + text
                .split('')
                .map((letter, index) => {
                    if (index < state.iteration) {
                        return text[index];
                    }
                    return state.chars[Math.floor(Math.random() * state.chars.length)];
                })
                .join('') + quote;

            element.innerText = content;

            if (state.iteration >= text.length) {
                // Finalizar
                element.innerHTML = `${quote}${text}${quote}`;
                this.activeAnimations.delete(element);
                if (onComplete) onComplete();
                return;
            }

            state.iteration += revealSpeed;
            state.frame = requestAnimationFrame(animate);
        };

        state.frame = requestAnimationFrame(animate);
        this.activeAnimations.set(element, state);
    }

    /**
     * Cancela una animación activa en un elemento
     * @param {HTMLElement} element 
     */
    cancel(element) {
        if (this.activeAnimations.has(element)) {
            const state = this.activeAnimations.get(element);
            cancelAnimationFrame(state.frame);
            this.activeAnimations.delete(element);
        }
    }
}

// Exportar instancia única
const scrambleEngine = new ScrambleEngine();
export default scrambleEngine;
