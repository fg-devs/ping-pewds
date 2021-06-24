import Controller from "./controller";
import Bot from "../Bot";
import {CONFIG} from "../globals";
import * as fs from "fs";
import path from "path";
import {Message} from "discord.js";

export class PingController extends Controller {

    private usersLastMessage: { [s: string]: number } = {};

    private readonly storageFile: string

    constructor(bot: Bot, storageFile?: string) {
        super(bot, 'PingController')
        this.storageFile = storageFile || './last-message.json';

        this.getStoredPings();
    }

    public handleMessage(message: Message) {
        const log = this.getLogger();
        if (CONFIG.bot.block.indexOf(message.author.id) >= 0) {

            const now = Date.now();
            this.flaggedUserTalked(message.author.id, now);
            log.debug(`message sent by '${message.author.username}' at ${now}... Waiting until ${this.getTimeoutAfter(now)}`)

            return true;
        }
        return false;
    }

    public handlePing(message: Message) {

    }

    getFlaggedMentions(message: Message): string[] {
        return CONFIG.bot.block.filter((id) =>
            message.mentions.has(id)
        )
    }

    canPing(snowflake: string) {
        const now = Date.now();
        return (this.usersLastMessage[snowflake] || 0) >= now;
    }

    private getTimeoutAfter(timestamp: number) {
        return timestamp + CONFIG.bot.blockTimeout * 1000 * 60
    }

    private flaggedUserTalked(snowflake: string, timestamp: number, timeout = CONFIG.bot.blockTimeout) {
        this.usersLastMessage[snowflake] = timestamp + timeout * 1000 * 60;
        this.queueUpdate();
    }

    // TODO I probably will need to change how this works in the future.
    private queueUpdate() {
        fs.writeFileSync(path.join(process.cwd(), this.storageFile), JSON.stringify(this.usersLastMessage), { encoding: 'utf8' });
    }

    private getStoredPings() {
        if (fs.existsSync(path.join(process.cwd(), this.storageFile))) {
            const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), this.storageFile), 'utf-8'));
            Object.keys(data).forEach((id) => {
                if (id.match(/^\d+$/) && typeof data[id] === 'number') {
                    this.usersLastMessage[id] = data[id]
                }
            })
        }
    }

}
