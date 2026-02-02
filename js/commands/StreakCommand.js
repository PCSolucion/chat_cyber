import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';

export default class StreakCommand extends BaseCommand {
    constructor() {
        super('racha', ['streak', 'dias']);
    }

    execute({ username, services }) {
        if (!services.xp) return;

        const userData = services.xp.getUserData(username);
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

        EventManager.emit('ui:systemMessage', message);
    }
}
