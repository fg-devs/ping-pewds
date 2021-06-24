/**
 * A Controller instance is responsible more managing a certain type of entity
 * that may exist in the bot ecosystem
 * @property {string}  name Name of the controller (for logging purposes)
 * @property {Bot} bot bot to get a logger instance
 */
import Bot from "../Bot";
import { Logger } from "../utils/logger";

export default class Controller {
    private readonly name: string;

    protected readonly bot: Bot;

    constructor(bot: Bot, name: string) {
        this.name = name;
        this.bot = bot;
    }

    /**
     * Used by children of Controller to log certain details that may occur
     * @returns {Logger}
     */
    protected getLogger(): Logger {
        return Bot.getLogger(`(controller) ${this.name}`);
    }
}