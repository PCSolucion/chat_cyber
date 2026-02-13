import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

export default class AchievementsCommand extends BaseCommand {
    constructor() {
        super('logros', ['achievements', 'tros']);
    }

    execute({ userId, username, services }) {
        if (!services.achievements) return;

        // Pasamos null como userId para forzar uso de username
        const userAchievements = services.achievements.getUserAchievements(null, username) || [];
        const progress = {
            unlocked: userAchievements.length,
            total: services.achievements.getTotalAchievements()
        };
        
        // Emitir evento para mostrar modal de logros (si existiera) o notificación
        console.log(`🏆 !logros solicitado por ${username}: ${progress.unlocked}/${progress.total}`);
        
        // Simular notificación visual en el overlay
        const message = `@${username} -> Has desbloqueado ${progress.unlocked} de ${progress.total} logros.`;
        
        // Emitir evento para mostrar en UI
        EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, message);
    }
}
