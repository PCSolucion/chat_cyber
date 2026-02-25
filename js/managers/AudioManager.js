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
            notification: this.config.AUDIO_URL || 'sounds/radiof1.mp3',
            achievement: 'sounds/logro2.mp3', // [FIX] Corregido path (logro.mp3 no existía)
            levelup: 'sounds/level15.mp3'
        };

        this.initialized = false;
        // El constructor no llama a init, se llama externamente en App.js
    }

    /**
     * Inicializa los listeners y pre-carga sonidos
     */
    init() {
        if (this.initialized) return;
        this._setupEventListeners();
        
        // [NUEVO] Pre-cargar sonidos críticos para evitar bloqueos del navegador
        this._preloadSounds();
        
        this.initialized = true;
        
        if (this.config.DEBUG) {
            console.log('🔊 AudioManager inicializado y sonidos pre-cargados');
        }
    }

    /**
     * Pre-carga y "censa" los sonidos para que el navegador los permita reproducir
     * @private
     */
    _preloadSounds() {
        const soundsToPreload = [
            this.defaultSounds.notification,
            'sounds/level15.mp3',
            'sounds/logro2.mp3',
            'sounds/logro3.mp3'
        ];

        soundsToPreload.forEach(path => {
            // "Priming": Crear el objeto audio y cargarlo
            // En versiones modernas de Chrome, esto ayuda a que play() sea instantáneo después del primer gesto
            this._playSoundFile(path, 0.001); // Volumen casi inaudible para priming
        });
    }

    _setupEventListeners() {
        // 1. Chat Message (Con Throttling de 250ms por defecto)
        EventManager.on(EVENTS.CHAT.MESSAGE_RECEIVED, () => this.playChatMessage());
        
        // 2. Level Up (Sincronizado con la animación real en el NotificationManager)
        EventManager.on(EVENTS.UI.LEVEL_UP_DISPLAYED, (data) => this.playLevelUp(data));
        
        // 3. Achievements (Sincronizado con la animación)
        EventManager.on(EVENTS.UI.ACHIEVEMENT_DISPLAYED, (data) => {
            if (this.config.DEBUG) console.log('🔊 AudioManager: Evento ACHIEVEMENT_DISPLAYED recibido', data);
            this.playAchievement(data);
        });
        
        // 4. Test sound
        EventManager.on(EVENTS.AUDIO.TEST, () => this.playChatMessage());

        // 5. Generic Play (Soporte para múltiples formatos de eventos)
        EventManager.on(EVENTS.AUDIO.PLAY, (payload) => {
            if (!payload) return;
            const id = payload.id || payload; // Soporta {id: 'name'} o 'name'
            
            if (this.config.DEBUG) console.log(`🔊 AudioManager: Reproducción genérica solicitada para ID: ${id}`);
            
            switch(id) {
                case 'level-up':
                case 'levelup':
                    this.playLevelUp();
                    break;
                case 'achievement':
                case 'logro':
                    this.playAchievement();
                    break;
                case 'chat':
                case 'message':
                    this.playChatMessage();
                    break;
                default:
                    if (typeof id === 'string' && id.includes('.mp3')) {
                        this._playSoundFile(id);
                    }
            }
        });
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
        // [MODIFICACIÓN] Siempre utilizar level15.mp3 por petición del usuario
        // [FIX] Control de duplicados: Evitar que el sonido se solape si el evento se dispara muy seguido
        const now = Date.now();
        const lastPlay = this.lastPlayTimes.get('levelup') || 0;
        const cooldown = 5000; // 5 segundos de cooldown (inferior al tiempo de animación del overlay que es de ~6.5s)

        if (now - lastPlay < cooldown) {
            if (this.config.DEBUG) {
                console.log('🔊 AudioManager: Bloqueado sonido de level up duplicado (cooldown)');
            }
            return;
        }

        this.lastPlayTimes.set('levelup', now);
        const soundFile = 'sounds/level15.mp3';

        this._playSoundFile(soundFile);
    }

    /**
     * Reproduce sonidos de logros
     * @param {Object} data - Datos del evento { achievement }
     */
    playAchievement(data) {
        const rarity = (data?.achievement?.rarity || 'common').toLowerCase();
        
        if (this.config.DEBUG) {
            console.log(`🔊 AudioManager: Procesando sonido de logro (Rareza: ${rarity})`);
        }

        // Mapeo de sonidos por rareza
        // Rarezas: common, uncommon, rare, epic, legendary
        let soundFile = this.defaultSounds.achievement; // Default (logro2.mp3)
        
        if (['legendary', 'epic', 'rare'].includes(rarity)) {
            soundFile = 'sounds/logro3.mp3'; // Sonido premium/raro
        } else {
            soundFile = 'sounds/logro2.mp3'; // Sonido estándar
        }

        this._playSoundFile(soundFile);
    }

    /**
     * Lógica interna de reproducción con pooling para eficiencia
     * @param {string} path - Ruta al archivo
     */
    _playSoundFile(path, forceVolume = null) {
        let volume = forceVolume;
        
        if (volume === null) {
            const configVol = this.config.AUDIO_VOLUME;
            volume = (configVol !== undefined && configVol !== null) 
                ? configVol 
                : (AUDIO.DEFAULT_VOLUME || 0.8);
        }

        if (volume <= 0 && forceVolume === null) return;

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
                    audio.preload = 'auto'; // Asegurar carga
                    pool.push(audio);
                } else {
                    // Si el pool está lleno, forzar reutilización del primero
                    audio = pool[0];
                    audio.pause();
                    if (this.config.DEBUG) console.log(`🔊 AudioManager: Pool lleno para ${path}, reutilizando canal.`);
                }
            }

            // [FIX] Asegurar que el audio empieza desde el principio y tiene el volumen correcto
            audio.currentTime = 0;
            audio.volume = Math.max(0, Math.min(1, volume));
            
            // Forzar carga si estuviera en estado suspendido
            if (audio.readyState === 0) audio.load();

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // No loguear error si es por priming (volumen casi 0)
                    if (volume > 0.01) {
                        console.error(`⚠️ AudioManager: Error al reproducir ${path}:`, error.message);
                        if (error.name === 'NotAllowedError') {
                            console.warn('💡 Tip: El navegador bloqueó el audio. Se requiere interacción del usuario o permiso de Autoplay.');
                        }
                    }
                });
            }
        } catch (e) {
            console.error('❌ AudioManager Error:', e);
        }
    }
}
