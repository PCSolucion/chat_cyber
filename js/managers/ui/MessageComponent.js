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

    update(message, emotes, userRole) {
        const processed = UIUtils.processEmotes(message, emotes, this.thirdPartyEmoteService, this.config.EMOTE_SIZE);
        const { isEmoteOnly, emoteCount } = UIUtils.isEmoteOnlyMessage(processed);
        
        this.el.className = 'quote';
        
        if (isEmoteOnly) {
            this.el.classList.add('emote-only');
            if (emoteCount <= 2) this.el.classList.add('emote-large');
            else if (emoteCount <= 4) this.el.classList.add('emote-medium');
            this.el.innerHTML = processed;
        } else {
            const isHighRank = ['admin', 'top'].includes(userRole.role);
            const hasImages = UIUtils.hasImages(processed);

            if (isHighRank && !hasImages) {
                UIUtils.scrambleText(this.el, processed);
            } else {
                if (!hasImages) {
                    this.el.textContent = `"${processed}"`;
                    this.el.innerHTML = `"${processed}"`; 
                } else {
                    this.el.innerHTML = `"${processed}"`;
                }
            }
        }
    }

    setRawHTML(html) {
        this.el.innerHTML = html;
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
