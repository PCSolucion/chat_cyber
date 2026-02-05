import LevelCommand from './LevelCommand.js';
import AchievementsCommand from './AchievementsCommand.js';
import TopCommand from './TopCommand.js';
import StreakCommand from './StreakCommand.js';
import BroCommand from './BroCommand.js';
import HelpCommand from './HelpCommand.js';
import StatsCommand from './StatsCommand.js';
import UptimeCommand from './UptimeCommand.js';
import EmotesCommand from './EmotesCommand.js';
import ShoutoutCommand from './ShoutoutCommand.js';

/**
 * Lista de todos los comandos disponibles en la aplicación
 */
export const ALL_COMMANDS = [
    new HelpCommand(),
    new LevelCommand(),
    new AchievementsCommand(),
    new TopCommand(),
    new StreakCommand(),
    new BroCommand(),
    new StatsCommand(),
    new UptimeCommand(),
    new EmotesCommand(),
    new ShoutoutCommand()
];
