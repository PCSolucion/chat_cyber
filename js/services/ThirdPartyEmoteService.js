/**
 * ThirdPartyEmoteService - Integración con 7TV, BTTV y FFZ
 * 
 * Responsabilidades:
 * - Cargar emotes de 7TV, BetterTTV y FrankerFaceZ
 * - Cachear emotes para uso rápido
 * - Procesar mensajes reemplazando códigos de emotes con imágenes
 * 
 * APIs utilizadas:
 * - 7TV: https://7tv.io/v3/emote-sets/global
 * - BTTV: https://api.betterttv.net/3/cached/emotes/global
 * - FFZ: https://api.frankerfacez.com/v1/set/global
 * 
 * @class ThirdPartyEmoteService
 */
class ThirdPartyEmoteService {
    constructor(config) {
        this.config = config;
        this.channelName = config.TWITCH_CHANNEL || 'liiukiin';

        // Cache de emotes: { emoteName: { url, provider, animated } }
        this.emoteCache = new Map();

        // Estado de carga
        this.isLoaded = false;
        this.loadPromise = null;

        // Configuración de providers
        this.providers = {
            '7tv': { enabled: true, priority: 1 },
            'bttv': { enabled: true, priority: 2 },
            'ffz': { enabled: true, priority: 3 }
        };

        // URLs de APIs
        this.apiUrls = {
            '7tv': {
                global: 'https://7tv.io/v3/emote-sets/global',
                channel: (id) => `https://7tv.io/v3/users/twitch/${id}`
            },
            'bttv': {
                global: 'https://api.betterttv.net/3/cached/emotes/global',
                channel: (id) => `https://api.betterttv.net/3/cached/users/twitch/${id}`
            },
            'ffz': {
                global: 'https://api.frankerfacez.com/v1/set/global',
                channel: (name) => `https://api.frankerfacez.com/v1/room/${name}`
            }
        };

        // ID de Twitch del canal (lo obtenemos dinámicamente)
        this.channelId = null;
    }

    /**
     * Carga todos los emotes de terceros
     * @returns {Promise<Object>} Estadísticas de carga
     */
    async loadEmotes() {
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = this._loadAll();
        return this.loadPromise;
    }

    /**
     * Carga interna de todos los providers
     * @private
     */
    async _loadAll() {
        console.log('🎭 ThirdPartyEmoteService: Cargando emotes...');

        const stats = {
            '7tv': { global: 0, channel: 0, errors: [] },
            'bttv': { global: 0, channel: 0, errors: [] },
            'ffz': { global: 0, channel: 0, errors: [] }
        };

        // Primero obtener el ID del canal
        await this._getChannelId();

        // Cargar en paralelo
        const loadPromises = [];

        // 7TV
        if (this.providers['7tv'].enabled) {
            loadPromises.push(this._load7TV(stats['7tv']));
        }

        // BTTV
        if (this.providers['bttv'].enabled) {
            loadPromises.push(this._loadBTTV(stats['bttv']));
        }

        // FFZ
        if (this.providers['ffz'].enabled) {
            loadPromises.push(this._loadFFZ(stats['ffz']));
        }

        await Promise.allSettled(loadPromises);

        this.isLoaded = true;

        const totalEmotes = this.emoteCache.size;
        console.log(`✅ ThirdPartyEmoteService: ${totalEmotes} emotes cargados`);
        console.log('   📊 Desglose:', stats);

        return stats;
    }

    /**
     * Obtiene el ID de Twitch del canal usando la API de 7TV
     * @private
     */
    async _getChannelId() {
        try {
            // Usar 7TV para obtener el ID (es público y no requiere auth)
            const response = await fetch(`https://7tv.io/v3/users/twitch/${this.channelName}`);
            if (response.ok) {
                const data = await response.json();
                this.channelId = data.user?.id || null;
                console.log(`🎭 Channel ID for ${this.channelName}: ${this.channelId}`);
            }
        } catch (e) {
            console.warn('⚠️ Could not get channel ID:', e);
        }
    }

    /**
     * Carga emotes de 7TV
     * @private
     */
    async _load7TV(stats) {
        // Global emotes
        try {
            const response = await fetch(this.apiUrls['7tv'].global);
            if (response.ok) {
                const data = await response.json();
                const emotes = data.emotes || [];
                emotes.forEach(emote => {
                    this._addEmote(emote.name, {
                        url: this._get7TVEmoteUrl(emote),
                        provider: '7tv',
                        animated: emote.data?.animated || false,
                        id: emote.id
                    });
                    stats.global++;
                });
            }
        } catch (e) {
            stats.errors.push(`Global: ${e.message}`);
        }

        // Channel emotes
        if (this.channelName) {
            try {
                const response = await fetch(this.apiUrls['7tv'].channel(this.channelName));
                if (response.ok) {
                    const data = await response.json();
                    const emoteSet = data.emote_set;
                    if (emoteSet && emoteSet.emotes) {
                        emoteSet.emotes.forEach(emote => {
                            this._addEmote(emote.name, {
                                url: this._get7TVEmoteUrl(emote),
                                provider: '7tv',
                                animated: emote.data?.animated || false,
                                id: emote.id
                            });
                            stats.channel++;
                        });
                    }
                }
            } catch (e) {
                stats.errors.push(`Channel: ${e.message}`);
            }
        }
    }

    /**
     * Construye URL de emote de 7TV
     * @private
     */
    _get7TVEmoteUrl(emote) {
        // Formato: https://cdn.7tv.app/emote/{id}/2x.webp
        const id = emote.id;
        const animated = emote.data?.animated || false;
        const ext = animated ? 'gif' : 'webp';
        return `https://cdn.7tv.app/emote/${id}/2x.${ext}`;
    }

    /**
     * Carga emotes de BTTV
     * @private
     */
    async _loadBTTV(stats) {
        // Global emotes
        try {
            const response = await fetch(this.apiUrls['bttv'].global);
            if (response.ok) {
                const emotes = await response.json();
                emotes.forEach(emote => {
                    this._addEmote(emote.code, {
                        url: this._getBTTVEmoteUrl(emote.id, emote.imageType),
                        provider: 'bttv',
                        animated: emote.imageType === 'gif',
                        id: emote.id
                    });
                    stats.global++;
                });
            }
        } catch (e) {
            stats.errors.push(`Global: ${e.message}`);
        }

        // Channel emotes (requiere ID del canal)
        if (this.channelId) {
            try {
                const response = await fetch(this.apiUrls['bttv'].channel(this.channelId));
                if (response.ok) {
                    const data = await response.json();
                    // Channel emotes
                    const channelEmotes = data.channelEmotes || [];
                    channelEmotes.forEach(emote => {
                        this._addEmote(emote.code, {
                            url: this._getBTTVEmoteUrl(emote.id, emote.imageType),
                            provider: 'bttv',
                            animated: emote.imageType === 'gif',
                            id: emote.id
                        });
                        stats.channel++;
                    });

                    // Shared emotes (emotes compartidos de otros canales)
                    const sharedEmotes = data.sharedEmotes || [];
                    sharedEmotes.forEach(emote => {
                        this._addEmote(emote.code, {
                            url: this._getBTTVEmoteUrl(emote.id, emote.imageType),
                            provider: 'bttv',
                            animated: emote.imageType === 'gif',
                            id: emote.id
                        });
                        stats.channel++;
                    });
                }
            } catch (e) {
                stats.errors.push(`Channel: ${e.message}`);
            }
        }
    }

    /**
     * Construye URL de emote de BTTV
     * @private
     */
    _getBTTVEmoteUrl(id, imageType = 'png') {
        return `https://cdn.betterttv.net/emote/${id}/2x.${imageType}`;
    }

    /**
     * Carga emotes de FFZ
     * @private
     */
    async _loadFFZ(stats) {
        // Global emotes
        try {
            const response = await fetch(this.apiUrls['ffz'].global);
            if (response.ok) {
                const data = await response.json();
                // FFZ devuelve sets, hay que iterar
                const sets = data.sets || {};
                Object.values(sets).forEach(set => {
                    const emotes = set.emoticons || [];
                    emotes.forEach(emote => {
                        this._addEmote(emote.name, {
                            url: this._getFFZEmoteUrl(emote),
                            provider: 'ffz',
                            animated: emote.animated || false,
                            id: emote.id
                        });
                        stats.global++;
                    });
                });
            }
        } catch (e) {
            stats.errors.push(`Global: ${e.message}`);
        }

        // Channel emotes
        if (this.channelName) {
            try {
                const response = await fetch(this.apiUrls['ffz'].channel(this.channelName));
                if (response.ok) {
                    const data = await response.json();
                    const sets = data.sets || {};
                    Object.values(sets).forEach(set => {
                        const emotes = set.emoticons || [];
                        emotes.forEach(emote => {
                            this._addEmote(emote.name, {
                                url: this._getFFZEmoteUrl(emote),
                                provider: 'ffz',
                                animated: emote.animated || false,
                                id: emote.id
                            });
                            stats.channel++;
                        });
                    });
                }
            } catch (e) {
                stats.errors.push(`Channel: ${e.message}`);
            }
        }
    }

    /**
     * Construye URL de emote de FFZ
     * @private
     */
    _getFFZEmoteUrl(emote) {
        // FFZ provee urls directas, prefiere 2x
        if (emote.animated) {
            return emote.animated['2'] || emote.animated['1'] || emote.urls['2'] || emote.urls['1'];
        }
        return emote.urls['2'] || emote.urls['4'] || emote.urls['1'];
    }

    /**
     * Añade un emote al cache
     * @private
     */
    _addEmote(name, data) {
        // Si ya existe, mantener el de mayor prioridad
        if (this.emoteCache.has(name)) {
            const existing = this.emoteCache.get(name);
            const existingPriority = this.providers[existing.provider]?.priority || 99;
            const newPriority = this.providers[data.provider]?.priority || 99;

            if (newPriority >= existingPriority) {
                return; // Mantener el existente
            }
        }

        this.emoteCache.set(name, data);
    }

    /**
     * Busca un emote por nombre
     * @param {string} name - Nombre del emote
     * @returns {Object|null} Datos del emote o null
     */
    getEmote(name) {
        return this.emoteCache.get(name) || null;
    }

    /**
     * Procesa un mensaje y reemplaza códigos de emotes
     * Debe llamarse DESPUÉS de procesar emotes de Twitch
     * 
     * @param {string} html - HTML del mensaje (con emotes de Twitch ya procesados)
     * @param {string} emoteSize - Tamaño de emotes (ej: '1.2em')
     * @returns {string} HTML con emotes de terceros procesados
     */
    processThirdPartyEmotes(html, emoteSize = '1.2em') {
        if (!this.isLoaded || this.emoteCache.size === 0) {
            return html;
        }

        // Extraer partes que son texto puro (no dentro de tags HTML)
        // Dividir por tags HTML
        const parts = html.split(/(<[^>]+>)/g);

        return parts.map(part => {
            // Si es un tag HTML, no modificar
            if (part.startsWith('<')) {
                return part;
            }

            // Procesar texto normal
            return this._replaceEmotesInText(part, emoteSize);
        }).join('');
    }

    /**
     * Reemplaza emotes en texto plano
     * @private
     */
    _replaceEmotesInText(text, emoteSize) {
        // Dividir por espacios pero mantener los espacios
        const words = text.split(/(\s+)/);

        return words.map(word => {
            // Si es solo espacios, mantener
            if (/^\s+$/.test(word)) {
                return word;
            }

            // Buscar emote
            const emote = this.getEmote(word);
            if (emote) {
                const animatedClass = emote.animated ? 'emote-animated' : '';
                return `<img src="${emote.url}" alt="${word}" title="${word} (${emote.provider})" class="emote-img emote-3p ${animatedClass}" style="height:${emoteSize};vertical-align:middle;" data-provider="${emote.provider}">`;
            }

            return word;
        }).join('');
    }

    /**
     * Obtiene estadísticas del servicio
     * @returns {Object} Estadísticas
     */
    getStats() {
        const stats = {
            total: this.emoteCache.size,
            byProvider: {
                '7tv': 0,
                'bttv': 0,
                'ffz': 0
            },
            animated: 0,
            isLoaded: this.isLoaded
        };

        this.emoteCache.forEach(emote => {
            stats.byProvider[emote.provider]++;
            if (emote.animated) stats.animated++;
        });

        return stats;
    }

    /**
     * Verifica si un texto contiene emotes de terceros
     * @param {string} text - Texto a verificar
     * @returns {boolean} true si contiene emotes
     */
    hasThirdPartyEmotes(text) {
        if (!this.isLoaded) return false;

        const words = text.split(/\s+/);
        return words.some(word => this.emoteCache.has(word));
    }

    /**
     * Obtiene lista de emotes disponibles (para debug/testing)
     * @param {number} limit - Límite de resultados
     * @returns {Array} Lista de nombres de emotes
     */
    listEmotes(limit = 50) {
        return Array.from(this.emoteCache.keys()).slice(0, limit);
    }
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThirdPartyEmoteService;
}
