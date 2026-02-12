import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import Logger from '../utils/Logger.js';

/**
 * FirestoreService - Night City Edition
 * Gestiona la persistencia en Firebase Firestore con protecciones de cuota.
 */
export default class FirestoreService {
    constructor(config) {
        this.config = config;
        this.db = null;
        this.app = null;
        this.sdk = null;
        this.isConfigured = false;
        this.lastError = null;

        // Contador de seguridad para evitar runaway operations
        this.opCounts = { reads: 0, writes: 0 };
        this.MAX_READS_PER_SESSION = 2000;
        this.MAX_WRITES_PER_SESSION = 1000;

        this.collections = {
            USERS: 'users',
            SYSTEM: 'system',
            HISTORY: 'stream_history'
        };
    }

    /**
     * Inicializa Firebase dinámicamente solo si no estamos en modo test
     */
    async configure(firebaseConfig) {
        if (this.config.TEST_MODE) {
            Logger.warn('Firestore', '🚫 MODO TEST: Firestore no se inicializará.');
            return;
        }

        if (this.isConfigured) return;

        try {
            Logger.info('Firestore', '📡 Cargando SDK de Firebase...');
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js');
            const SDK = await import('https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js');
            
            this.sdk = SDK;
            this.app = initializeApp(firebaseConfig);
            
            try {
                this.db = SDK.initializeFirestore(this.app, {
                    localCache: SDK.persistentLocalCache({
                        tabManager: SDK.persistentMultipleTabManager()
                    })
                });
            } catch (err) {
                this.db = SDK.getFirestore(this.app);
            }

            this.isConfigured = true;
            Logger.info('Firestore', '✅ FirestoreService ONLINE');
        } catch (error) {
            Logger.error('Firestore', 'Fallo al cargar Firebase:', error);
            this.isConfigured = false;
        }
    }

    _checkQuota(type = 'read') {
        if (type === 'read' && this.opCounts.reads >= this.MAX_READS_PER_SESSION) {
            Logger.error('Firestore', '🚨 LÍMITE DE SEGURIDAD ALCANZADO: Bloqueando LECTURAS para proteger cuota.');
            return false;
        }
        if (type === 'write' && this.opCounts.writes >= this.MAX_WRITES_PER_SESSION) {
            Logger.error('Firestore', '🚨 LÍMITE DE SEGURIDAD ALCANZADO: Bloqueando ESCRITURAS para proteger cuota.');
            return false;
        }
        return true;
    }

    async loadFile(fileName) {
        if (!this.isConfigured || !this._checkQuota('read')) return null;

        try {
            if (fileName === 'xp_data.json' || fileName === 'xp_data') {
                Logger.info('Firestore', '🔄 Modo On-Demand: Saltando carga masiva de usuarios.');
                return { users: {}, history: {}, version: '1.2' };
            }

            this.opCounts.reads++;
            Logger.debug('Firestore', `[READ #${this.opCounts.reads}] Archivo: ${fileName}`);

            if (fileName === 'leaderboard.json' || fileName === 'leaderboard') {
                const docRef = this.sdk.doc(this.db, this.collections.SYSTEM, 'leaderboard');
                const snap = await this.sdk.getDoc(docRef);
                return snap.exists() ? snap.data() : null;
            }

            const docId = fileName.replace(/\.json$/, '');
            const docRef = this.sdk.doc(this.db, this.collections.SYSTEM, docId);
            const snap = await this.sdk.getDoc(docRef);
            return snap.exists() ? snap.data() : null;
        } catch (error) {
            Logger.error('Firestore', `Error cargando ${fileName}:`, error);
            return null;
        }
    }

    async loadUserDoc(userId) {
        if (!this.isConfigured || !this._checkQuota('read')) return null;
        if (!userId) return null;

        try {
            this.opCounts.reads++;
            Logger.debug('Firestore', `[READ #${this.opCounts.reads}] Carga de usuario: ${userId}`);

            const userRef = this.sdk.doc(this.db, this.collections.USERS, String(userId));
            const snap = await this.sdk.getDoc(userRef);
            return snap.exists() ? snap.data() : null;
        } catch (error) {
            Logger.error('Firestore', `Error cargando usuario ${userId}:`, error);
            return null;
        }
    }

    async saveFile(fileName, data, dirtyKeys = null) {
        if (!this.isConfigured || !this._checkQuota('write')) return false;

        try {
            this.opCounts.writes++;
            Logger.debug('Firestore', `[WRITE #${this.opCounts.writes}] Guardado de archivo: ${fileName}`);

            if (fileName === 'xp_data.json' || fileName === 'xp_data') {
                return await this._saveUsersBatch(data.users, dirtyKeys);
            }

            const docId = fileName.replace(/\.json$/, '');
            const docRef = this.sdk.doc(this.db, this.collections.SYSTEM, docId);
            await this.sdk.setDoc(docRef, { ...data, lastUpdated: new Date().toISOString() });
            return true;
        } catch (error) {
            Logger.error('Firestore', `Error guardando ${fileName}:`, error);
            return false;
        }
    }

    async _saveUsersBatch(allUsers, dirtyKeys) {
        const keys = dirtyKeys ? Array.from(dirtyKeys) : Object.keys(allUsers);
        if (keys.length === 0) return true;

        const CHUNK_SIZE = 400;
        for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
            const chunk = keys.slice(i, i + CHUNK_SIZE);
            const batch = this.sdk.writeBatch(this.db);
            
            chunk.forEach(id => {
                const userData = allUsers[id];
                if (userData) {
                    const userRef = this.sdk.doc(this.db, this.collections.USERS, String(id));
                    batch.set(userRef, userData, { merge: true });
                }
            });

            await batch.commit();
            this.opCounts.writes++; // Cada batch cuenta como una operación lógica (aunque Firebase cuente documentos)
        }
        return true;
    }

    async testConnection() {
        // Test rápido sin lectura real para ahorrar cuota
        return this.isConfigured && !!this.db;
    }
}
