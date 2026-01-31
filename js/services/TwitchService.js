/**
 * TwitchService - Servicio de Conexión con Twitch IRC
 * 
 * Responsabilidades:
 * - Conectar con Twitch IRC usando tmi.js
 * - Gestionar eventos de conexión
 * - Procesar mensajes entrantes
 * - Manejar desconexiones y reconexiones
 * 
 * @class TwitchService
 */
class TwitchService {
    /**
     * Constructor del servicio de Twitch
     * @param {string} channel - Canal de Twitch a conectar
     * @param {Function} onMessageCallback - Callback cuando llega un mensaje
     */
    constructor(channel, onMessageCallback) {
        this.channel = channel;
        this.onMessageCallback = onMessageCallback;
        this.client = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.activeChatters = new Set(); // Fallback para tracking local
    }

    /**
     * Conecta al canal de Twitch IRC
     * - Inicializa el cliente tmi.js
     * - Registra event listeners
     * - Maneja errores de conexión
     */
    connect() {
        try {
            // Verificar que tmi.js esté disponible
            if (typeof tmi === 'undefined') {
                throw new Error('tmi.js no está cargado. Verifica que libs/tmi.min.js esté incluido.');
            }

            // Configuración del cliente IRC
            this.client = new tmi.Client({
                channels: [this.channel],
                connection: {
                    reconnect: true,
                    secure: true
                },
                options: {
                    debug: CONFIG.DEBUG || false
                }
            });

            // Event: Conectado exitosamente
            this.client.on('connected', (address, port) => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log(`✅ Conectado a Twitch IRC: ${address}:${port}`);
                console.log(`📺 Monitoreando canal: #${this.channel}`);
            });

            // Event: Mensaje recibido
            this.client.on('message', (channel, tags, message, self) => {
                // Registrar usuario como activo
                const username = tags['display-name'] || tags.username;
                if (username) {
                    this.activeChatters.add(username.toLowerCase());
                }

                // Procesar todos los mensajes
                if (this.onMessageCallback) {
                    this.onMessageCallback(tags, message);
                }
            });

            // Event: Usuario se une al chat (JOIN)
            this.client.on('join', (channel, username, self) => {
                this.activeChatters.add(username.toLowerCase());
            });

            // Event: Usuario sale del chat (PART)
            this.client.on('part', (channel, username, self) => {
                this.activeChatters.delete(username.toLowerCase());
            });

            // Event: Desconectado
            this.client.on('disconnected', (reason) => {
                this.isConnected = false;
                console.warn('⚠️ Desconectado de Twitch IRC:', reason);
                this.handleReconnect();
            });

            // Event: Error de conexión
            this.client.on('error', (error) => {
                console.error('❌ Error en TwitchService:', error);
            });

            // Iniciar conexión
            this.client.connect().catch((error) => {
                console.error('❌ Error al conectar con Twitch:', error);
                this.handleReconnect();
            });

        } catch (error) {
            console.error('❌ Error al inicializar TwitchService:', error);
        }
    }

    /**
     * Maneja la reconexión automática
     * @private
     */
    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`❌ Máximo de intentos de reconexión alcanzado (${this.maxReconnectAttempts})`);
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff

        console.log(`🔄 Intentando reconectar en ${delay / 1000}s... (Intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, delay);
    }

    /**
     * Obtiene la categoría (juego) actual del canal usando una API pública
     * @returns {Promise<string|null>} Nombre de la categoría o null si falla
     */
    async fetchChannelCategory() {
        try {
            const response = await fetch(`https://decapi.me/twitch/game/${this.channel}`);
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            const category = await response.text();
            return category ? category.trim() : null;
        } catch (error) {
            console.warn('⚠️ No se pudo obtener la categoría del stream:', error);
            return null;
        }
    }

    /**
     * Verifica si el stream está online u offline
     * @returns {Promise<boolean>} true si está online, false si está offline
     */
    async fetchStreamStatus() {
        try {
            const response = await fetch(`https://decapi.me/twitch/uptime/${this.channel}`);
            if (!response.ok) {
                return false;
            }
            const text = await response.text();
            const isOffline = text.toLowerCase().includes('offline');
            return !isOffline;
        } catch (error) {
            console.warn('⚠️ No se pudo verificar estado del stream:', error);
            return false;
        }
    }

    /**
     * Obtiene la lista de usuarios conectados al chat
     * Intenta usar la API TMI, si falla (CORS), usa la lista local construida por eventos
     * @returns {Promise<Array<string>>} Lista de usernames
     */
    async fetchChatters() {
        let apiChatters = [];
        let apiSuccess = false;

        try {
            // Intento principal: API TMI
            const response = await fetch(`https://tmi.twitch.tv/group/user/${this.channel}/chatters`);

            if (response.ok) {
                const data = await response.json();
                const chatters = data.chatters;
                apiChatters = [
                    ...(chatters.broadcaster || []),
                    ...(chatters.vips || []),
                    ...(chatters.moderators || []),
                    ...(chatters.staff || []),
                    ...(chatters.admins || []),
                    ...(chatters.global_mods || []),
                    ...(chatters.viewers || [])
                ];
                apiSuccess = true;

                // Actualizar nuestro set local con la verdad de la API
                apiChatters.forEach(u => this.activeChatters.add(u.toLowerCase()));
            }
        } catch (error) {
            console.warn('⚠️ API Chatters falló (posiblemente CORS). Usando lista local de eventos Join/Part.');
        }

        // Si la API falló, o para complementar, usamos el Set local
        // El Set local se alimenta de eventos JOIN/PART/MESSAGE
        if (!apiSuccess && this.activeChatters.size > 0) {
            console.log(`ℹ️ Usando fallback local de chatters: ${this.activeChatters.size} usuarios detectados.`);
            return Array.from(this.activeChatters);
        }

        return apiSuccess ? apiChatters : [];
    }

    /**
     * Desconecta del canal de Twitch
     */
    disconnect() {
        if (this.client && this.isConnected) {
            this.client.disconnect()
                .then(() => {
                    console.log('👋 Desconectado de Twitch');
                    this.isConnected = false;
                })
                .catch((error) => {
                    console.error('❌ Error al desconectar:', error);
                });
        }
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TwitchService;
}
