import BaseStorageProvider from './BaseStorageProvider.js';
import Logger from '../../utils/Logger.js';

/**
 * FirestoreStorageProvider - Adaptador para FirestoreService.
 * Reemplaza a GistStorageProvider bajo la misma interfaz Strategy.
 */
export default class FirestoreStorageProvider extends BaseStorageProvider {
    /**
     * @param {FirestoreService} firestoreService - El servicio de Firestore
     */
    constructor(firestoreService) {
        super();
        this.firestoreService = firestoreService;
    }

    async load(resourceName) {
        try {
            const data = await this.firestoreService.loadFile(resourceName);
            return data;
        } catch (error) {
            Logger.error('FirestoreProvider', `Fallo crítico en load(${resourceName}):`, error);
            return null;
        }
    }

    async save(resourceName, data) {
        return await this.firestoreService.saveFile(resourceName, data);
    }

    async isAvailable() {
        if (!this.firestoreService.isConfigured) {
            Logger.warn('FirestoreProvider', 'Firestore no está configurado (revisa FIREBASE en config.js)');
            return false;
        }
        const connected = await this.firestoreService.testConnection();
        if (!connected) {
            Logger.error('FirestoreProvider', 'No se pudo verificar la conexión con Firestore');
        }
        return connected;
    }
}
