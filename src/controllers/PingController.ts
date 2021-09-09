import { Message } from 'discord.js';
import Controller from './controller';
import Bot from '../Bot';
import { CONFIG } from '../globals';
import {TargetType, FlaggedMention} from "./PunishmentController";

export class PingController extends Controller {
    constructor(bot: Bot) {
        super(bot, 'PingController');
    }

    /**
     * checks for messages that include pings of users who should not be pinged
     * if a ping is found, it is removed and a message is sent to the channel
     * telling the user to not ping this user.
     */
    public async handleMessage(message: Message): Promise<boolean> {
        if (
            message.author.bot ||
            CONFIG.bot.excludedChannels.indexOf(message.channel.id) >= 0
        )
            return false;

        const flaggedMentions = this.getFlaggedMentions(message);
        if (flaggedMentions.length === 0) return false;

        const pingedUsers: string[] = [];
        let canPing = true;

        flaggedMentions.forEach((mention) => {
            if (this.canPing(mention.user)) return;
            const flaggedUser = message.mentions.users.get(mention.user);
            if (typeof flaggedUser === 'undefined') return;
            canPing = false;
            pingedUsers.push(`<@${flaggedUser.id}>`)
            this.getLogger().info(
                `A mention of '${flaggedUser.username}' was caught and  is pending deletion.`
            );
        })

        if (canPing) return false;

        await message.delete().catch(this.handleError);
        const notification = await message.channel
            .send({
                content: `Please do not ping ${pingedUsers.join(
                    ', '
                )} unless they are active.`,
                allowedMentions: { users: [] },
            })
            .catch(this.handleError);

        const punishmentController = this.bot.getPunishmentController();
        await punishmentController.punish(message, flaggedMentions);

        if (notification) {
            setTimeout(() => notification.delete(), 5000);
        }

        return true;
    }

    /**
     * checks to see if the message contains any pings of users that should not be pinged
     * and returns all the user id that are mentioned that should not be.
     */
    private getFlaggedMentions(message: Message): FlaggedMention[] {
        const punishmentController = this.bot.getPunishmentController()
        const mentions: FlaggedMention[] = [];

        const blockedUsers = punishmentController.getBlockedUsers();
        blockedUsers.forEach((blocked) => {
            if (message.mentions.has(blocked)) {
                mentions.push({
                    user: blocked,
                    type: 'user'
                });
            }
        })

        const blockedRoles = punishmentController.getBlockedRoles();
        blockedRoles.forEach((role) => {
            const exists = message.mentions.members?.find((user) => {
                return user.roles.resolve(role) !== null
            })
            if (exists) {
                mentions.push({
                    user: exists.id,
                    role,
                    type: 'role'
                })
            }
        })

        return mentions;
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
