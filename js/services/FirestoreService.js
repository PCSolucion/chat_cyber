import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import Logger from '../utils/Logger.js';

/**
 * FirestoreService - Servicio de Persistencia con Firebase Firestore
 * 
 * Reemplaza a GistStorageService. Misma interfaz, mejor backend.
 * 
 * Ventajas sobre Gist:
 * - Sin truncación de datos
 * - Sin rate limiting de GitHub (5,000 req/hora)
 * - Menor latencia
 * - Escalable
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

        // Nombre de la colección en Firestore donde se guardan los datos
        this.collectionName = 'app_data';
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
            this.isConfigured = true;

            Logger.info('Firestore', 'FirestoreService configurado correctamente');
        } catch (error) {
            Logger.error('Firestore', 'Error al inicializar Firebase:', error);
            this.lastError = `Error de inicialización: ${error.message}`;
            this.isConfigured = false;
        }
    }

    /**
     * Convierte un nombre de archivo (ej: "xp_data.json") en un ID de documento limpio
     * @param {string} fileName - Nombre del archivo original
     * @returns {string} ID de documento para Firestore
     */
    _toDocId(fileName) {
        // "xp_data.json" → "xp_data"
        return fileName.replace(/\.json$/, '');
    }

    /**
     * Carga un documento desde Firestore
     * @param {string} fileName - Nombre del recurso (ej: "xp_data.json")
     * @returns {Promise<Object|null>}
     */
    async loadFile(fileName) {
        if (!this.isConfigured) {
            Logger.error('Firestore', 'Servicio no configurado');
            return null;
        }

        try {
            const docId = this._toDocId(fileName);
            const docRef = doc(this.db, this.collectionName, docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const raw = docSnap.data();
                Logger.debug('Firestore', `Documento "${docId}" cargado correctamente`);

                // Si los datos fueron serializados al guardar, los deserializamos
                if (raw._serialized) {
                    try {
                        const parsed = JSON.parse(raw._serialized);
                        return { ...parsed, lastUpdated: raw.lastUpdated, version: raw.version };
                    } catch (e) {
                        Logger.error('Firestore', 'Error deserializando _serialized:', e);
                        return raw;
                    }
                }

                return raw;
            } else {
                Logger.warn('Firestore', `Documento "${docId}" no encontrado`);
                return null;
            }
        } catch (error) {
            Logger.error('Firestore', `Error al cargar ${fileName}:`, error);
            this.lastError = error.message;
            return null;
        }
    }

    /**
     * Guarda un documento en Firestore
     * Serializa el campo 'users' como JSON string para evitar el límite
     * de 40,000 entradas de índice por documento.
     * @param {string} fileName - Nombre del recurso
     * @param {Object} data - Datos JSON a guardar
     * @returns {Promise<boolean>}
     */
    async saveFile(fileName, data) {
        if (!this.isConfigured) {
            Logger.error('Firestore', 'Servicio no configurado');
            return false;
        }

        try {
            const docId = this._toDocId(fileName);
            const docRef = doc(this.db, this.collectionName, docId);

            // Serializar el objeto pesado (users) como string JSON
            // para evitar que Firestore indexe cada subcampo
            const toSave = {
                _serialized: JSON.stringify(data.users || {}),
                lastUpdated: data.lastUpdated || new Date().toISOString(),
                version: data.version || '1.1'
            };

            await setDoc(docRef, toSave);

            Logger.debug('Firestore', `Documento "${docId}" guardado con éxito`);
            EventManager.emit(EVENTS.STORAGE.DATA_SAVED);
            return true;
        } catch (error) {
            Logger.error('Firestore', `Error al guardar ${fileName}:`, error);
            this.lastError = error.message;
            throw error;
        }
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
            const testRef = doc(this.db, this.collectionName, '_connection_test');
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
