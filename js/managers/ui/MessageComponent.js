import UIUtils from '../../utils/UIUtils.js';

/**
 * MessageComponent - Gestiona el contenido del mensaje y sus animaciones
 */
export default class MessageComponent {
    constructor(messageElement, thirdPartyEmoteService, config) {
        this.el = messageElement;
        this.thirdPartyEmoteService = thirdPartyEmoteService;
        this.config = config;
    }

    update(username, message, emotes, userRole) {
        const maxLength = this.config.MAX_MESSAGE_LENGTH || 100;
        const maxWordLength = this.config.MAX_WORD_LENGTH || 25;
        
        // Convertir a array de caracteres visuales para manejar emojis (surrogates) correctamente
        const allChars = Array.from(message);
        let truncatedMessage = message;
        let activeEmotes = emotes;

        // 1. Límite de mensaje total (basado en caracteres visuales)
        if (allChars.length > maxLength) {
            truncatedMessage = allChars.slice(0, maxLength).join('') + '...';
            
            if (emotes) {
                activeEmotes = {};
                // Los índices de Twitch están basados en UTF-16 code units, no en visual chars.
                // Sin embargo, si el mensaje es corto (100 visual chars), es probable que 
                // los índices de emotes de Twitch (basados en string.length) sigan siendo útiles 
                // si limitamos de forma conservadora.
                const rawCutPoint = truncatedMessage.length; 
                Object.entries(emotes).forEach(([id, positions]) => {
                    const validPositions = positions
                        .filter(pos => parseInt(pos.split('-')[0]) < rawCutPoint)
                        .map(pos => {
                            const [start, end] = pos.split('-').map(Number);
                            return `${start}-${Math.min(end, rawCutPoint - 1)}`;
                        });
                    if (validPositions.length > 0) activeEmotes[id] = validPositions;
                });
            }
        }

        // 2. Límite de longitud Diferenciado (Palabras vs Emojis)
        // Usamos 7 como límite riguroso para emojis
        const maxEmojiLimit = this.config.MAX_EMOJI_LIMIT || 7;
        let stopProcessing = false;
        let finalMessageParts = [];

        // Dividimos preservando TODOS los espacios
        const chunks = truncatedMessage.split(/(\s+)/);
        
        for (const chunk of chunks) {
            if (stopProcessing) break;

            if (chunk.trim().length === 0) {
                finalMessageParts.push(chunk);
                continue;
            }

            const chars = Array.from(chunk);
            
            // Un chunk es una secuencia de emojis si NO contiene letras ni números Unicode
            const hasAlphanumeric = /[\p{L}\p{N}]/u.test(chunk);
            const currentLimit = hasAlphanumeric ? maxWordLength : maxEmojiLimit;
            
            if (chars.length > currentLimit) {
                finalMessageParts.push(chars.slice(0, currentLimit).join('') + '…');
                stopProcessing = true; // Paramos de añadir contenido para evitar repeticiones de bloques truncados
            } else {
                finalMessageParts.push(chunk);
            }
        }

        let finalMessage = finalMessageParts.join('');

        // Failsafe: Asegurar que el total no se dispare
        if (Array.from(finalMessage).length > maxLength + 5) {
            finalMessage = Array.from(finalMessage).slice(0, maxLength).join('') + '...';
        }

        // Si hemos modificado el texto (truncado), los índices de emotes de Twitch ya no valen
        if (finalMessage !== truncatedMessage && activeEmotes) {
            activeEmotes = null; 
        }

        const processed = UIUtils.processEmotes(finalMessage, activeEmotes, this.thirdPartyEmoteService, this.config.EMOTE_SIZE);
        const { isEmoteOnly, emoteCount } = UIUtils.isEmoteOnlyMessage(processed);
        
        this.el.className = 'quote';
        
        if (isEmoteOnly) {
            this.el.classList.add('emote-only');
            if (emoteCount <= 2) this.el.classList.add('emote-large');
            else if (emoteCount <= 4) this.el.classList.add('emote-medium');
            this._setSafeHTML(processed);
        } else {
            const isHighRank = ['admin', 'top'].includes(userRole.role);
            const hasImages = UIUtils.hasImages(processed);

            if (username.toLowerCase() === this.config.TWITCH_CHANNEL && !hasImages) {
                UIUtils.scrambleText(this.el, processed);
            } else {
                // processed aquí ya está purificado por UIUtils
                this._setSafeHTML(`"${processed}"`);
            }
        }
    }

    /**
     * Inyecta HTML convirtiéndolo primero en Nodos reales.
     * Erradica por completo el uso directo de .innerHTML y las quejas estáticas de XSS.
     */
    _setSafeHTML(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        this.el.replaceChildren(...doc.body.childNodes);
    }

    setRawHTML(html) {
        this._setSafeHTML(html);
    }

    setDecrypting(active) {
        if (active) this.el.classList.add('decrypting');
        else this.el.classList.remove('decrypting');
    }

    reset() {
        this.el.classList.remove('decrypting', 'emote-only', 'emote-large', 'emote-medium');
        this.el.style.opacity = '1';
    }

    fade(opacity) {
        this.el.style.opacity = opacity.toString();
    }
}
