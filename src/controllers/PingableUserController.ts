import Controller from "./controller";
import Bot from "../Bot";
import {CONFIG} from "../globals";
import {Message as DiscordMessage, TextChannel} from "discord.js";
import Timeout = NodeJS.Timeout;

type Message = DiscordMessage & {
    command?: never | null;
}

export class PingableUserController extends Controller {

    private updateQueue: {
        [s: string]: Timeout;
    } = {};

    private usersLastMessage: { [s: string]: number } = {};
    private notifyTimeouts: {
        [s: string]: Timeout;
    } = {}

    constructor(bot: Bot) {
        super(bot, 'PingableUserController')
    }

    public async init() {
        const db = this.bot.getDatabase();
        const ids = CONFIG.bot.block
            .filter((id) => id.match(/^\d+$/))
            .map((id) => Number.parseInt(id));

        await db.blockedUsers.initializeUsers(ids);

        const users = await db.blockedUsers.getById(ids);
        users.forEach((user) => user
            ? (this.usersLastMessage[`${user.id}`] = user.lastMessage)
            : undefined
        )
    }

    public async handleMessage(message: Message) {
        const log = this.getLogger();
        if (CONFIG.bot.block.indexOf(message.author.id) >= 0 && message.command === null) {

            const now = Date.now();
            await this.extend(message.author.id, now);

            await this.notify(message);
            log.debug(`message sent by '${message.author.username}' at ${now}... Waiting until ${now + CONFIG.bot.blockTimeout * 1000 * 60}`)

            return true;
        }
        return false;
    }

    public async notify(message: Message, timeout = CONFIG.bot.notifyTimeout) {
        const authorId = message.author.id;
        let resetting = false;
        if (this.notifyTimeouts[authorId]) {
            resetting = true;
            this.clearTimeout(authorId)
        }

        this.notifyTimeouts[authorId] = setTimeout(() => {
            CONFIG.bot.notifyChannels.map(async (channelId) => {
                const channel = await message.guild?.channels.resolve(channelId) as TextChannel;
                if (channel && channel.type === 'text') {
                    // const notifiedRoles = CONFIG.bot.notifyRoles.map((roleId) => `<@&${roleId}>`)
                    await channel.send({
                        content: `<@${authorId}> doesn't seem to be around anymore, you can rest your eyes`,
                        allowedMentions: { users: [] },
                    })
                }
            })
            delete this.notifyTimeouts[authorId]
        }, timeout * 1000 * 60);

        if (resetting)
            return;

        await Promise.all(CONFIG.bot.notifyChannels.map(async (channelId) => {
            const channel = await message.guild?.channels.resolve(channelId) as TextChannel;
            if (channel && channel.type === 'text') {
                const notifiedRoles = CONFIG.bot.notifyRoles.map((roleId) => `<@&${roleId}>`)
                const link = `https://discord.com/channels/${message.guild?.id}/${message.channel.id}/${message.id}`
                await channel.send({
                    content: `${notifiedRoles.join(', ')}, <@${authorId}> has made an appearance! I'll notify you once some time has past since they have sent a message.\n${link}`,
                    allowedMentions: { roles: CONFIG.bot.notifyRoles },
                })
            }
        }))
    }

    public async extend(snowflake: string, timestamp: number, timeout = CONFIG.bot.blockTimeout, immediate = false) {
        if (timeout < 0) timeout = 0;
        if (timeout === 0) this.clearTimeout(snowflake);
        this.usersLastMessage[snowflake] = timestamp + timeout * 1000 * 60;
        const action = () =>
            this.bot.getDatabase().blockedUsers.updateLastMessage(
                Number.parseInt(snowflake),
                timestamp + timeout * 1000 * 60
            ).catch((err) => console.error(err))
        if (immediate) {
            this.clearQueue(snowflake);
            return await action();
        } else {
            this.queueUpdate(snowflake, action);
            return true;
        }
    }

    private clearTimeout(snowflake: string) {
        if (this.notifyTimeouts[snowflake]) {
            clearTimeout(this.notifyTimeouts[snowflake])
            delete this.notifyTimeouts[snowflake];
        }
    }

    private clearQueue(snowflake: string) {
        if (this.updateQueue[snowflake]) {
            clearTimeout(this.updateQueue[snowflake]);
            delete this.updateQueue[snowflake];
        }
    }

    private queueUpdate(snowflake: string, cb: Function) {
        if (this.updateQueue[snowflake])
            clearTimeout(this.updateQueue[snowflake]);

        this.updateQueue[snowflake] = setTimeout(() => {
            cb();
            delete this.updateQueue[snowflake];
        }, 5000);
    }

    public getCache() {
        return { ...this.usersLastMessage };
    }

}
