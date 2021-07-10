import Controller from "./controller";
import Bot from "../Bot";
import {CONFIG} from "../globals";
import {Message} from "discord.js";
import Timeout = NodeJS.Timeout;

export class PingableUserController extends Controller {

    private updateQueue: {
        [s: string]: Timeout;
    } = {};

    private usersLastMessage: { [s: string]: number } = {};

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
            ? (this.usersLastMessage[`${user.id}`] = user.lastPing)
            : undefined
        )
    }

    public async handleMessage(message: Message) {
        const log = this.getLogger();
        if (CONFIG.bot.block.indexOf(message.author.id) >= 0) {

            const now = Date.now();
            this.flaggedUserTalked(message.author.id, now);
            log.debug(`message sent by '${message.author.username}' at ${now}... Waiting until ${this.getTimeoutAfter(now)}`)

            return true;
        }
        return false;
    }

    private getTimeoutAfter(timestamp: number) {
        return timestamp + CONFIG.bot.blockTimeout * 1000 * 60
    }

    private flaggedUserTalked(snowflake: string, timestamp: number, timeout = CONFIG.bot.blockTimeout) {
        this.usersLastMessage[snowflake] = timestamp + timeout * 1000 * 60;
        this.queueUpdate(snowflake, () =>
            this.bot.getDatabase().blockedUsers.updateLastPing(
                Number.parseInt(snowflake),
                timestamp + timeout * 1000 * 60
            )
        );
    }

    private queueUpdate(snowflake: string, cb: Function) {
        if (this.updateQueue[snowflake])
            clearTimeout(this.updateQueue[snowflake]);

        this.updateQueue[snowflake] = setTimeout(() => {
            cb();
            delete this.updateQueue[snowflake]
        }, 5000);
    }

}
