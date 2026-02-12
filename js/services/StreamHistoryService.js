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
            title: ''
        };

        this.DEBUG = config.DEBUG || false;
    }
    /**
     * Inicialización asíncrona - Carga datos y verifica migraciones
     */
    async init() {
        this._setupListeners();
        
        try {
            const history = await this.storage.load(this.fileName) || {};
            // Si FirestoreService nos marca que estos datos vienen del formato antiguo
            if (history._isMigrated) {
                console.info('🚀 StreamHistoryService: Ejecutando migración de historial...');
                // Guardamos todo el objeto (null en dirtyKeys) para crear documentos individuales
                await this.storage.save(this.fileName, history, null);
                console.log('✅ Historial migrado a la nueva estructura de Firestore');
            }
            
            if (typeof window !== 'undefined') window.STREAM_HISTORY = history;
            return true;
        } catch (e) {
            console.error('❌ Error inicializando StreamHistoryService:', e);
            return false;
        }
    }

    _setupListeners() {
        // Reaccionar al estado del stream
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
    }

    _handleStreamStart() {
        if (this.isTracking) return;
        
        console.log('🔴 Historial: Stream ONLINE detectado. Iniciando tracking...');
        this.isTracking = true;
        this.sessionStartTime = Date.now();
        this.initialDayDuration = undefined; // Resetear para recalcular en el primer save
        this.activeDate = undefined; // Resetear fecha activa
    }

    async _handleStreamEnd() {
        if (!this.isTracking) return;

        console.log('🏁 Historial: Stream finalizado. Guardando datos finales...');
        await this.saveHistory(true);
        this.isTracking = false;
        this.sessionStartTime = null;
    }

    /**
     * Guarda periódicamente si los datos han cambiado
     */
    async _autoSave() {
        const now = Date.now();
        if (!this.lastSaveTime || (now - this.lastSaveTime > TIMING.STREAM_SAVE_COOLDOWN_MS)) {
            await this.saveHistory();
            this.lastSaveTime = now;
        }
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
                console.log(`📅 Cambio de día detectado en historial (${this.activeDate} -> ${today}). Dividiendo sesión...`);
                
                // Calcular minutos que pertenecen al día anterior (hasta las 00:00:00 UTC)
                const midnightUTC = new Date(today + "T00:00:00Z").getTime();
                const minsOldDay = Math.floor((midnightUTC - this.sessionStartTime) / TIMING.MINUTE_MS);
                
                if (minsOldDay > 0) {
                    const history = await this.storage.load(this.fileName) || {};
                    const oldInitial = (history[this.activeDate] && history[this.activeDate].duration) || 0;
                    
                    history[this.activeDate] = {
                        ...(history[this.activeDate] || {}),
                        date: this.activeDate,
                        duration: oldInitial + minsOldDay
                    };
                    // Pasamos el set con la fecha afectada para guardado granular
                    await this.storage.save(this.fileName, history, new Set([this.activeDate]));
                }

                // Reiniciar ancla de tiempo para el nuevo día
                this.sessionStartTime = midnightUTC;
                this.initialDayDuration = undefined; 
                this.activeDate = today;
            }

            const sessionMinutes = Math.floor((now - this.sessionStartTime) / TIMING.MINUTE_MS);
            if (sessionMinutes < 1 && !this.DEBUG && !final) return;

            const history = await this.storage.load(this.fileName) || {};
            
            // Si es una migración detectada por FirestoreService
            const isMigrating = history._isMigrated;

            // Inicializar o recargar duración del día si es undefined
            if (this.initialDayDuration === undefined) {
                if (history[today]) {
                    this.initialDayDuration = history[today].duration || 0;
                    this.dayCount = history[today].count || 0;
                } else {
                    this.initialDayDuration = 0;
                    this.dayCount = 0;
                }
                if (this.isTracking) this.dayCount++;
            }

            const totalDuration = this.initialDayDuration + sessionMinutes;

            history[today] = {
                date: today,
                duration: totalDuration,
                category: this.currentSession.category,
                title: this.currentSession.title,
                count: this.dayCount
            };

            // Si estamos migrando, guardamos todo el objeto para crear los documentos individuales.
            // Si no, solo la fecha de hoy para ahorrar ancho de banda.
            const dirtyKeys = isMigrating ? null : new Set([today]);
            const success = await this.storage.save(this.fileName, history, dirtyKeys);
            
            if (success) {
                console.log(`✅ Historial actualizado: ${today} - ${totalDuration}m ${isMigrating ? '(Migración completada)' : ''}`);
                if (typeof window !== 'undefined') window.STREAM_HISTORY = history;
            }
        } catch (error) {
            console.error('❌ Error al guardar historial de stream:', error);
        }
    }

    // Métodos legacy para compatibilidad si se llaman (vaciados)
    startMonitoring() {}
    stopMonitoring() {}
}
