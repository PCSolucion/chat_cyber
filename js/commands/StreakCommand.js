import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

export default class StreakCommand extends BaseCommand {
    constructor() {
        super('racha', {
            aliases: ['streak', 'dias'],
            description: 'Muestra tu racha de días viendo el canal'
        });
    }

    execute({ userId, username, services }) {
        if (!services.xp) return;

        // Pasamos null como userId para forzar uso de username
        const userData = services.xp.getUserData(null, username);
        const streakDays = userData.streakDays || 0;
        
        let message = '';
        if (streakDays === 0) {
            message = `@${username} -> No tienes racha activa. ¡Empieza hoy!`;
        } else {
            const multiplier = services.xp.streakManager 
                ? services.xp.streakManager.getStreakMultiplier(streakDays) 
                : 1;
                
            message = `@${username} -> 🔥 Racha: ${streakDays} días consecutivos (Bono x${multiplier.toFixed(1)})`;
        }

        EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, message);
    }
}
