import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import { AUDIO } from '../constants/AppConstants.js';

/**
 * AudioManager - Sistema Centralizado de Audio
 * 
 * Unifica toda la lógica de sonido (Chat, Level Up, Logros).
 * Optimizado con Pooling y Throttling para evitar "ametralladoras" de sonido.
 */
export default class AudioManager {
    constructor(config) {
        this.config = config;
        
        // Pool de objetos Audio para reutilización
        this.audioPool = new Map();
        
        // Registro de cooldowns por tipo de sonido
        this.lastPlayTimes = new Map();
        
        // Sonidos por defecto
        this.defaultSounds = {
            notification: this.config.AUDIO_URL || 'sounds/cyberpunk-message.mp3',
            achievement: 'sounds/logro.mp3'
        };

        this.initialized = false;
        this.init();
    }

    /**
     * Inicializa los listeners
     */
    init() {
        if (this.initialized) return;
        this._setupEventListeners();
        this.initialized = true;
        
        if (this.config.DEBUG) {
            console.log('🔊 AudioManager inicializado con control de spam');
        }
    }

    _setupEventListeners() {
        // 1. Chat Message (Con Throttling de 250ms por defecto)
        EventManager.on(EVENTS.CHAT.MESSAGE_RECEIVED, () => this.playChatMessage());
        
        // 2. Level Up (Prioridad alta, sin throttling estricto de chat)
        EventManager.on(EVENTS.USER.LEVEL_UP, (data) => this.playLevelUp(data));
        
        // 4. Test sound
        EventManager.on(EVENTS.AUDIO.TEST, () => this.playChatMessage());
    }

    /**
     * Reproduce el sonido de chat con control de frecuencia
     */
    playChatMessage() {
        const now = Date.now();
        const lastPlay = this.lastPlayTimes.get('chat') || 0;
        const cooldown = AUDIO.COOLDOWN_MESSAGE_MS || 250;

        // Evitar efecto ametralladora en raids o momentos de spam
        if (now - lastPlay < cooldown) return;

        this.lastPlayTimes.set('chat', now);
        this._playSoundFile(this.defaultSounds.notification);
    }

    /**
     * Reproduce sonidos de nivel (Salta el throttling de chat)
     * @param {Object} data - Datos del evento { newLevel }
     */
    playLevelUp(data) {
        const level = data?.newLevel || 1;
        let soundFile = 'sounds/level10.mp3';

        if (level <= 10) soundFile = 'sounds/level10.mp3';
        else if (level <= 15) soundFile = 'sounds/level15.mp3';
        else if (level <= 20) soundFile = 'sounds/level20.mp3';
        else soundFile = 'sounds/level25.mp3';

        this._playSoundFile(soundFile);
    }

    /**
     * Lógica interna de reproducción con pooling para eficiencia
     * @param {string} path - Ruta al archivo
     */
    _playSoundFile(path) {
        const configVol = this.config.AUDIO_VOLUME;
        const volume = (configVol !== undefined && configVol !== null) 
            ? configVol 
            : (AUDIO.DEFAULT_VOLUME || 0.8);

        if (volume <= 0) return;

        try {
            // Gestión de Pool por archivo
            if (!this.audioPool.has(path)) {
                this.audioPool.set(path, []);
            }
            const pool = this.audioPool.get(path);

            // Intentar reutilizar un objeto que haya terminado o esté pausado
            let audio = pool.find(a => a.paused || a.ended);

            if (!audio) {
                // Si no hay libres y no hemos llegado al límite, crear uno nuevo
                if (pool.length < (AUDIO.MAX_OVERLAPPING_SOUNDS || 5)) {
                    audio = new Audio(path);
                    pool.push(audio);
                } else {
                    // Si el pool está lleno, forzar reutilización del primero
                    audio = pool[0];
                    audio.pause();
                    audio.currentTime = 0;
                }
            }

            audio.volume = Math.max(0, Math.min(1, volume));
            
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    if (this.config.DEBUG) {
                        console.warn(`⚠️ AudioManager: No se pudo reproducir ${path} (Posible bloqueo del navegador)`);
                    }
                });
            }
        } catch (e) {
            console.error('❌ AudioManager Error:', e);
        }
    }
}
