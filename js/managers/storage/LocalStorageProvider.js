import BaseStorageProvider from './BaseStorageProvider.js';
import Logger from '../../utils/Logger.js';

/**
 * LocalStorageProvider - Persistencia en el navegador.
 * Útil como fallback cuando no hay internet o para desarrollo rápido.
 */
export default class LocalStorageProvider extends BaseStorageProvider {
    constructor(prefix = 'chat_widget_') {
        super();
        this.prefix = prefix;
    }

    async load(resourceName) {
        try {
            const data = localStorage.getItem(this.prefix + resourceName);
            if (data) {
                Logger.debug('Storage', `Datos cargados desde LocalStorage: ${resourceName}`);
                return JSON.parse(data);
            }
        } catch (error) {
            Logger.warn('Storage', `Error cargando de LocalStorage (${resourceName}):`, error);
        }
        return null;
    }

    async save(resourceName, data) {
        try {
            localStorage.setItem(this.prefix + resourceName, JSON.stringify(data));
            localStorage.setItem(this.prefix + resourceName + '_ts', Date.now().toString());
            Logger.debug('Storage', `Datos guardados en LocalStorage: ${resourceName}`);
            return true;
        } catch (error) {
            Logger.error('Storage', `Error guardando en LocalStorage (${resourceName}):`, error);
            return false;
        }
    }

    async isAvailable() {
        return typeof localStorage !== 'undefined';
    }
}
