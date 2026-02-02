import EventManager from '../utils/EventEmitter.js';

/**
 * AudioManager - Centralized Audio Management System
 */
export default class AudioManager {
    constructor(config) {
        this.config = config;
        this.sounds = new Map();
        
        // Define default sound mappings
        this.eventSoundMap = {
            'user:levelUp': 'levelup',
            'user:achievementUnlocked': 'achievement',
            'test:sound': 'notification'
        };

        this.initialized = false;
        
        // Setup listeners
        this._setupEventListeners();
    }

    /**
     * Preload standard sounds
     */
    async init() {
        if (this.initialized) return;

        // In a real scenario, we might iterate over a list of assets
        // For now, we assume implicit loading or just manage the logic
        // Browsers block audio context until user interaction usually.
        // We will assume 'audio/levelup.mp3', etc. exist in the project structure
        // If not, we should probably fail gracefully.
        
        this.initialized = true;
        console.log('🔊 AudioManager initialized');
    }

    _setupEventListeners() {
        // Listen to all mapped events
        Object.keys(this.eventSoundMap).forEach(eventName => {
            EventManager.on(eventName, () => {
                const soundName = this.eventSoundMap[eventName];
                this.playSound(soundName);
            });
        });
    }

    playSound(soundName) {
        if (!this.config.SOUND_ENABLED) return;

        // Path construction
        // Mapeo nombres abstractos a archivos reales existentes en la carpeta 'sounds/'
        // achievement -> logro.mp3
        // levelup -> levelup.mp3 (asumido)
        let fileName = soundName;
        if (soundName === 'achievement') fileName = 'logro';
        
        const path = `sounds/${fileName}.mp3`;
        
        try {
            const audio = new Audio(path);
            audio.volume = this.config.SOUND_VOLUME || 0.5;
            audio.play().catch(e => {
                // Autoplay policy or missing file
                console.warn(`⚠️ Could not play sound ${soundName}:`, e.message);
            });
        } catch (e) {
            console.error('❌ Audio Error:', e);
        }
    }
}
