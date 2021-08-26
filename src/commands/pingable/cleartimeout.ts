import { Command, PieceContext } from "@sapphire/framework";
import Bot from '../../Bot';
import { CONFIG } from '../../globals';
import {Message} from "discord.js";

export default class ClearTimeout extends Command {
    constructor(ctx: PieceContext) {
        super(ctx, {
            name: 'clear',
            aliases: ['end', 'stop'],
            description: 'Immediately stop all pings.',
        });
    }

    /**
     * compares the message author id to the 'block' config array
     * @param message
     * @param ownerOverride
     */
    public hasPermission(message: Message, ownerOverride?: boolean): boolean {
        return CONFIG.bot.block.indexOf(message.author.id) >= 0 || ownerOverride === true;
    }

    /**
     * immediately stops all pings for the author
     * @param msg
     */
    public async run(msg: Message): Promise<null> {
        if (!this.hasPermission(msg))
            return null;
        const author = msg.author.id;
        const client = this.context.client as Bot;

        const extended = await client
            .getPingableUserController()
            .extend(author, Date.now(), -1, true);

        if (extended) {
            // await msg.delete(); // maybe unnecessary
            const notification = await msg.channel.send({
                content: `<@${author}>, you'll no longer be able to be pinged.`,
            });
            await notification.delete({ timeout: 5000 });
        }

        return null;
    }
}
