import Logger from '../../utils/Logger.js';
import EventManager from '../../utils/EventEmitter.js';
import { EVENTS } from '../../utils/EventTypes.js';

/**
 * StorageManager - El orquestador de persistencia.
 * Gestiona una lista de proveedores y maneja fallbacks automáticos.
 */
export default class StorageManager {
    constructor() {
        this.providers = [];
        this.activeProvider = null;
    }

    /**
     * Registra un proveedor en la cadena (el primero tiene prioridad)
     * @param {BaseStorageProvider} provider 
     */
    addProvider(provider) {
        this.providers.push(provider);
        return this;
    }

    /**
     * Inicializa el gestor buscando el primer proveedor disponible
     */
    async init() {
        for (const provider of this.providers) {
            if (await provider.isAvailable()) {
                this.activeProvider = provider;
                Logger.info('Storage', `Proveedor de almacenamiento activo: ${provider.constructor.name}`);
                return;
            }
        }
        Logger.error('Storage', 'No hay proveedores de almacenamiento disponibles');
    }

    /**
     * Carga datos intentando cada proveedor si el anterior falla
     */
    async load(resourceName) {
        // Intentar con el activo primero
        if (this.activeProvider) {
            const data = await this.activeProvider.load(resourceName);
            if (data) return data;
        }

        // Si falla, buscar en los demás (fallback agresivo)
        for (const provider of this.providers) {
            if (provider === this.activeProvider) continue;
            const data = await provider.load(resourceName);
            if (data) {
                Logger.warn('Storage', `Recurso ${resourceName} cargado desde fallback: ${provider.constructor.name}`);
                return data;
            }
        }

        return null;
    }

    /**
     * Guarda datos en el proveedor activo
     */
    async save(resourceName, data) {
        if (!this.activeProvider) {
            Logger.error('Storage', 'Intentando guardar sin proveedor activo');
            return false;
        }

        const success = await this.activeProvider.save(resourceName, data);
        
        if (success) {
            EventManager.emit(EVENTS.STORAGE.DATA_SAVED, { resource: resourceName });
        } else {
            // Si el guardado principal falla, intentar guardar en el siguiente proveedor como backup
            Logger.error('Storage', `Error en guardado principal (${this.activeProvider.constructor.name}). Intentando backup...`);
            for (const provider of this.providers) {
                if (provider === this.activeProvider) continue;
                if (await provider.save(resourceName, data)) {
                    Logger.info('Storage', `Backup exitoso en: ${provider.constructor.name}`);
                    return true;
                }
            }
        }

        return success;
    }
}
