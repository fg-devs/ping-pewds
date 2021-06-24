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
        const log = EventHandler.getLogger();
        const pingController = this.bot.getPingController();
        if (pingController.handleMessage(message))
            return;

        const flaggedMentions = pingController.getFlaggedMentions(message);
        if (flaggedMentions.length > 0) {
            let canPing = true
            for (const mentionId of flaggedMentions) {
                if (!pingController.canPing(mentionId)) {
                    canPing = false
                    const flaggedMention = message.mentions.users.get(mentionId);
                    if (flaggedMention) {
                        log.info(`A mention of '${flaggedMention.username}' was caught and  is pending deletion.`);
                    }
                }
            }

            if (!canPing) {
                await message.delete({
                    reason: `Pinging this user is not allowed.`,
                });
                log.info('message was deleted.');
            }
        }
    }

    private static getLogger() {
        return Bot.getLogger('events');
    }
}