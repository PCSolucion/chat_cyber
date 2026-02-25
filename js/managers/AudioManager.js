import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import { AUDIO } from '../constants/AppConstants.js';
import AudioEngine from './audio/AudioEngine.js';
import Logger from '../utils/Logger.js';

/**
 * AudioManager - Orquestador Centralizado de Sonido
 * 
 * Se encarga de:
 * - Escuchar eventos del sistema (Chat, UI, Logros).
 * - Gestionar cooldowns y throttling para evitar saturación.
 * - Decidir qué archivos usar según las reglas de negocio.
 * - Delegar la reproducción técnica a AudioEngine.
 */
export default class AudioManager {
    constructor(config) {
        this.config = config;
        
        // Motor de reproducción (Técnico)
        this.engine = new AudioEngine(config);
        
        // Registro de cooldowns por tipo de sonido (Lógica)
        this.lastPlayTimes = new Map();
        
        // Catálogo de sonidos por defecto
        this.defaultSounds = {
            notification: this.config.AUDIO_URL || 'sounds/radiof1.mp3',
            achievementCommon: 'sounds/logro2.mp3',
            achievementRare: 'sounds/logro3.mp3',
            levelup: 'sounds/level15.mp3'
        };

        this.initialized = false;
    }

    /**
     * Inicializa los listeners y pre-carga sonidos críticos
     */
    init() {
        if (this.initialized) return;
        this._setupEventListeners();
        
        // Pre-carga técnica a través del motor
        this.engine.preload([
            this.defaultSounds.notification,
            this.defaultSounds.levelup,
            this.defaultSounds.achievementCommon,
            this.defaultSounds.achievementRare
        ]);
        
        this.initialized = true;
        Logger.info('AudioManager', 'Orquestador listo y sonidos pre-cargados.');
    }

    /**
     * Configuración de los disparadores de audio basados en eventos
     * @private
     */
    _setupEventListeners() {
        // 1. Mensajes de Chat (con control de frecuencia)
        EventManager.on(EVENTS.CHAT.MESSAGE_RECEIVED, () => this.playChatMessage());
        
        // 2. Notificaciones visuales (Nivel / Logros)
        EventManager.on(EVENTS.UI.LEVEL_UP_DISPLAYED, (data) => this.playLevelUp(data));
        EventManager.on(EVENTS.UI.ACHIEVEMENT_DISPLAYED, (data) => this.playAchievement(data));
        
        // 3. Soporte para eventos genéricos y testeo
        EventManager.on(EVENTS.AUDIO.TEST, () => this.playChatMessage());
        EventManager.on(EVENTS.AUDIO.PLAY, (payload) => this._handleGenericPlay(payload));
    }

    /**
     * Reproduce sonido de chat con throttling para evitar ruidos molestos en ráfagas
     */
    playChatMessage() {
        const now = Date.now();
        const lastPlay = this.lastPlayTimes.get('chat') || 0;
        const cooldown = AUDIO.COOLDOWN_MESSAGE_MS || 250;

        if (now - lastPlay < cooldown) return;

        this.lastPlayTimes.set('chat', now);
        this.engine.play(this.defaultSounds.notification);
    }

    /**
     * Reproduce sonido de nivel
     */
    playLevelUp(data) {
        const now = Date.now();
        const lastPlay = this.lastPlayTimes.get('levelup') || 0;
        const cooldown = 5000; // Cooldown de seguridad de 5s

        if (now - lastPlay < cooldown) {
            if (this.config.DEBUG) Logger.debug('AudioManager', 'Sonido de level up bloqueado por cooldown.');
            return;
        }

        this.lastPlayTimes.set('levelup', now);
        this.engine.play(this.defaultSounds.levelup);
    }

    /**
     * Reproduce sonido de logro según su rareza
     */
    playAchievement(data) {
        const rarity = (data?.achievement?.rarity || 'common').toLowerCase();
        
        // Decisión de negocio: ¿Qué archivo toca?
        const soundFile = ['legendary', 'epic', 'rare'].includes(rarity)
            ? this.defaultSounds.achievementRare
            : this.defaultSounds.achievementCommon;

        this.engine.play(soundFile);
    }

    /**
     * Maneja peticiones de audio genéricas
     * @private
     */
    _handleGenericPlay(payload) {
        if (!payload) return;
        const id = payload.id || payload;

        switch(id) {
            case 'level-up': this.playLevelUp(); break;
            case 'achievement': this.playAchievement(); break;
            case 'chat': this.playChatMessage(); break;
            default:
                // Si es un path directo a un .mp3, el motor lo gestiona
                if (typeof id === 'string' && id.includes('.mp3')) {
                    this.engine.play(id);
                }
        }
    }
}
