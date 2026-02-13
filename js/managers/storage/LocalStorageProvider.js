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
            // 1. Intentar con la nueva clave (Prefijada)
            let data = localStorage.getItem(this.prefix + resourceName);
            
            // 2. Si no hay, y estamos cargando XP, intentar con la clave LEGACY (sin prefijo y nombre fijo)
            if (!data && (resourceName === 'xp_data.json' || resourceName === 'xp_data')) {
                data = localStorage.getItem('xp_data_backup');
                if (data) {
                    Logger.info('Storage', 'Se encontraron datos heredados (Legacy) en LocalStorage. Migrando...');
                }
            }

            if (data) {
                Logger.debug('Storage', `Datos cargados desde LocalStorage: ${resourceName}`);
                return JSON.parse(data);
            }
        } catch (error) {
            Logger.warn('Storage', `Error cargando de LocalStorage (${resourceName}):`, error);
        }
        return null;
    }

    /**
     * Carga datos de un usuario específico desde el snapshot local
     * @param {string} userId 
     */
    async loadUser(userId) {
        // En LocalStorage guardamos todo en una sola clave "users" dentro de xp_data
        const data = await this.load('xp_data.json');
        if (data && data.users) {
            const id = String(userId).toLowerCase();
            
            // 1. Intentar por clave exacta (ID numérico o nombre exacto)
            if (data.users[id]) return data.users[id];
            
            // 2. Intentar buscar en las CLAVES (por si es un nombre de usuario antiguo)
            const keyFound = Object.keys(data.users).find(k => k.toLowerCase() === id);
            if (keyFound) return data.users[keyFound];
            
            // 3. Intentar búsqueda por displayName o username dentro del objeto
            const byName = Object.values(data.users).find(u => 
                (u.displayName && u.displayName.toLowerCase() === id) ||
                (u.username && u.username.toLowerCase() === id)
            );
            return byName || null;
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
