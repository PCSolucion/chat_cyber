import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';
import Logger from '../utils/Logger.js';

export default class LevelCommand extends BaseCommand {
    constructor() {
        super('nivel', {
            aliases: ['level', 'xp', 'rank'],
            description: 'Muestra tu nivel, rango y progreso de XP'
        });
    }

    async execute({ userId, username, services }) {
        if (!services.xp || !services.stateManager) return;
        
        // Usamos username como clave
        const key = username; 

        try {
            // FORZAR CONSULTA A FIRESTORE: Asegurar datos frescos antes de responder el comando
            // Llamada simple: el StateManager ya sabe que es un username
            await services.stateManager.ensureUserLoaded(key);
            
            // Getting info delegates to ExperienceService -> StateManager
            // We pass null as ID to force username usage
            const xpInfo = services.xp.getUserXPInfo(key);
            
            if (!xpInfo) {
                Logger.warn('LevelCommand', `[LevelCommand] No XP info found for ${username}`);
                return;
            }

            const level = xpInfo.level || 1;
            const title = xpInfo.title || 'MERC';
            // ExperienceService devuelve 'progress' con los datos calculados
            const xpProgress = xpInfo.progress || { xpInCurrentLevel: 0, xpNeededForNext: 100 };

            Logger.info('LevelCommand', `📊 !nivel solicitado por ${username}: Nivel ${level} (${title})`);

            const msg = `@${username} -> Nivel ${level} | ${title} | XP: ${Math.floor(xpProgress.xpInCurrentLevel)}/${Math.floor(xpProgress.xpNeededForNext)}`;

            // Emitir evento para mostrar en UI
            EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, msg);
        } catch (error) {
            Logger.error('LevelCommand', '[LevelCommand] Error:', error);
            throw error; // Let CommandManager handle it
        }
    }
}
