/**
 * Lista de comandos del bot para la Wiki
 */
const COMMANDS_DATA = [
    {
        name: '!ayuda',
        aliases: ['!help', '!commands', '!comandos'],
        description: 'Muestra un mensaje en el chat con la lista de comandos básicos disponibles.',
        usage: '!ayuda',
        category: 'general',
        cooldown: 10
    },
    {
        name: '!nivel',
        aliases: ['!lvl', '!rank', '!xp'],
        description: 'Consulta tu Nivel actual, XP total y cuánto te falta para subir al siguiente rango.',
        usage: '!nivel',
        category: 'progreso',
        cooldown: 30
    },
    {
        name: '!logros',
        aliases: ['!achievements'],
        description: 'Muestra cuántos logros has desbloqueado en total y cuál fue el último conseguido.',
        usage: '!logros',
        category: 'progreso',
        cooldown: 30
    },
    {
        name: '!stats',
        aliases: [],
        description: 'Muestra estadísticas de tu sesión actual: mensajes enviados hoy y tiempo visto.',
        usage: '!stats',
        category: 'stats',
        cooldown: 60
    },
    {
        name: '!top',
        aliases: ['!ranking', '!leaderboard'],
        description: 'Muestra en el chat el TOP 3 de espectadores con más experiencia acumulada.',
        usage: '!top',
        category: 'ranking',
        cooldown: 60
    },
    {
        name: '!racha',
        aliases: ['!streak'],
        description: 'Consulta tu racha actual de días consecutivos pasándote por el stream.',
        usage: '!racha',
        category: 'progreso',
        cooldown: 30
    },
    {
        name: '!emotes',
        aliases: [],
        description: 'Muestra una lista de tus emotes más utilizados en el chat.',
        usage: '!emotes',
        category: 'stats',
        cooldown: 45
    },
    {
        name: '!bro',
        aliases: [],
        description: 'Incrementa y muestra el contador global de veces que se ha dicho "bro" en el chat.',
        usage: '!bro',
        category: 'diversion',
        cooldown: 15
    },
    {
        name: '!uptime',
        aliases: [],
        description: 'Muestra cuánto tiempo lleva el stream en directo actualmente.',
        usage: '!uptime',
        category: 'general',
        cooldown: 10
    },
    {
        name: '!shoutout',
        aliases: ['!so'],
        description: 'Hace una mención especial a otro streamer, mostrando su último juego y enlace. (Solo Mods/VIPs)',
        usage: '!so @usuario',
        category: 'admin',
        permission: 'mod',
        cooldown: 0
    }
];

if (typeof window !== 'undefined') {
    window.COMMANDS_DATA = COMMANDS_DATA;
} else if (typeof module !== 'undefined') {
    module.exports = COMMANDS_DATA;
}
