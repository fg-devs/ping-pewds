import { Message } from 'discord.js';
import Bot from './Bot';
import {BotLogger} from "./utils/logger";

class EventHandler {
    private readonly bot: Bot;

    public constructor(bot: Bot) {
        this.bot = bot;
    }

    public onReady(): void {
        EventHandler.getLogger().info('Bot is ready');
    }

    /**
     * fires whenever a message is sent, checks to see if the
     * sender is a pingable user, if it is, use the pingableController and return.
     * if the message contains a ping of a user with managed pings, use pingController and return
     * @param message
     */
    public async onMessage(message: Message): Promise<void> {
        const pingableController = this.bot.getPingableUserController();
        const pingController = this.bot.getPingController();

        if (await pingableController.handleMessage(message)) return;

        await pingController.handleMessage(message);
        // if (await pingController.handleMessage(message)) return;
    }

    private static getLogger(): BotLogger {
        return Bot.getLogger('[EventHandler]');
    }
}

export default EventHandler;
