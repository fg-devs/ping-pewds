import {Message, User} from "discord.js";
import Bot from "./Bot";

export default class EventHandler {
    private readonly bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    async onReady() {
        const log = EventHandler.getLogger();
        log.info('Bot is ready');
    }

    async onMessage(message: Message) {
        const log = EventHandler.getLogger();
        const pingableController = this.bot.getPingableUserController();
        if (await pingableController.handleMessage(message))
            return;

        const pingController = this.bot.getPingController();
        if (await pingController.handleMessage(message))
            return;

    }

    private static getLogger() {
        return Bot.getLogger('events');
    }
}