import { Message as DiscordMessage, TextChannel } from 'discord.js';
import Controller from './controller';
import Bot from '../Bot';
import { CONFIG } from '../globals';
import Timeout = NodeJS.Timeout;
import {minutesToReadable} from "../utils";

type Message = DiscordMessage & {
    command?: never | null;
};

type PingUserCache = {
    [s: string]: number;
};

type AnyCB = (args?: unknown) => unknown;

export class PingableUserController extends Controller {
    private updateQueue: {
        [s: string]: Timeout;
    } = {};

    private usersLastMessage: { [s: string]: number } = {};

    private notifyTimeouts: {
        [s: string]: Timeout;
    } = {};

    constructor(bot: Bot) {
        super(bot, 'PingableUserController');
    }

    /**
     * gets user data from the database and sets the initial last message timestamp for each user
     */
    public async init(): Promise<void> {
        const db = this.bot.getDatabase();
        const users = await db.monitoredUsers.getAll();
        users.forEach((user) =>
            user ? (this.usersLastMessage[`${user.id}`] = user.lastMessage) : undefined
        );
    }

    /**
     * If the sender is a user who should have pings blocked,
     * extend the timeout for the user and notify notifiable roles
     */
    public async handleMessage(message: Message): Promise<boolean> {
        const punishmentController = this.bot.getPunishmentController();
        if (!await punishmentController.isMonitoredUser(message) || message.author.bot) {
            return false;
        }

        const now = Date.now();
        await this.extend(message.author.id, now);

        await this.notify(message);
        this.getLogger().debug(
            `message sent by '${message.author.username}' at ${now}... Waiting until ${
                now + CONFIG.bot.blockTimeout * 1000 * 60
            }`
        );

        return true;
    }

    /**
     * Notifies the notifiable roles by sending a message to the indicated channels
     * and creates a timeout that will fire once the user is no longer active
     * @param message the message that was sent by the user that should be managed
     * @param timeout the time, in seconds, for how long the user can be pinged
     */
    public async notify(
        message: Message,
        timeout = CONFIG.bot.notifyTimeout
    ): Promise<void> {
        const authorId = message.author.id;
        let resetting = false;
        if (this.notifyTimeouts[authorId]) {
            resetting = true;
            this.clearTimeout(authorId);
        }

        this.notifyTimeouts[authorId] = setTimeout(() => {
            CONFIG.bot.notifyChannels.map(async (channelId) => {
                const channel = message.guild?.channels.resolve(channelId) as TextChannel;
                if (channel && channel.type === 'GUILD_TEXT') {
                    await channel.send({
                        content: `<@${authorId}> doesn't seem to be around anymore, you can rest your eyes`,
                        allowedMentions: { users: [] },
                    });
                }
            });
            delete this.notifyTimeouts[authorId];
        }, timeout * 1000 * 60);

        if (resetting) return;

        const notifyChannels = CONFIG.bot.notifyChannels.map(async (channelId) => {
            const channel = message.guild?.channels.resolve(channelId) as TextChannel;
            if (channel && channel.type === 'GUILD_TEXT') {
                const notifiedRoles = CONFIG.bot.notifyRoles.map(
                    (roleId) => `<@&${roleId}>`
                );
                const link = `https://discord.com/channels/${message.guild?.id}/${message.channel.id}/${message.id}`;
                await channel
                    .send({
                        content: `**Attention ${notifiedRoles.join(
                            ', '
                        )},** 
<@${authorId}> has made an appearance!
I'll notify you again after \`${minutesToReadable(timeout)}\` have passed since the last message they send.`,
                        allowedMentions: { roles: CONFIG.bot.notifyRoles, users: [] },
                        components: [
                            {
                                type: 'ACTION_ROW',
                                components: [
                                    {
                                        type: 'BUTTON',
                                        label: 'View Post',
                                        url: link,
                                        style: 'LINK'
                                    }
                                ]
                            }
                        ]
                    })
                    .catch(this.handleError);
            }
        });

        await Promise.all(notifyChannels);
    }

    /**
     * updates the snowflake's last message timestamp to allow the user to continue to be pinged
     * while the user is active
     * @param snowflake the snowflake ID of the user
     * @param timestamp the time the user spoke
     * @param timeout the amount of time, in seconds, that the extension will last
     * @param immediate allows to immediately update database, otherwise we will queue the update to happen a little while later
     *                  this is useful in case the snowflake spams a bunch of messages, we make a bunch of updates
     */
    public async extend(
        snowflake: string,
        timestamp: number,
        timeout = CONFIG.bot.blockTimeout,
        immediate = false
    ): Promise<boolean> {
        if (timeout < 0) timeout = 0;
        if (timeout === 0) this.clearTimeout(snowflake);
        this.usersLastMessage[snowflake] = timestamp + timeout * 1000 * 60;
        const action = () =>
            this.bot
                .getDatabase()
                .monitoredUsers.updateLastMessage(
                    Number.parseInt(snowflake, 10),
                    timestamp + timeout * 1000 * 60
                )
                .catch(this.handleError);
        if (immediate) {
            this.clearQueue(snowflake);
            return (await action()) || false;
        }
        this.queueUpdate(snowflake, action);
        return true;
    }

    /**
     * clears/stops the notify timer for the selected user
     * @param snowflake
     * @private
     */
    private clearTimeout(snowflake: string) {
        if (this.notifyTimeouts[snowflake]) {
            clearTimeout(this.notifyTimeouts[snowflake]);
            delete this.notifyTimeouts[snowflake];
        }
    }

    /**
     * clears the update queue timer for the selected user
     * @param snowflake
     * @private
     */
    private clearQueue(snowflake: string) {
        if (this.updateQueue[snowflake]) {
            clearTimeout(this.updateQueue[snowflake]);
            delete this.updateQueue[snowflake];
        }
    }

    /**
     * adds an update to the update queue. If an update is already queued for the selected user, it clears it
     * and sets a new update in place of it.
     * @param snowflake
     * @param cb
     * @private
     */
    private queueUpdate(snowflake: string, cb: AnyCB): void {
        if (this.updateQueue[snowflake]) clearTimeout(this.updateQueue[snowflake]);

        this.updateQueue[snowflake] = setTimeout(() => {
            cb();
            delete this.updateQueue[snowflake];
        }, 5000);
    }

    public getCache(): PingUserCache {
        return { ...this.usersLastMessage };
    }
}
