import Controller from './controller';
import Bot from '../Bot';
import { CONFIG } from '../globals';
import { Message } from 'discord.js';

export class PingController extends Controller {
    constructor(bot: Bot) {
        super(bot, 'PingController');
    }

    /**
     * checks for messages that include pings of users who should not be pinged
     * if a ping is found, it is removed and a message is sent to the channel
     * telling the user to not ping this user.
     * @todo handle punishments
     */
    public async handleMessage(message: Message): Promise<boolean> {
        if (
            message.author.bot ||
            CONFIG.bot.excludedChannels.indexOf(message.channel.id) >= 0
        )
            return false;

        const flaggedMentions = this.getFlaggedMentions(message);
        if (flaggedMentions.length === 0)
            return false;

        const pingedUsers: string[] = [];
        let canPing = true;
        for (const mentionId of flaggedMentions) {
            if (!this.canPing(mentionId)) {
                canPing = false;
                const flaggedMention = message.mentions.users.get(mentionId);
                if (flaggedMention) {
                    pingedUsers.push(`<@${flaggedMention.id}>`);
                    this.getLogger().info(
                        `A mention of '${flaggedMention.username}' was caught and  is pending deletion.`
                    );
                }
            }
        }

        if (!canPing) {
            await message.delete().catch(this.handleError);
            const notification = await message.channel
                .send({
                    content: `Please do not ping ${pingedUsers.join(
                        ', '
                    )} unless they are active.`,
                    allowedMentions: { users: [] },
                })
                .catch(this.handleError);

            // TODO handle punishments

            if (notification) {
                await notification.delete({ timeout: 10000 }).catch(this.handleError);
            }
        }

        return true;
    }

    /**
     * checks to see if the message contains any pings of users that should not be pinged
     * and returns all the user id that are mentioned that should not be.
     */
    private getFlaggedMentions(message: Message): string[] {
        return CONFIG.bot.block.filter((id) => message.mentions.has(id));
    }

    /**
     * compares the current timestamp with the timestamp of the last message sent by the managed users
     * @param snowflake the user's snowflake id
     */
    private canPing(snowflake: string): boolean {
        const now = Date.now();
        const cached = this.bot.getPingableUserController().getCache()[snowflake];
        if (typeof cached === 'number') {
            return cached >= now;
        }
        return false;
    }
}
