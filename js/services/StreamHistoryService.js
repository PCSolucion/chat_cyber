/**
 * StreamHistoryService
 * Automatiza el registro del historial de streams en GitHub Gist
 */
class StreamHistoryService {
    constructor(config, gistService) {
        this.config = config;
        this.gistService = gistService;

        this.fileName = 'stream_history.json';
        this.channel = config.TWITCH_CHANNEL || 'liiukiin';

        this.checkInterval = null;
        this.isTracking = false;
        this.sessionStartTime = null;
        this.lastSaveTime = null;

        this.currentSession = {
            duration: 0,
            category: '',
            title: ''
        };

        // Grace period para cortes (5 minutos)
        this.offlineCounter = 0;
        this.MAX_OFFLINE_CHECKS = 5;

        this.DEBUG = config.DEBUG || false;
    }

    /**
     * Inicia el monitoreo
     */
    startMonitoring() {
        if (this.checkInterval) return;

        console.log('📡 StreamHistoryService: Iniciando monitoreo...');

        // Verificación inicial
        this.checkStream();

        // Verificar cada minuto
        this.checkInterval = setInterval(() => this.checkStream(), 60000);
    }

    /**
     * Detiene el monitoreo
     */
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Verifica el estado del stream y actualiza el historial
     */
    async checkStream() {
        try {
            const isOnline = await this.getStreamStatus();

            if (isOnline) {
                this.offlineCounter = 0; // Reset offline counter

                if (!this.isTracking) {
                    // Nuevo stream detectado
                    console.log('🔴 Stream ONLINE detectado. Iniciando tracking...');
                    this.isTracking = true;
                    this.sessionStartTime = Date.now();
                }

                // Actualizar metadatos y guardar periódicamente
                await this.updateSessionData();

            } else {
                if (this.isTracking) {
                    this.offlineCounter++;
                    console.log(`⚫ Stream OFFLINE detectado (${this.offlineCounter}/${this.MAX_OFFLINE_CHECKS})`);

                    if (this.offlineCounter >= this.MAX_OFFLINE_CHECKS) {
                        // Confirmado offline tras grace period
                        console.log('🏁 Stream finalizado. Guardando datos finales...');
                        await this.saveHistory(true); // Force save
                        this.isTracking = false;
                        this.sessionStartTime = null;
                        this.offlineCounter = 0;
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error en StreamHistoryService:', error);
        }
    }

    /**
     * Obtiene el estado del stream (API decapi.me)
     */
    async getStreamStatus() {
        try {
            const response = await fetch(`https://decapi.me/twitch/uptime/${this.channel}`);
            const text = await response.text();
            return !text.includes('offline') && !text.includes('error');
        } catch (e) {
            console.warn('Error checking stream status:', e);
            return false;
        }
    }

    /**
     * Obtiene metadatos del stream
     */
    async getStreamMetadata() {
        try {
            const [gameRes, titleRes] = await Promise.all([
                fetch(`https://decapi.me/twitch/game/${this.channel}`),
                fetch(`https://decapi.me/twitch/title/${this.channel}`)
            ]);

            return {
                category: await gameRes.text(),
                title: await titleRes.text()
            };
        } catch (e) {
            console.warn('Error fetching metadata:', e);
            return { category: '', title: '' };
        }
    }

    /**
     * Actualiza datos de la sesión y guarda en Gist si procede
     */
    async updateSessionData() {
        const now = Date.now();

        // Obtener metadatos actuales
        const metadata = await this.getStreamMetadata();

        // Actualizar datos locales
        this.currentSession.category = metadata.category;
        this.currentSession.title = metadata.title;

        // Guardar cada 5 minutos
        if (!this.lastSaveTime || (now - this.lastSaveTime > 300000)) {
            await this.saveHistory();
            this.lastSaveTime = now;
        }
    }

    /**
     * Guarda el historial en Gist
     */
    async saveHistory(final = false) {
        if (!this.sessionStartTime) return;

        // Calcular duración de esta sesión en minutos
        const sessionMinutes = Math.floor((Date.now() - this.sessionStartTime) / 60000);
        if (sessionMinutes < 1 && !this.DEBUG) return; // Ignorar sesiones < 1 min

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        console.log(`💾 Guardando historial de stream... (Duración actual: ${sessionMinutes}m)`);

        // 1. Cargar historial existente
        let history = await this.gistService.loadFile(this.fileName);
        if (!history) history = {};

        // 2. Actualizar entrada de hoy
        // NOTA: Para simplificar, asumimos que si ya existe entrada de hoy, 
        // sumamos la duración de la sesión actual a lo que había ANTES de empezar esta sesión.
        // Pero como no sabemos cuánto había antes, esto es complejo.
        // ESTRATEGIA: Leer lo que hay en el Gist, y actualizar.
        // Problema: Si actualizo partialmente, puedo sobreeescribir.
        // Solución: Usar un campo "lastUpdated" o similar en la entrada del día.
        // O más simple: Simplemente actualizar el día con los datos actuales.

        // Si ya existe datos para hoy, necesitamos saber si son de ESTA sesión o de una anterior hoy.
        // Asumiremos que "duration" es el total del día acumulado.

        // Para hacerlo bien sin base de datos real:
        // Leer Gist -> Obtener duración previa (si no es esta misma sesión actualizando) -> Sumar sesión actual.
        // Pero, ¿cómo sé si es esta misma sesión?
        // Check "count".

        // Aproximación robusta para overlay simple:
        // Siempre que guardo, leo el Gist.
        // Si `count` ha cambiado desde que empecé, es que hubo otro stream (raro en simultáneo).
        // Simplemente sobreescribiré la entrada del día con:
        // Duration = (Duration guardada al inicio de la sesión) + SessionDuration
        // Titulo = Titulo actual
        // Category = Categoria actual

        // Necesito saber la duración inicial del día cuando empecé el script
        if (this.initialDayDuration === undefined) {
            // Primera vez guardando en esta ejecución
            if (history[today]) {
                this.initialDayDuration = history[today].duration || 0;
                this.dayCount = history[today].count || 0;
            } else {
                this.initialDayDuration = 0;
                this.dayCount = 0; // Se incrementará a 1 abajo
            }

            // Si es tracking nuevo, incrementamos count
            if (this.isTracking) {
                this.dayCount++;
            }
        }

        const totalDuration = this.initialDayDuration + sessionMinutes;

        history[today] = {
            date: today,
            duration: totalDuration,
            category: this.currentSession.category,
            title: this.currentSession.title,
            count: this.dayCount
        };

        // 3. Guardar en Gist
        const success = await this.gistService.saveFile(this.fileName, history);

        if (success) {
            console.log(`✅ Historial actualizado: ${today} - ${totalDuration}m`);
            // Actualizar referencia global para que la UI se actualice sin recargar
            if (window) window.STREAM_HISTORY = history;
        }
    }
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StreamHistoryService;
}
