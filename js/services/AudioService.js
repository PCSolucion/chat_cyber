/**
 * AudioService - Servicio de Gestión de Audio
 * 
 * Responsabilidades:
 * - Inicializar elementos de audio
 * - Reproducir sonidos de notificación
 * - Gestionar errores de reproducción
 * - Controlar volumen
 * 
 * @class AudioService
 */
class AudioService {
    /**
     * Constructor del servicio de audio
     * @param {string} audioUrl - URL del archivo de audio
     * @param {number} volume - Volumen inicial (0.0 a 1.0)
     */
    constructor(audioUrl, volume = 1.0) {
        this.audioUrl = audioUrl;
        this.volume = Math.max(0, Math.min(1, volume)); // Clamp entre 0 y 1
        this.audioElement = null;
        this.isReady = false;

        this.init();
    }

    /**
     * Inicializa el elemento de audio
     * - Crea el elemento Audio
     * - Configura precarga
     * - Establece volumen
     * - Añade listeners de eventos
     */
    init() {
        try {
            this.audioElement = new Audio(this.audioUrl);
            this.audioElement.preload = 'auto';
            this.audioElement.volume = this.volume;

            // Event listeners
            this.audioElement.addEventListener('canplaythrough', () => {
                this.isReady = true;
                if (CONFIG.DEBUG) {
                    console.log('✅ Audio cargado y listo');
                }
            });

            this.audioElement.addEventListener('error', (e) => {
                console.error('❌ Error al cargar el audio:', e);
                this.isReady = false;
            });

            this.audioElement.addEventListener('ended', () => {
                if (CONFIG.DEBUG) {
                    console.log('🔊 Audio finalizado');
                }
            });

        } catch (error) {
            console.error('❌ Error al inicializar AudioService:', error);
            this.isReady = false;
        }
    }

    /**
     * Reproduce el sonido de notificación
     * - Reinicia el audio si ya se está reproduciendo
     * - Maneja errores de autoplay (bloqueados por navegador)
     * 
     * @returns {Promise<void>}
     */
    async play() {
        if (!this.audioElement) {
            console.warn('⚠️ AudioElement no inicializado');
            return;
        }

        try {
            // Reiniciar si ya se está reproduciendo
            this.audioElement.currentTime = 0;

            // Intentar reproducir
            await this.audioElement.play();

            if (CONFIG.DEBUG) {
                console.log('🔊 Audio reproducido');
            }
        } catch (error) {
            // Los navegadores modernos bloquean autoplay sin interacción del usuario
            console.warn('⚠️ No se pudo reproducir el audio (posiblemente bloqueado por el navegador):', error.message);
        }
    }

    /**
     * Detiene el audio y reinicia su posición
     */
    stop() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioService;
}
