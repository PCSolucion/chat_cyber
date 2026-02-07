/**
 * BaseScreen - Clase base para todas las pantallas de Idle
 */
export default class BaseScreen {
    constructor() {
        this.type = 'base';
    }

    /**
     * Renderiza el contenido de la pantalla
     * @param {Object} data Datos específicos para la pantalla
     * @param {HTMLElement} container Contenedor donde renderizar
     */
    render(data, container) {
        throw new Error('Method render() must be implemented');
    }

    /**
     * Calcula duración óptima de visualización
     * @param {Object} data Datos de la pantalla
     * @param {number} baseDuration Duración base configurada
     */
    calculateDuration(data, baseDuration) {
        return baseDuration;
    }
}
