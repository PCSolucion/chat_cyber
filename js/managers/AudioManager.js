import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

/**
 * AudioManager - Centralized Audio Management System
 * 
 * Unifies all sound logic (Chat, Level Up, Achievements) into a single manager.
 * Removes dependencies on scattered "AudioService" instances.
 */
export default class AudioManager {
    constructor(config) {
        this.config = config;
        
        // Cache for audio objects to avoid reloading
        this.audioCache = new Map();
        
        // Default sounds
        this.defaultSounds = {
            notification: this.config.AUDIO_URL || 'sounds/cyberpunk-message.mp3',
            achievement: 'sounds/logro.mp3'
        };

        this.initialized = false;
        
        // Setup listeners
        this.init();
    }

    /**
     * Initialize listeners
     */
    init() {
        if (this.initialized) return;

        this._setupEventListeners();
        this.initialized = true;
        
        if (this.config.DEBUG) {
            console.log('🔊 AudioManager initialized and listening to events');
        }
    }

    _setupEventListeners() {
        // 1. Chat Message
        EventManager.on(EVENTS.CHAT.MESSAGE_RECEIVED, () => this.playChatMessage());
        
        // 2. Level Up (Data contains newLevel)
        EventManager.on(EVENTS.USER.LEVEL_UP, (data) => this.playLevelUp(data));
        
        // 3. Achievement
        EventManager.on(EVENTS.USER.ACHIEVEMENT_UNLOCKED, () => this.playAchievement());
        
        // 4. Test sound
        EventManager.on(EVENTS.AUDIO.TEST, () => this.playChatMessage());
    }

    /**
     * Plays the standard chat notification sound
     */
    playChatMessage() {
        this._playSoundFile(this.defaultSounds.notification);
    }

    /**
     * Plays a level up sound based on the level reached
     * @param {Object} data - Event data containing { newLevel }
     */
    playLevelUp(data) {
        const level = data && data.newLevel ? data.newLevel : 1;
        let soundFile = 'sounds/level10.mp3'; // Default

        // Select sound based on level tiers
        if (level <= 10) soundFile = 'sounds/level10.mp3';
        else if (level <= 15) soundFile = 'sounds/level15.mp3';
        else if (level <= 20) soundFile = 'sounds/level20.mp3';
        else soundFile = 'sounds/level25.mp3'; // 21+

        this._playSoundFile(soundFile);
    }

    /**
     * Plays the achievement unlocked sound
     */
    playAchievement() {
        this._playSoundFile(this.defaultSounds.achievement);
    }

    /**
     * Internal method to play a sound file
     * @param {string} path - Path to audio file
     */
    _playSoundFile(path) {
        // strict volume check (0 volume = mute)
        if (!this.config.AUDIO_VOLUME && this.config.AUDIO_VOLUME !== 0) return;
        
        try {
            // Check cache first to reuse Audio objects (optional optimization)
            // For now, new Audio() is safer for overlapping sounds
            const audio = new Audio(path);
            audio.volume = Math.max(0, Math.min(1, this.config.AUDIO_VOLUME)); // Clamp 0-1
            
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Browsers block autoplay without interaction
                    // We suppress the error to keep console clean, unless debugging
                    if (this.config.DEBUG) {
                        console.warn(`⚠️ AudioManager: Could not play ${path}`, error.message);
                    }
                });
            }
        } catch (e) {
            console.error('❌ AudioManager Error:', e);
        }
    }
}
