import { AUDIO } from '../../constants/AppConstants.js';
import Logger from '../../utils/Logger.js';

/**
 * AudioEngine - Motor de bajo nivel para reproducción de audio
 * 
 * Responsabilidades:
 * - Gestión de Pool de objetos Audio (reutilización).
 * - Control de volumen y normalización.
 * - Manejo de errores de Autoplay y políticas del navegador.
 * - Pre-carga (Priming) de recursos.
 */
export default class AudioEngine {
    constructor(config) {
        this.config = config;
        
        // Pool de objetos Audio para reutilización: Map<path, Audio[]>
        this.audioPool = new Map();
        
        // Volumen global base
        this.baseVolume = this.config.AUDIO_VOLUME !== undefined 
            ? this.config.AUDIO_VOLUME 
            : (AUDIO.DEFAULT_VOLUME || 0.8);
    }

    /**
     * Reproduce un archivo de audio gestionando el pool y errores
     * @param {string} path - Ruta al archivo .mp3
     * @param {number|null} forceVolume - Volumen específico opcional (0 a 1)
     */
    play(path, forceVolume = null) {
        let volume = forceVolume !== null ? forceVolume : this.baseVolume;

        // Si el volumen es 0 y no es una carga forzada (priming), ignorar
        if (volume <= 0 && forceVolume === null) return;

        try {
            // Obtener o crear pool para este archivo
            if (!this.audioPool.has(path)) {
                this.audioPool.set(path, []);
            }
            const pool = this.audioPool.get(path);

            // Buscar un objeto disponible (pausado o terminado)
            let audio = pool.find(a => a.paused || a.ended);

            if (!audio) {
                const maxOverlapping = AUDIO.MAX_OVERLAPPING_SOUNDS || 5;
                if (pool.length < maxOverlapping) {
                    audio = new Audio(path);
                    audio.preload = 'auto';
                    pool.push(audio);
                } else {
                    // Pool lleno: reutilizar el más antiguo
                    audio = pool[0];
                    audio.pause();
                    if (this.config.DEBUG) {
                        Logger.debug('AudioEngine', `Pool lleno para ${path}, reutilizando canal.`);
                    }
                }
            }

            // Preparar para reproducción
            audio.currentTime = 0;
            audio.volume = Math.max(0, Math.min(1, volume));
            
            if (audio.readyState === 0) audio.load();

            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Reportar errores solo si no es un priming silencioso
                    if (volume > 0.01) {
                        Logger.warn('AudioEngine', `Error al reproducir ${path}: ${error.message}`);
                        if (error.name === 'NotAllowedError') {
                            Logger.info('AudioEngine', '💡 El navegador bloqueó el autoplay. Se requiere interacción del usuario.');
                        }
                    }
                });
            }
        } catch (e) {
            Logger.error('AudioEngine', `Error crítico en reproducción de ${path}:`, e);
        }
    }

    /**
     * Pre-carga una lista de sonidos para mejorar el tiempo de respuesta
     * @param {string[]} paths 
     */
    preload(paths) {
        paths.forEach(path => {
            // Ejecutamos un play casi inaudible para que el navegador considere el recurso "usado"
            this.play(path, 0.001);
        });
    }

    /**
     * Actualiza el volumen base del motor
     * @param {number} newVolume 
     */
    setVolume(newVolume) {
        this.baseVolume = Math.max(0, Math.min(1, newVolume));
    }

    /**
     * Detiene y limpia todos los recursos de audio
     */
    destroy() {
        this.audioPool.forEach(pool => {
            pool.forEach(audio => {
                audio.pause();
                audio.src = ''; // Limpiar recurso
                audio.load();
            });
        });
        this.audioPool.clear();
        if (this.config.DEBUG) Logger.info('AudioEngine', 'Motor de audio detenido y recursos liberados.');
    }
}
