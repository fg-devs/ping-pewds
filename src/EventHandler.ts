import { Message } from 'discord.js';
import Bot from './Bot';

export default class EventHandler {
    private readonly bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    async onReady() {
        EventHandler.getLogger().info('Bot is ready');
    }

    async onMessage(message: Message) {
        const pingableController = this.bot.getPingableUserController();
        if (await pingableController.handleMessage(message)) return;

        const pingController = this.bot.getPingController();
        if (await pingController.handleMessage(message)) return;
    }

    private static getLogger() {
        return Bot.getLogger('EventHandler');
    }
}
