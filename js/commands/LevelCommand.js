import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';
import { EVENTS } from '../utils/EventTypes.js';

export default class LevelCommand extends BaseCommand {
    constructor() {
        super('nivel', ['level', 'xp', 'rank']);
    }

    execute({ userId, username, services }) {
        if (!services.xp) return;

        try {
            const xpInfo = services.xp.getUserXPInfo(userId, username);
            if (!xpInfo) {
                console.warn(`[LevelCommand] No XP info found for ${username}`);
                return;
            }

            const level = xpInfo.level || 1;
            const title = xpInfo.title || 'MERC';
            const xpProgress = xpInfo.progress || { xpInCurrentLevel: 0, xpNeededForNext: 100 };

            console.log(`📊 !nivel solicitado por ${username}: Nivel ${level} (${title})`);

            const msg = `@${username} -> Nivel ${level} | ${title} | XP: ${Math.floor(xpProgress.xpInCurrentLevel)}/${Math.floor(xpProgress.xpNeededForNext)}`;

            // Emitir evento para mostrar en UI
            EventManager.emit(EVENTS.UI.SYSTEM_MESSAGE, msg);
        } catch (error) {
            console.error('[LevelCommand] Error:', error);
            throw error; // Let CommandManager handle it
        }
    }
}
