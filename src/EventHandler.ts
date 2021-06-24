import { Message, PartialMessage } from "discord.js";
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
        console.log(message);
    }

    testEvent(message: Message | PartialMessage) {
        console.log(message);
    }

    private static getLogger() {
        return Bot.getLogger('events');
    }
}