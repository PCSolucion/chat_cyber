/**
 * FXManager - Motor de Efectos Visuales para el Widget
 * 
 * Centraliza las animaciones y efectos especiales técnicos para mantener
 * una identidad visual coherente y facilitar su reutilización.
 */
class FXManager {
    constructor() {
        this.chars = "!<>-_\\/[]{}—=+*^?#0123456789";
    }

    /**
     * Efecto de descifrado (scramble) para texto
     * @param {HTMLElement} element - Elemento que contiene el texto
     * @param {string} finalText - El texto final que se desea mostrar
     * @param {number} duration - Duración total de la animación en ms
     */
    scramble(element, finalText, duration = 800) {
        if (!element) return;
        
        const start = Date.now();
        const originalText = finalText || element.innerText;
        
        const update = () => {
            const timePassed = Date.now() - start;
            const progress = timePassed / duration;
            
            if (progress < 1) {
                let currentText = "";
                for (let i = 0; i < originalText.length; i++) {
                    // Los espacios se mantienen, los caracteres cambian aleatoriamente
                    // según el progreso de la animación
                    if (originalText[i] === " " || Math.random() < progress) {
                        currentText += originalText[i];
                    } else {
                        currentText += this.chars[Math.floor(Math.random() * this.chars.length)];
                    }
                }
                element.innerText = currentText;
                requestAnimationFrame(update);
            } else {
                element.innerText = originalText;
            }
        };
        
        update();
    }

    /**
     * Crea partículas de bits de datos flotantes
     * @param {HTMLElement} parent - Contenedor donde se crearán las partículas
     * @param {Object} options - Opciones de personalización
     */
    createDataParticles(parent, options = {}) {
        if (!parent) return;
        
        const count = options.count || 20;
        const colorPrimary = options.color || '#00f0ff';
        const colorSecondary = options.secondaryColor || '#ffffff';
        
        for (let i = 0; i < count; i++) {
            const bit = document.createElement('div');
            bit.className = 'data-bit';
            
            // Posición inicial (centrada con algo de aleatoriedad)
            const x = (options.startX !== undefined) ? options.startX : 50 + (Math.random() - 0.5) * 100;
            const y = (options.startY !== undefined) ? options.startY : 40 + (Math.random() - 0.5) * 40;
            
            // Vector de movimiento final
            const tx = (Math.random() - 0.5) * (options.spreadX || 200);
            const ty = (Math.random() - 0.5) * (options.spreadY || 150);
            
            const size = Math.random() * 3 + 2;
            const duration = 1000 + Math.random() * 1000;
            const color = Math.random() > 0.5 ? colorPrimary : colorSecondary;
            
            bit.style.position = 'absolute';
            bit.style.left = `${x}%`;
            bit.style.top = `${y}%`;
            bit.style.width = `${size}px`;
            bit.style.height = `${size}px`;
            bit.style.background = color;
            bit.style.boxShadow = `0 0 5px ${color}`;
            bit.style.zIndex = '100';
            bit.style.pointerEvents = 'none';
            bit.style.setProperty('--tx', `${tx}px`);
            bit.style.setProperty('--ty', `${ty}px`);
            
            // La animación 'bit-float' debe estar definida en el CSS global
            bit.style.animation = `bit-float ${duration}ms ease-out forwards`;
            
            parent.appendChild(bit);
            
            // Cleanup automático
            setTimeout(() => {
                if (bit.parentNode) parent.removeChild(bit);
            }, duration + 100);
        }
    }

    /**
     * Añade un efecto visual transient de "glitch"
     * @param {HTMLElement} element 
     * @param {number} duration 
     */
    glitch(element, duration = 500) {
        if (!element) return;
        
        element.classList.add('fx-glitch');
        
        setTimeout(() => {
            element.classList.remove('fx-glitch');
        }, duration);
    }
}

// Exportamos una instancia única (Singleton)
export default new FXManager();
