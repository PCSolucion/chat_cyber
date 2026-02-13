import { TIMING } from '../constants/AppConstants.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

/**
 * StreamHistoryService
 * Automatiza el registro del historial de streams en Firestore.
 * REFACTORED: Ahora es reactivo y depende de StreamMonitorService.
 */
export default class StreamHistoryService {
    constructor(config, storage) {
        this.config = config;
        this.storage = storage;

        this.fileName = 'stream_history.json';
        this.isTracking = false;
        this.sessionStartTime = null;
        this.lastSaveTime = null;

        this.currentSession = {
            duration: 0,
            category: '',
            title: '',
            xp: 0,
            messages: 0
        };

        this.currentSessionId = null;
        this.DEBUG = config.DEBUG || false;
    }
    /**
     * Inicialización asíncrona - Carga datos y verifica migraciones
     */
    async init() {
        this._setupListeners();
        // OPTIMIZACIÓN: Eliminada lectura inicial de historial. 
        // El widget no usa datos históricos, solo escribe la sesión actual.
        // Esto ahorra 1 lectura de documento grande en cada recarga.
        console.log('✅ StreamHistoryService inicializado (Modo Escritura Unica)');
        return true;
    }

    _setupListeners() {
        // Reaccionar al estado del stream
        if (typeof EventManager !== 'undefined') { // Safety check
            EventManager.on(EVENTS.STREAM.STATUS_CHANGED, (isOnline) => {
                if (isOnline) {
                    this._handleStreamStart();
                } else {
                    this._handleStreamEnd();
                }
            });

            // Reaccionar a cambios de categoría
            EventManager.on(EVENTS.STREAM.CATEGORY_UPDATED, (category) => {
                this.currentSession.category = category;
                if (this.isTracking) {
                    this._autoSave();
                }
            });

            // Reaccionar a cambios de título
            EventManager.on('stream:titleUpdated', (title) => {
                this.currentSession.title = title;
                if (this.isTracking) {
                    this._autoSave();
                }
            });

            // Trackear XP generado en la sesión
            EventManager.on(EVENTS.USER.XP_GAINED, (data) => {
                if (this.isTracking) {
                    this.currentSession.xp += (data.amount || 0);
                }
            });

            // Trackear mensajes enviados en la sesión
            EventManager.on(EVENTS.CHAT.MESSAGE_RECEIVED, () => {
                if (this.isTracking) {
                    this.currentSession.messages++;
                }
            });
        }
    }

    _handleStreamStart() {
        if (this.isTracking) return;
        
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const time = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
        
        console.log(`🔴 Historial: Stream ONLINE detectado. Iniciando sesión: ${today}_${time}`);
        
        this.isTracking = true;
        this.sessionStartTime = now.getTime();
        this.currentSessionId = `${today}_${time}`;
        this.activeDate = today;
        
        // Resetear contadores de esta sesión específica
        this.currentSession.xp = 0;
        this.currentSession.messages = 0;
        this.initialDayDuration = undefined; 
    }

    async _handleStreamEnd() {
        if (!this.isTracking) return;

        console.log('🏁 Historial: Stream finalizado. Guardando datos finales...');
        await this.saveHistory(true);
        this.isTracking = false;
        this.sessionStartTime = null;
    }

    /**
     * Guarda SOLO cuando hay cambios contextuales (Categoría, Título) 
     * o cuando el stream termina.
     */
    async _autoSave() {
        // En este modo optimizado, guardamos inmediatamente cuando cambia el contexto.
        // Ya no dependemos de un intervalo de tiempo fijo para "hacer backup".
        // La fiabilidad del evento "STREAM END" es suficiente.
        await this.saveHistory();
        this.lastSaveTime = Date.now();
    }

    /**
     * Guarda el historial en el storage disponible
     */
    async saveHistory(final = false) {
        if (!this.sessionStartTime) return;

        try {
            const now = Date.now();
            const today = new Date(now).toISOString().split('T')[0];
            
            // 1. Inicializar el día activo si es el primer save
            if (!this.activeDate) this.activeDate = today;

            // 2. Detectar cambio de día (Medianoche UTC) durante el directo
            if (this.activeDate !== today) {
                console.log(`📅 Cambio de día detectado en historial (${this.activeDate} -> ${today}). Finalizando parte de sesión...`);
                
                // 1. Guardar la parte del día anterior con el ID actual
                await this._saveCurrentSnapshot(now, true);

                // 2. Iniciar nueva parte de sesión para el nuevo día
                this.sessionStartTime = new Date(today + "T00:00:00Z").getTime();
                this.activeDate = today;
                this.currentSessionId = `${today}_0000`; // Marca el inicio del día
                this.initialDayDuration = undefined;
                
                // Los contadores de XP y mensajes siguen acumulándose o podrías resetearlos si prefieres
                // estadísticas por "trozo de día". Los mantendremos acumulados por ahora.
                console.log(`🚀 Iniciada nueva parte de sesión: ${this.currentSessionId}`);
            }

            await this._saveCurrentSnapshot(now, final);
        } catch (error) {
            console.error('❌ Error al guardar historial de stream:', error);
        }
    }

    /**
     * Helper para guardar el estado actual de la sesión
     * @private
     */
    async _saveCurrentSnapshot(now, final = false) {
        const sessionMinutes = Math.floor((now - this.sessionStartTime) / TIMING.MINUTE_MS);
        if (sessionMinutes < 1 && !this.DEBUG && !final) return;

        // OPTIMIZACIÓN: No leemos el historial antiguo. Solo escribimos la sesión actual.
        // Firestore hará merge automáticamente gracias a setDoc con merge: true (en FirestoreService).
        
        // Calcular mensajes por hora (MPH)
        const hours = Math.max(0.1, sessionMinutes / 60);
        const mph = Math.round(this.currentSession.messages / hours);

        const sessionData = {
            id: this.currentSessionId,
            date: this.activeDate,
            startTime: new Date(this.sessionStartTime).toISOString(),
            endTime: final ? new Date(now).toISOString() : null,
            duration: sessionMinutes,
            xpGenerated: this.currentSession.xp,
            messages: this.currentSession.messages,
            messagesPerHour: mph,
            category: this.currentSession.category,
            title: this.currentSession.title,
            isOnline: !final,
            lastUpdate: new Date(now).toISOString()
        };

        // Guardar SOLO la sesión actual
        // El formato { [id]: data } permite que Firestore fusione este objeto con el existente.
        const updatePayload = {
            [this.currentSessionId]: sessionData
        };

        // Asumimos que save maneja merge: true (FirestoreService.saveFile lo hace)
        const success = await this.storage.save(this.fileName, updatePayload, new Set([this.currentSessionId]));
        
        if (success) {
            if (this.DEBUG) console.log(`✅ Sesión ${this.currentSessionId} guardada (${sessionMinutes}m)`);
            // window.STREAM_HISTORY ya no se actualiza localmente porque no tenemos todo el historial.
        }
    }

    // Métodos legacy para compatibilidad si se llaman (vaciados)
    startMonitoring() {}
    stopMonitoring() {}
}
