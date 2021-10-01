/**
 * A Controller instance is responsible more managing a certain type of entity
 * that may exist in the bot ecosystem
 * @property {string}  name Name of the controller (for logging purposes)
 * @property {Bot} bot bot to get a logger instance
 */
import Bot from '../Bot';
import { BotLogger } from '../utils/logger';

class Controller {
    private readonly name: string;

    protected readonly bot: Bot;

    constructor(bot: Bot, name: string) {
        this.name = name;
        this.bot = bot;
    }

    /**
     * Used on *most* promise catch statements to allow the bot to continue running if something fails
     */
    protected handleError = (err: Error): null => {
        this.getLogger().error(err);
        return null;
    };

    protected getLogger(): BotLogger {
        return Bot.getLogger(`[Controller::${this.name}]`);
    }
}

export default Controller;
