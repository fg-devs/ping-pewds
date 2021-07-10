import {Command, CommandoMessage} from "discord.js-commando";
import Bot from "../../Bot";
import {CONFIG} from "../../globals";

type Args = {
    timeout: number;
}

export default class ExtendTimeout extends Command {
    constructor(client: Bot) {
        super(client, {
            name: 'extend',
            // aliases: [],
            guildOnly: true,
            description: 'Extend the time that that you want to allow users to ping you.',
            group: 'pingable',
            memberName: 'extend',
            examples: ['extend 60', 'extend 3600'],
            args: [
                {
                    default: 15,
                    key: 'timeout',
                    prompt: 'Timeout',
                    label: 'time in minutes to extend',
                    validate: (val: string) => val.match(/^\d+$/) !== null,
                    parse: (val: string) => Number.parseInt(val),
                    wait: 10,
                    error: 'Please enter a numeric value representing the number of minutes to extend.',
                }
            ]
        })

    }

    hasPermission(message: CommandoMessage, ownerOverride?: boolean): boolean | string {
        return CONFIG.bot.block.indexOf(message.author.id) >= 0;
    }

    public async run(msg: CommandoMessage, args: Args): Promise<null> {
        const { timeout } = args;
        const author = msg.author.id;
        const client = this.client as Bot;
        const date = new Date();
        const extended = await client.getPingableUserController()
            .extend(author, date.getTime(), timeout, true);
        date.setTime(date.getTime() + timeout * 1000 * 60);
        if (extended) {
            await msg.delete();
            const notification = await msg.channel.send({
                content: `<@${author}>, you'll be able to be pinged until ${date.toLocaleTimeString()}.`
            })
            await notification.delete({ timeout: 15000 });
        }

        return null;
    }

}