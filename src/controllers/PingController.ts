import Controller from "./controller";
import Bot from "../Bot";
import {CONFIG} from "../globals";
import {Message} from "discord.js";
import Timeout = NodeJS.Timeout;

export class PingController extends Controller {

    constructor(bot: Bot) {
        super(bot, 'PingController')
    }

    public async handleMessage(message: Message) {
        const log = this.getLogger();
        if (message.author.bot
            || CONFIG.bot.excludedChannels.indexOf(message.channel.id) >= 0)
            return false;

        const flaggedMentions = this.getFlaggedMentions(message);
        if (flaggedMentions.length > 0) {
            const pingedUsers: string[] = [];
            let canPing = true
            for (const mentionId of flaggedMentions) {
                if (!this.canPing(mentionId)) {
                    canPing = false
                    const flaggedMention = message.mentions.users.get(mentionId);
                    if (flaggedMention) {
                        pingedUsers.push(flaggedMention.username);
                        log.info(`A mention of '${flaggedMention.username}' was caught and  is pending deletion.`);
                    }
                }
            }

            if (!canPing) {
                await message.delete();
                log.info('message was deleted.');
                const notification = await message.channel.send({ content: `Please do not ping *${pingedUsers.join(', ')}*.`})

                // TODO handle punishment

                await notification.delete({ timeout: 10000 })
            }

            return true;
        }
        return false;
    }

    getFlaggedMentions(message: Message): string[] {
        return CONFIG.bot.block.filter((id) =>
            message.mentions.has(id)
        )
    }

    canPing(snowflake: string) {
        const now = Date.now();
        const cached = this.bot.getPingableUserController().getCache()[snowflake];
        if (typeof cached === 'number') {
            return cached >= now;
        }
        return false;
    }

}
