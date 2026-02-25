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
        
        // Catálogo de sonidos dinámico (Prioriza config inyectada > Constantes > Hardcode fallback)
        this.sounds = {
            notification: config.AUDIO_URL || AUDIO.SOUNDS.NOTIFICATION,
            achievementCommon: AUDIO.SOUNDS.ACHIEVEMENT_COMMON,
            achievementRare: AUDIO.SOUNDS.ACHIEVEMENT_RARE,
            levelup: AUDIO.SOUNDS.LEVEL_UP
        };

        // Mapeo de IDs para reproducción genérica (Strategy pattern simplificado)
        this.playStrategies = {
            'level-up': () => this.playLevelUp(),
            'achievement': (data) => this.playAchievement(data),
            'chat': () => this.playChatMessage()
        };

        this.initialized = false;
    }

    /**
     * Inicializa los listeners y pre-carga sonidos críticos
     */
    init() {
        if (this.initialized) return;
        this._setupEventListeners();
        
        // Pre-carga técnica automática de todos los sonidos definidos
        this.engine.preload(Object.values(this.sounds));
        
        this.initialized = true;
        Logger.info('AudioManager', 'Orquestador listo y sonidos pre-cargados.');
    }

    /**
     * Configuración de los disparadores de audio basados en eventos
     * @private
     */
    _setupEventListeners() {
        this._unsubscribe = [
            EventManager.on(EVENTS.CHAT.MESSAGE_RECEIVED, () => this.playChatMessage()),
            EventManager.on(EVENTS.UI.LEVEL_UP_DISPLAYED, (data) => this.playLevelUp(data)),
            EventManager.on(EVENTS.UI.ACHIEVEMENT_DISPLAYED, (data) => this.playAchievement(data)),
            EventManager.on(EVENTS.AUDIO.TEST, () => this.playChatMessage()),
            EventManager.on(EVENTS.AUDIO.PLAY, (payload) => this._handleGenericPlay(payload))
        ];
    }

    /**
     * Limpia y destruye el manager
     */
    destroy() {
        if (this._unsubscribe) {
            this._unsubscribe.forEach(unsub => unsub());
        }
        if (this.engine) this.engine.destroy();
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
        this.engine.play(this.sounds.notification);
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
        this.engine.play(this.sounds.levelup);
    }

    /**
     * Reproduce sonido de logro según su rareza
     */
    playAchievement(data) {
        const rarity = (data?.achievement?.rarity || 'common').toLowerCase();
        
        const soundFile = ['legendary', 'epic', 'rare'].includes(rarity)
            ? this.sounds.achievementRare
            : this.sounds.achievementCommon;

        this.engine.play(soundFile);
    }

    /**
     * Maneja peticiones de audio genéricas
     * @private
     */
    _handleGenericPlay(payload) {
        if (!payload) return;
        
        const id = payload.id || payload;
        const strategy = this.playStrategies[id];

        if (strategy) {
            strategy(payload.data || null);
        } else if (typeof id === 'string' && id.includes('.mp3')) {
            // Si es un path directo, delegar al motor
            this.engine.play(id);
        }
    }
}
