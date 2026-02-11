import BaseStorageProvider from './BaseStorageProvider.js';
import Logger from '../../utils/Logger.js';

/**
 * GistStorageProvider - Adaptador para GistStorageService.
 * Mantiene la lógica pesada de Gist pero bajo la interfaz de Strategy.
 */
export default class GistStorageProvider extends BaseStorageProvider {
    /**
     * @param {GistStorageService} gistService - El servicio original de Gist
     */
    constructor(gistService) {
        super();
        this.gistService = gistService;
    }

    async load(resourceName) {
        try {
            // gistService.loadFile ya maneja errores internos y logs
            const data = await this.gistService.loadFile(resourceName);
            return data;
        } catch (error) {
            Logger.error('GistProvider', `Fallo crítico en load(${resourceName}):`, error);
            return null;
        }
    }

    async save(resourceName, data) {
        return await this.gistService.saveFile(resourceName, data);
    }

    async isAvailable() {
        if (!this.gistService.isConfigured) {
            Logger.warn('GistProvider', 'Gist no está configurado (faltan ID o Token)');
            return false;
        }
        const connected = await this.gistService.testConnection();
        if (!connected) {
            Logger.error('GistProvider', 'No se pudo verificar la conexión con GitHub Gist');
        }
        return connected;
    }
}
