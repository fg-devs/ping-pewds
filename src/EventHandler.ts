import { Message } from 'discord.js';
import winston from 'winston';
import Bot from './Bot';

class EventHandler {
    private readonly bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    onReady(): void {
        EventHandler.getLogger().info('Bot is ready');
    }

    /**
     * fires whenever a message is sent, checks to see if the
     * sender is a pingable user, if it is, use the pingableController and return.
     * if the message contains a ping of a user with managed pings, use pingController and return
     * @param message
     */
    async onMessage(message: Message): Promise<void> {
        const pingableController = this.bot.getPingableUserController();
        if (await pingableController.handleMessage(message)) return;

        const pingController = this.bot.getPingController();
        await pingController.handleMessage(message);
        // if (await pingController.handleMessage(message)) return;
    }

    private static getLogger(): winston.Logger {
        return Bot.getLogger('EventHandler');
    }
}

export default EventHandler;
