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
        // gistService.loadFile ya maneja errores internos y logs
        return await this.gistService.loadFile(resourceName);
    }

    async save(resourceName, data) {
        return await this.gistService.saveFile(resourceName, data);
    }

    async isAvailable() {
        return this.gistService.isConfigured && await this.gistService.testConnection();
    }
}
