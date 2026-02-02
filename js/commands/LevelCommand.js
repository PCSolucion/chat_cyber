import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';

export default class LevelCommand extends BaseCommand {
    constructor() {
        super('nivel', ['level', 'xp', 'rank']);
    }

    execute({ username, services }) {
        if (!services.xp) return;

        const xpInfo = services.xp.getUserXPInfo(username);
        if (!xpInfo) return;

        // Aquí podríamos emitir un mensaje de sistema o responder en el chat si tuviéramos un bot
        // Por ahora, usamos el sistema de notificaciones local para mostrarle su nivel al usuario (o a todos en el overlay)
        
        // Opción: Emitir un evento para que el UIManager muestre un "toast" o mensaje especial
        // O simplemente loguearlo por ahora ya que el overlay es visual passivo mayormente
        console.log(`📊 !nivel solicitado por ${username}: Nivel ${xpInfo.level} (${xpInfo.currentXP}/${xpInfo.nextLevelXP})`);

        const message = `@${username} -> Nivel ${xpInfo.level} | ${xpInfo.title} | XP: ${Math.floor(xpInfo.progress.xpInCurrentLevel)}/${Math.floor(xpInfo.progress.xpNeededForNext)}`;

        // Emitir evento para mostrar en UI
        EventManager.emit('ui:systemMessage', message);
    }
}
