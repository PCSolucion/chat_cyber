import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, collection, getDocs, limit, query, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js';
import Logger from '../utils/Logger.js';

/**
 * FirestoreService - Implementación Username-Centric
 * 
 * Gestiona la conexión y operaciones CRUD básicas con Firestore.
 * Utiliza el Nombre de Usuario (lowercase) como ID de documento por simplicidad.
 */
export default class FirestoreService {
    constructor(config) {
        this.config = config;
        this.db = null;
        this.isConfigured = false;
        
        // Métricas básicas para debugging
        this.metrics = { reads: 0, writes: 0, failures: 0 };
    }

    /**
     * Inicializa la conexión con Firestore
     */
    async configure(firebaseConfig) {
        if (this.config.TEST_MODE) {
            Logger.warn('FirestoreService', '[Firestore] Test Mode: Disabled');
            return;
        }

        // Intenta obtener la config si no se pasa explícitamente (Auto-Fix)
        const activeConfig = firebaseConfig || this.config.FIREBASE_CONFIG || this.config.FIREBASE;

        if (!activeConfig) {
            Logger.error('FirestoreService', '❌ Falta configuración de Firebase. Revise config.js');
            return;
        }

        try {
            // PATRÓN SINGLETON: Verificar si la app ya está inicializada para evitar errores de duplicado
            let app;
            if (getApps().length === 0) {
                app = initializeApp(activeConfig);
            } else {
                app = getApp();
            }

            // Usamos getFirestore estándar (sin persistencia offline forzada para mantenerlo simple y RAM-only)
            this.db = getFirestore(app);

            this.isConfigured = true;
            Logger.info('FirestoreService', '🔥 Conectado (Modo: Username Key)');



        } catch (e) {
            Logger.error('FirestoreService', 'Error crítico inicializando:', e);
        }
    }

    /**
     * Obtiene un documento de usuario por Username directamente
     * @param {string} username - Nombre de usuario (Clave única)
     */
    async getUser(username, userId = null) {
        if (!this.isConfigured || !username) return null;
        
        // Limpieza agresiva del nombre de usuario para evitar problemas de espacios o caracteres invisibles
        const key = String(username).trim().toLowerCase();

        try {
            this.metrics.reads++;
            let ref = doc(this.db, 'users', key);
            Logger.info('FirestoreService', `[Firestore] 🔍 Buscando usuario en ruta: users/${key}`);
            let snap = await getDoc(ref);
            
            if (snap.exists()) {
                if (this.config.DEBUG) Logger.debug('Firestore', `📖 Leído: ${key}`);
                return snap.data();
            } else {
                // OPTIMIZACIÓN LECTURAS: Si no existe en minúsculas, asumimos que es nuevo.
                // Eliminados los fallbacks legacy (ID, Case Sensitive) que triplicaban el coste
                // de lectura para usuarios nuevos (First Time Chatters).
                if (this.config.DEBUG) Logger.info('FirestoreService', `[Firestore] Usuario nuevo o no encontrado: ${key}`);
                return null;
            }
        } catch (e) {
            Logger.error('Firestore', `Error leyendo usuario ${key}:`, e);
            throw e;
        }
    }

    /**
     * Guarda o actualiza un usuario directamente
     * @param {string} username - Nombre de usuario
     * @param {Object} data - Datos usuario
     * @param {boolean} merge - Fusionar o sobrescribir (Default: true)
     */
    async saveUser(username, data, merge = true) {
        if (!this.isConfigured || !username) return;
        const key = username.toLowerCase();

        try {
            this.metrics.writes++;
            const ref = doc(this.db, 'users', key);
            
            // Sanitizar datos: JSON.parse/stringify elimina undefineds y funciones que rompen Firestore
            const cleanData = JSON.parse(JSON.stringify(data));
            
            await setDoc(ref, cleanData, { merge });
            if (this.config.DEBUG) Logger.debug('Firestore', `💾 Guardado en ${ref.path}`);
        } catch (e) {
            Logger.error('Firestore', `Error guardando en ${key}:`, e);
            throw e;
        }
    }

    /**
     * Actualiza contadores numéricos de un usuario de forma atómica (Sin lecturas previas)
     * @param {string} username - Nombre de usuario
     * @param {Object} increments - Mapa de campos y valores (ej: { xp: 10, "stats.messages": 1 })
     */
    async updateUserCounters(username, increments) {
        if (!this.isConfigured || !username || !increments) return;
        const key = username.toLowerCase();

        try {
            const ref = doc(this.db, 'users', key);
            const updateObj = {};
            
            for (const [field, value] of Object.entries(increments)) {
                updateObj[field] = increment(value);
            }

            this.metrics.writes++;
            await updateDoc(ref, updateObj);
            
            if (this.config.DEBUG) Logger.debug('Firestore', `📈 Incrementados contadores para ${key}:`, increments);
        } catch (e) {
            this.metrics.failures++; // Increment general failures
            // Si el documento no existe, fallback a setDoc (saveUser)
            if (e.code === 'not-found') {
                Logger.warn('Firestore', `⚠️ Documento ${key} no existe para increment. El UserStateManager debería manejar esto.`);
                // No tenemos los datos completos aquí, el UserStateManager debería manejar esto
            } else {
                Logger.error('Firestore', `Error incrementando contadores de ${key}:`, e);
            }
            throw e; // Propagar error para que UserStateManager no borre los pendientes
        }
    }

    /**
     * Crea una suscripción en tiempo real a un usuario.
     * @param {string} username 
     * @param {Function} callback 
     * @returns {Function} Función para desuscribirse
     */
    watchUser(username, callback) {
        if (!this.isConfigured || !username) return () => {};
        const key = username.toLowerCase();
        const ref = doc(this.db, 'users', key);

        return onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                callback(snap.data());
            } else {
                callback(null);
            }
        }, (error) => {
            Logger.error('Firestore', `Error en suscripción de ${key}:`, error);
        });
    }
    /**
     * Verifica la conexión con Firestore (Stub para compatibilidad)
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        // En Web SDK v9, la conexión es lazy. 
        // Si tenemos configuración y app inicializada, asumimos true.
        // Una prueba real requeriría una lectura/escritura que queremos evitar si no es necesaria.
        return this.isConfigured && !!this.db;
    }

    /**
     * Carga un documento de la colección 'system'
     * @param {string} docId 
     */
    async getSystemData(docId) {
        if (!this.isConfigured || !docId) return null;
        try {
            this.metrics.reads++;
            const ref = doc(this.db, 'system', docId);
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() : null;
        } catch (e) {
            Logger.error('Firestore', `Error cargando system/${docId}:`, e);
            return null;
        }
    }

    /**
     * Guarda un documento en la colección 'system'
     * @param {string} docId 
     * @param {Object} data 
     */
    async saveSystemData(docId, data) {
        if (!this.isConfigured || !docId) return false;
        try {
            this.metrics.writes++;
            const ref = doc(this.db, 'system', docId);
            const cleanData = JSON.parse(JSON.stringify(data));
            await setDoc(ref, cleanData, { merge: true });
            return true;
        } catch (e) {
            this.metrics.failures++;
            Logger.error('Firestore', `Error guardando system/${docId}:`, e);
            throw e; // Bubble up for caller handling
        }
    }

    /**
     * Carga un archivo JSON virtual desde una colección de sistema
     * @param {string} fileName - Nombre del archivo (ej: stream_history.json)
     * @returns {Promise<Object|null>}
     */
    async loadFile(fileName) {
        if (!this.isConfigured || !fileName) return null;
        
        // Mapeo: stream_history.json -> system/stream_history
        const docId = fileName.replace('.json', '');
        const collectionName = 'system';
        
        try {
            this.metrics.reads++;
            const ref = doc(this.db, collectionName, docId);
            const snap = await getDoc(ref);
            
            if (snap.exists()) {
                if (this.config.DEBUG) Logger.debug('Firestore', `📂 Archivo cargado: ${docId}`);
                return snap.data();
            }
            return null;
        } catch (e) {
            Logger.error('Firestore', `Error cargando archivo ${fileName}:`, e);
            // Retornamos null para que el servicio use su valor por defecto
            return null;
        }
    }

    /**
     * Guarda un archivo JSON virtual en una colección de sistema
     * @param {string} fileName 
     * @param {Object} data 
     * @param {Set} dirtyKeys - (Opcional) Claves modificadas par optimización
     */
    async saveFile(fileName, data, dirtyKeys = null) {
        if (!this.isConfigured || !fileName) return false;

        const docId = fileName.replace('.json', '');
        const collectionName = 'system';

        try {
            this.metrics.writes++;
            const ref = doc(this.db, collectionName, docId);
            
            // Sanitizar
            const cleanData = JSON.parse(JSON.stringify(data));
            
            await setDoc(ref, cleanData, { merge: true });
            if (this.config.DEBUG) Logger.debug('Firestore', `💾 Archivo guardado: system/${docId}`);
            return true;
        } catch (e) {
            this.metrics.failures++;
            Logger.error('Firestore', `Error guardando archivo system/${docId}:`, e);
            throw e; // Bubble up
        }
    }

    /**
     * Wrapper de compatibilidad para loadUserDoc
     * @param {string} userId 
     */
    async loadUserDoc(userId) {
        return this.getUser(userId);
    }

    /**
     * Suscripción en tiempo real a documento de sistema
     */
    watchSystemDoc(docId, callback) {
        if (!this.isConfigured || !docId) return () => {};
        const ref = doc(this.db, 'system', docId);
        return onSnapshot(ref, (snap) => {
            if (snap.exists()) callback(snap.data());
        });
    }
}
