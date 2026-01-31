/**
 * GistStorageService - Servicio de Persistencia con GitHub Gist
 * 
 * Responsabilidades:
 * - Guardar datos de XP en GitHub Gist
 * - Cargar datos de XP desde GitHub Gist
 * - Manejar autenticación con Personal Access Token
 * - Cache local para reducir requests
 * 
 * Límites con Token: 5,000 requests/hora
 * 
 * @class GistStorageService
 */
class GistStorageService {
    /**
     * Constructor del servicio de almacenamiento
     * @param {Object} config - Configuración global
     */
    constructor(config) {
        this.config = config;

        // Configuración de Gist
        this.gistId = config.XP_GIST_ID || null;
        this.token = config.XP_GIST_TOKEN || null;
        this.fileName = config.XP_GIST_FILENAME || 'xp_data.json';

        // API endpoint
        this.apiBase = 'https://api.github.com';

        // Cache local
        this.cache = null;
        this.cacheTimestamp = null;
        this.cacheTTL = 60000; // 1 minuto de cache
        this.lastError = null; // Store last error for UI debugging

        // Control de rate limiting
        this.requestCount = 0;
        this.requestResetTime = null;

        // Flag de inicialización
        this.isConfigured = false;
    }

    /**
     * Configura el servicio con credenciales
     * @param {string} gistId - ID del Gist
     * @param {string} token - Personal Access Token de GitHub
     * @param {string} fileName - Nombre del archivo en el Gist
     */
    configure(gistId, token, fileName = 'xp_data.json') {
        this.gistId = gistId;
        this.token = token;
        this.fileName = fileName;
        this.isConfigured = !!(gistId && token);

        if (this.isConfigured) {
            console.log('✅ GistStorageService configurado correctamente');
        } else {
            console.warn('⚠️ GistStorageService: Faltan credenciales (gistId o token)');
            this.lastError = 'Credenciales no configuradas (Revisa config.js)';
        }
    }

    /**
     * Verifica si el servicio está configurado
     * @returns {boolean}
     */
    checkConfiguration() {
        if (!this.isConfigured) {
            if (!this.gistId) {
                console.error('❌ GistStorageService: Falta XP_GIST_ID en config');
            }
            if (!this.token) {
                console.error('❌ GistStorageService: Falta XP_GIST_TOKEN en config');
            }
            return false;
        }
        return true;
    }

    /**
     * Headers para requests autenticadas
     * @returns {Object}
     */
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28'
        };
    }

    /**
     * Carga un archivo JSON desde el Gist
     * @param {string} fileName - Nombre del archivo en el Gist
     * @returns {Promise<Object|null>}
     */
    async loadFile(fileName) {
        if (!this.checkConfiguration()) return null;

        try {
            const response = await fetch(`${this.apiBase}/gists/${this.gistId}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            this.updateRateLimitInfo(response);

            if (!response.ok) throw new Error(`GitHub API Error: ${response.status}`);

            const gist = await response.json();
            const file = gist.files[fileName];

            if (!file) {
                console.warn(`⚠️ Archivo ${fileName} no encontrado en Gist`);
                return null;
            }

            return JSON.parse(file.content);
        } catch (error) {
            console.error(`❌ Error al cargar ${fileName}:`, error);
            return null;
        }
    }

    /**
     * Guarda un archivo JSON en el Gist
     * @param {string} fileName - Nombre del archivo
     * @param {Object} data - Datos JSON a guardar
     * @returns {Promise<boolean>}
     */
    async saveFile(fileName, data) {
        if (!this.checkConfiguration()) return false;

        try {
            const content = JSON.stringify(data, null, 2);

            const response = await fetch(`${this.apiBase}/gists/${this.gistId}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    files: {
                        [fileName]: { content: content }
                    }
                })
            });

            this.updateRateLimitInfo(response);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            if (this.config.DEBUG) console.log(`💾 ${fileName} guardado en Gist`);
            return true;

        } catch (error) {
            console.error(`❌ Error al guardar ${fileName}:`, error);
            return false;
        }
    }

    /**
     * Carga los datos de XP desde el Gist (Wrapper para compatibilidad)
     */
    async loadXPData(forceRefresh = false) {
        // ... (Mantiene lógica de cache específica para XP si es necesario, 
        // o simplificamos para usar loadFile si el cache no es crítico aquí 
        // pero mantendremos la implementación original para no romper nada, 
        // solo añadiendo los métodos genéricos arriba)

        // RE-IMPLEMENTACIÓN PARCIAL para usar caché de XP
        this.lastError = null;
        if (!this.checkConfiguration()) {
            return this.loadFromLocalStorage();
        }

        if (!forceRefresh && this.cache && this.cacheTimestamp && (Date.now() - this.cacheTimestamp < this.cacheTTL)) {
            if (this.config.DEBUG) console.log('📦 Usando cache de XP data');
            return this.cache;
        }

        const data = await this.loadFile(this.fileName);
        if (data) {
            this.cache = data;
            this.cacheTimestamp = Date.now();
            this.saveToLocalStorage(data);
            return data;
        } else {
            // Si falla loadFile, intentamos crear si no exite o devolver backup
            // Por simplicidad, retornamos backup si loadFile falla
            return this.loadFromLocalStorage();
        }
    }

    /**
     * Guarda los datos de XP en el Gist (Wrapper)
     */
    async saveXPData(data) {
        this.saveToLocalStorage(data);
        const success = await this.saveFile(this.fileName, data);
        if (success) {
            this.cache = data;
            this.cacheTimestamp = Date.now();
        }
        return success;
    }

    /**
     * Crea el archivo de XP vacío en el Gist
     * @returns {Promise<Object>}
     */
    async createEmptyXPFile() {
        const emptyData = {
            users: {},
            lastUpdated: new Date().toISOString(),
            version: '1.0'
        };

        await this.saveXPData(emptyData);
        return emptyData;
    }

    /**
     * Actualiza información de rate limiting desde headers
     * @param {Response} response - Response de fetch
     */
    updateRateLimitInfo(response) {
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const reset = response.headers.get('X-RateLimit-Reset');

        if (remaining !== null) {
            this.requestCount = parseInt(remaining);
        }

        if (reset !== null) {
            this.requestResetTime = new Date(parseInt(reset) * 1000);
        }

        if (this.config.DEBUG && remaining !== null) {
            console.log(`📊 Rate limit: ${remaining} requests restantes`);
        }
    }

    /**
     * Obtiene información del rate limit actual
     * @returns {Object}
     */
    getRateLimitInfo() {
        return {
            remaining: this.requestCount,
            resetTime: this.requestResetTime,
            isLow: this.requestCount < 100
        };
    }

    /**
     * Guarda datos en localStorage como backup
     * @param {Object} data - Datos a guardar
     */
    saveToLocalStorage(data) {
        try {
            localStorage.setItem('xp_data_backup', JSON.stringify(data));
            localStorage.setItem('xp_data_timestamp', Date.now().toString());
        } catch (error) {
            console.warn('⚠️ No se pudo guardar backup en localStorage:', error);
        }
    }

    /**
     * Carga datos desde localStorage (fallback)
     * @returns {Object|null}
     */
    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('xp_data_backup');
            if (data) {
                console.log('📦 Usando backup de localStorage');
                return JSON.parse(data);
            }
        } catch (error) {
            console.warn('⚠️ Error al cargar backup de localStorage:', error);
        }
        return null;
    }

    /**
     * Sincroniza localStorage con Gist (útil después de estar offline)
     * @returns {Promise<boolean>}
     */
    async syncLocalToGist() {
        const localData = this.loadFromLocalStorage();
        if (localData) {
            return await this.saveXPData(localData);
        }
        return false;
    }

    /**
     * Verifica la conexión con el Gist
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        if (!this.checkConfiguration()) {
            return false;
        }

        try {
            const response = await fetch(`${this.apiBase}/gists/${this.gistId}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            this.updateRateLimitInfo(response);

            if (response.ok) {
                console.log('✅ Conexión con Gist verificada');
                return true;
            } else {
                console.error(`❌ Error de conexión: ${response.status}`);
                return false;
            }

        } catch (error) {
            console.error('❌ Error al verificar conexión:', error);
            return false;
        }
    }

    /**
     * Crea un nuevo Gist para almacenar XP (solo se usa una vez)
     * @param {string} token - Personal Access Token
     * @param {string} description - Descripción del Gist
     * @returns {Promise<string|null>} ID del Gist creado
     */
    async createNewGist(token, description = 'Twitch Chat XP Data') {
        try {
            const response = await fetch(`${this.apiBase}/gists`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: description,
                    public: false, // Gist privado
                    files: {
                        [this.fileName]: {
                            content: JSON.stringify({
                                users: {},
                                lastUpdated: new Date().toISOString(),
                                version: '1.0'
                            }, null, 2)
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const gist = await response.json();
            console.log(`✅ Gist creado con ID: ${gist.id}`);
            console.log(`📎 URL: ${gist.html_url}`);

            return gist.id;

        } catch (error) {
            console.error('❌ Error al crear Gist:', error);
            return null;
        }
    }

    /**
     * Invalida el cache local
     */
    invalidateCache() {
        this.cache = null;
        this.cacheTimestamp = null;
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GistStorageService;
}
