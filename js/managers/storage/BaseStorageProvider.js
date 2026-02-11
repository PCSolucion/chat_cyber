/**
 * BaseStorageProvider - Interfaz base para proveedores de persistencia.
 * Sigue el patrón Strategy para permitir cambiar el destino de guardado 
 * (Gist, LocalStorage, Firebase, etc.) de forma transparente.
 */
export default class BaseStorageProvider {
    /**
     * Carga un recurso por su nombre/ID
     * @param {string} resourceName 
     * @returns {Promise<Object|null>}
     */
    async load(resourceName) {
        throw new Error('Método load() no implementado');
    }

    /**
     * Guarda datos en un recurso
     * @param {string} resourceName 
     * @param {Object} data 
     * @returns {Promise<boolean>}
     */
    async save(resourceName, data) {
        throw new Error('Método save() no implementado');
    }

    /**
     * Verifica si el proveedor es funcional (conectividad, config, etc.)
     * @returns {Promise<boolean>}
     */
    async isAvailable() {
        return true;
    }
}
