import Logger from '../utils/Logger.js';
import { SPAM } from '../constants/AppConstants.js';

/**
 * SpamFilterService - Anti-Spam Shield
 * 
 * Servicio independiente que detecta y filtra spam del chat.
 * Detecta: char flooding, mensajes repetidos, copypasta y flood por usuario.
 * 
 * Extraído de MessageProcessor para mantener separación de responsabilidades.
 */
export default class SpamFilterService {
    constructor(config = {}) {
        // Estado interno
        this._state = {
            userHistory: new Map(),       // { username: [{ text, timestamp }] }
            globalHistory: [],            // [{ text, username, timestamp }]
            copypastaTracker: new Map(),  // { textHash: { count, firstTime, usernames, rendered } }
            floodTracker: new Map()       // { username: [timestamps] }
        };

        // Configuración (centralizada en AppConstants.js)
        this._config = {
            maxRepeatMessages: SPAM.MAX_REPEAT_MESSAGES,
            charFloodThreshold: SPAM.CHAR_FLOOD_THRESHOLD,
            charFloodMinLength: SPAM.CHAR_FLOOD_MIN_LENGTH,
            copypastaWindow: SPAM.COPYPASTA_WINDOW_MS,
            copypastaMinUsers: SPAM.COPYPASTA_MIN_USERS,
            floodWindow: SPAM.FLOOD_WINDOW_MS,
            floodMaxMessages: SPAM.FLOOD_MAX_MESSAGES,
            floodShowRatio: SPAM.FLOOD_SHOW_RATIO,
            historyMaxSize: SPAM.HISTORY_MAX_SIZE,
            cleanupInterval: SPAM.CLEANUP_INTERVAL_MS,
            maxEntryAge: SPAM.MAX_ENTRY_AGE_MS,
            ...config
        };

        // Limpieza periódica
        this._cleanupTimer = setInterval(
            () => this._cleanup(), 
            this._config.cleanupInterval
        );
    }

    // =========================================================================
    // API PÚBLICA
    // =========================================================================

    /**
     * Evalúa si un mensaje debe ser bloqueado
     * @param {string} username - Nombre del usuario (lowercase)
     * @param {string} message - Texto del mensaje
     * @param {number} [timestamp] - Timestamp del mensaje
     * @returns {boolean} true si el mensaje debe ser bloqueado
     */
    shouldBlock(username, message, timestamp = Date.now()) {
        const text = message.trim();
        const lowerUser = username.toLowerCase();

        // 1. Char flood (AAAAAAA)
        if (this._isCharFlood(text)) {
            Logger.info('SpamFilter', `Char flood blocked from ${username}`);
            return true;
        }

        // 2. Mensajes repetidos del mismo usuario
        if (this._isRepeatMessage(lowerUser, text)) {
            Logger.info('SpamFilter', `Repeat message blocked from ${username}`);
            return true;
        }

        // 3. Copypasta (múltiples usuarios, mismo texto)
        if (this._checkCopypasta(lowerUser, text, timestamp) === 'block') {
            return true;
        }

        // 4. Flood throttle por usuario
        if (this._isUserFlooding(lowerUser, timestamp)) {
            Logger.info('SpamFilter', `Flood throttled from ${username}`);
            return true;
        }

        // Mensaje permitido → registrar en historial
        this._recordMessage(lowerUser, text, timestamp);
        return false;
    }

    /**
     * Destruye el servicio y limpia timers
     */
    destroy() {
        if (this._cleanupTimer) {
            clearInterval(this._cleanupTimer);
            this._cleanupTimer = null;
        }
    }

    // =========================================================================
    // DETECCIÓN INTERNA
    // =========================================================================

    /**
     * Detecta char flood (>80% del mismo carácter)
     * @private
     */
    _isCharFlood(text) {
        if (text.length < this._config.charFloodMinLength) return false;

        const chars = Array.from(text.replace(/\s/g, ''));
        if (chars.length === 0) return false;

        const freq = {};
        let maxCount = 0;
        for (const c of chars) {
            freq[c] = (freq[c] || 0) + 1;
            if (freq[c] > maxCount) maxCount = freq[c];
        }

        return (maxCount / chars.length) >= this._config.charFloodThreshold;
    }

    /**
     * Detecta mensajes repetidos consecutivos del mismo usuario
     * @private
     */
    _isRepeatMessage(username, text) {
        const history = this._state.userHistory.get(username) || [];
        const textLower = text.toLowerCase();

        let repeatCount = 0;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].text === textLower) repeatCount++;
            else break;
        }

        return repeatCount >= this._config.maxRepeatMessages;
    }

    /**
     * Detecta copypasta (3+ usuarios enviando el mismo texto en <10s)
     * @private
     */
    _checkCopypasta(username, text, now) {
        const textLower = text.toLowerCase();
        if (textLower.length < 15) return 'pass';

        let entry = this._state.copypastaTracker.get(textLower);

        if (!entry) {
            this._state.copypastaTracker.set(textLower, {
                count: 1,
                firstTime: now,
                usernames: new Set([username]),
                rendered: true
            });
            return 'pass';
        }

        // Fuera de la ventana → resetear
        if (now - entry.firstTime > this._config.copypastaWindow) {
            this._state.copypastaTracker.set(textLower, {
                count: 1,
                firstTime: now,
                usernames: new Set([username]),
                rendered: true
            });
            return 'pass';
        }

        // Dentro de la ventana → incrementar
        entry.usernames.add(username);
        entry.count++;

        if (entry.usernames.size >= this._config.copypastaMinUsers) {
            Logger.info('SpamFilter', `Copypasta blocked (${entry.count} copies from ${entry.usernames.size} users)`);
            return 'block';
        }

        return 'pass';
    }

    /**
     * Detecta flood por usuario (>5 mensajes en 10s)
     * @private
     */
    _isUserFlooding(username, now) {
        const timestamps = this._state.floodTracker.get(username) || [];
        const recentTimestamps = timestamps.filter(t => now - t < this._config.floodWindow);
        this._state.floodTracker.set(username, recentTimestamps);

        if (recentTimestamps.length >= this._config.floodMaxMessages) {
            const totalInWindow = recentTimestamps.length + 1;
            return (totalInWindow % this._config.floodShowRatio) !== 0;
        }

        return false;
    }

    // =========================================================================
    // REGISTRO Y LIMPIEZA
    // =========================================================================

    /**
     * Registra un mensaje en los historiales
     * @private
     */
    _recordMessage(username, text, now) {
        const textLower = text.toLowerCase();

        // Historial por usuario (últimos 5 mensajes)
        const userHist = this._state.userHistory.get(username) || [];
        userHist.push({ text: textLower, timestamp: now });
        if (userHist.length > 5) userHist.shift();
        this._state.userHistory.set(username, userHist);

        // Historial global (buffer circular)
        this._state.globalHistory.push({ text: textLower, username, timestamp: now });
        if (this._state.globalHistory.length > this._config.historyMaxSize) {
            this._state.globalHistory.shift();
        }

        // Flood tracker
        const floodTs = this._state.floodTracker.get(username) || [];
        floodTs.push(now);
        this._state.floodTracker.set(username, floodTs);
    }

    /**
     * Limpia estado antiguo para evitar memory leaks
     * @private
     */
    _cleanup() {
        const now = Date.now();
        const maxAge = this._config.maxEntryAge; // Usar valor de config centralizada

        // Copypasta tracker
        for (const [key, entry] of this._state.copypastaTracker) {
            if (now - entry.firstTime > maxAge) {
                this._state.copypastaTracker.delete(key);
            }
        }

        // Flood tracker
        for (const [user, timestamps] of this._state.floodTracker) {
            const recent = timestamps.filter(t => now - t < maxAge);
            if (recent.length === 0) {
                this._state.floodTracker.delete(user);
            } else {
                this._state.floodTracker.set(user, recent);
            }
        }

        // Historial global
        this._state.globalHistory = this._state.globalHistory.filter(
            entry => now - entry.timestamp < maxAge
        );
    }
}
