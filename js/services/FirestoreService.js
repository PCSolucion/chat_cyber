import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    getDocs, 
    writeBatch,
    enableMultiTabIndexedDbPersistence 
} from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import Logger from '../utils/Logger.js';

/**
 * FirestoreService - Servicio de Persistencia con Firebase Firestore
 * 
 * REFACTORIZADO (v1.1.5): Ahora utiliza una estructura de documentos individuales
 * por usuario en lugar de un único documento monolítico.
 * 
 * Ventajas:
 * - Supera el límite de 1MB por documento.
 * - Lecturas y escrituras atómicas por usuario.
 * - Mayor escalabilidad.
 * 
 * @class FirestoreService
 */
export default class FirestoreService {
    /**
     * @param {Object} config - Configuración global de la app
     */
    constructor(config) {
        this.config = config;
        this.app = null;
        this.db = null;
        this.isConfigured = false;
        this.lastError = null;

        // Nombres de colecciones
        this.collections = {
            USERS: 'users',
            HISTORY: 'stream_history',
            SYSTEM: 'system_data'
        };
    }

    /**
     * Inicializa Firebase y Firestore con la configuración proporcionada
     * @param {Object} firebaseConfig - Objeto de configuración de Firebase
     */
    configure(firebaseConfig) {
        try {
            if (!firebaseConfig || !firebaseConfig.projectId) {
                Logger.warn('Firestore', 'Configuración de Firebase incompleta');
                this.lastError = 'Configuración de Firebase incompleta (Revisa config.js)';
                this.isConfigured = false;
                return;
            }

            this.app = initializeApp(firebaseConfig);
            this.db = getFirestore(this.app);
            
            // Habilitar persistencia offline (Cache IndexedDB) multi-pestaña
            enableMultiTabIndexedDbPersistence(this.db).catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('Firestore Persistence: Multiple tabs open, using single-tab mode');
                } else if (err.code === 'unimplemented') {
                    console.warn('Firestore Persistence: Not supported by browser');
                }
            });

            this.isConfigured = true;

            Logger.info('Firestore', 'FirestoreService configurado correctamente');
        } catch (error) {
            Logger.error('Firestore', 'Error al inicializar Firebase:', error);
            this.lastError = `Error de inicialización: ${error.message}`;
            this.isConfigured = false;
        }
    }

    /**
     * Carga datos desde Firestore. 
     * Si es 'xp_data.json', recupera toda la colección de usuarios.
     * @param {string} fileName - Nombre del recurso (ej: "xp_data.json")
     * @returns {Promise<Object|null>}
     */
    async loadFile(fileName) {
        if (!this.isConfigured) {
            Logger.error('Firestore', 'Servicio no configurado');
            return null;
        }

        try {
            // Caso Especial: XP Data (Colección de usuarios)
            if (fileName === 'xp_data.json' || fileName === 'xp_data') {
                return await this._loadUsersCollection();
            }

            // Caso Especial: Stream History (Colección de sesiones)
            if (fileName === 'stream_history.json' || fileName === 'stream_history') {
                return await this._loadHistoryCollection();
            }

            // Caso Especial: Leaderboard (Ranking resumido)
            if (fileName === 'leaderboard.json' || fileName === 'leaderboard') {
                const lbRef = doc(this.db, this.collections.SYSTEM, 'leaderboard');
                const lbSnap = await getDoc(lbRef);
                return lbSnap.exists() ? lbSnap.data() : null;
            }

            // Otros documentos (System config, etc)
            const docId = fileName.replace(/\.json$/, '');
            const docRef = doc(this.db, this.collections.SYSTEM, docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            Logger.error('Firestore', `Error al cargar ${fileName}:`, error);
            this.lastError = error.message;
            return null;
        }
    }

    /**
     * Carga un documento de usuario específico por ID
     * @param {string} userId - El ID numérico (o antiguo username) del usuario
     */
    async loadUserDoc(userId) {
        if (!this.isConfigured) return null;
        try {
            const userRef = doc(this.db, this.collections.USERS, String(userId));
            const userSnap = await getDoc(userRef);
            return userSnap.exists() ? userSnap.data() : null;
        } catch (error) {
            Logger.error('Firestore', `Error cargando usuario ${userId}:`, error);
            return null;
        }
    }

    /**
     * Carga todos los usuarios de la colección individual
     * @private
     */
    async _loadUsersCollection() {
        Logger.info('Firestore', '🔄 Modo On-Demand: Saltando carga masiva de usuarios.');
        return {};
    }
    async _loadHistoryCollection() {
        // OPTIMIZACIÓN CRÍTICA: No cargamos todo el historial al iniciar.
        Logger.info('Firestore', '🔄 Modo On-Demand: Saltando carga masiva de historial.');
        return {};
    }

    /**
     * Guarda datos en Firestore.
     * Si es 'xp_data.json', guarda los usuarios modificados de forma individual.
     * @param {string} fileName - Nombre del recurso
     * @param {Object} data - Datos JSON a guardar
     * @param {Set|Array} [dirtyKeys] - Opcional: Lista de IDs que realmente han cambiado
     * @returns {Promise<boolean>}
     */
    async saveFile(fileName, data, dirtyKeys = null) {
        if (!this.isConfigured) return false;

        try {
            // Caso Especial: Usuarios
            if (fileName === 'xp_data.json' || fileName === 'xp_data') {
                return await this._saveUsers(data.users, dirtyKeys);
            }

            // Caso Especial: Historial
            if (fileName === 'stream_history.json' || fileName === 'stream_history') {
                return await this._saveHistory(data, dirtyKeys);
            }

            // Caso Especial: Leaderboard
            if (fileName === 'leaderboard.json' || fileName === 'leaderboard') {
                const lbRef = doc(this.db, this.collections.SYSTEM, 'leaderboard');
                await setDoc(lbRef, {
                    ...data,
                    lastUpdated: new Date().toISOString()
                });
                return true;
            }

            // Guardado estándar para otros archivos
            const docId = fileName.replace(/\.json$/, '');
            const docRef = doc(this.db, this.collections.SYSTEM, docId);
            await setDoc(docRef, {
                ...data,
                lastUpdated: new Date().toISOString()
            });

            return true;
        } catch (error) {
            Logger.error('Firestore', `Error al guardar ${fileName}:`, error);
            throw error;
        }
    }

    /**
     * Guarda usuarios de forma individual usando Batch para eficiencia.
     * @private
     */
    async _saveUsers(allUsers, dirtyKeys = null) {
        // Asegurar que tenemos algo que guardar
        if (!allUsers) return true;

        // Si tenemos dirtyKeys, solo guardamos esos. Si no, todos (migración).
        const keysToSave = dirtyKeys ? Array.from(dirtyKeys) : 
                          (allUsers instanceof Map ? Array.from(allUsers.keys()) : Object.keys(allUsers));
        
        if (keysToSave.length === 0) return true;

        Logger.info('Firestore', `Iniciando guardado de ${keysToSave.length} usuarios...`);

        // Firestore tiene un límite de 500 operaciones por batch.
        const CHUNK_SIZE = 400;
        for (let i = 0; i < keysToSave.length; i += CHUNK_SIZE) {
            const chunk = keysToSave.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(this.db);
            
            chunk.forEach(id => {
                const userData = (allUsers instanceof Map) ? allUsers.get(id) : allUsers[id];
                if (userData) {
                    const userRef = doc(this.db, this.collections.USERS, String(id));
                    batch.set(userRef, userData, { merge: true });
                }
            });

            await batch.commit();
            Logger.debug('Firestore', `Batch procesado: ${i + chunk.length}/${keysToSave.length}`);
        }

        Logger.info('Firestore', '✅ Guardado masivo completado con éxito');
        EventManager.emit(EVENTS.STORAGE.DATA_SAVED);
        return true;
    }

    /**
     * Guarda el historial de forma individual.
     * @private
     */
    async _saveHistory(allHistory, dirtyKeys = null) {
        const batch = writeBatch(this.db);
        let count = 0;

        // Si tenemos dirtyKeys, solo esos. Si no (migración), extraemos las claves del objeto
        // pero quitamos las metas (version, lastUpdated, _isMigrated)
        const keysToSave = dirtyKeys ? Array.from(dirtyKeys) : Object.keys(allHistory).filter(k => k !== 'version' && k !== 'lastUpdated' && k !== '_isMigrated');

        for (const dateId of keysToSave) {
            const sessionData = allHistory[dateId];
            if (!sessionData) continue;

            const historyRef = doc(this.db, this.collections.HISTORY, dateId);
            batch.set(historyRef, sessionData, { merge: true });
            count++;

            if (count >= 450) break; 
        }

        if (count > 0) {
            await batch.commit();
            Logger.debug('Firestore', `History Batch completado: ${count} días actualizados`);
            EventManager.emit(EVENTS.STORAGE.DATA_SAVED);
            return true;
        }

        return true;
    }


    /**
     * Verifica la conexión con Firestore
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        if (!this.isConfigured) {
            return false;
        }

        try {
            // Intentamos leer un documento de prueba para verificar conectividad
            // Usamos la colección de sistema para el test
            const testRef = doc(this.db, this.collections.SYSTEM, '_connection_test');
            await getDoc(testRef);
            Logger.info('Firestore', '✅ Conexión con Firestore verificada');
            return true;
        } catch (error) {
            Logger.error('Firestore', '❌ Error al verificar conexión:', error);
            this.lastError = error.message;
            return false;
        }
    }
}
