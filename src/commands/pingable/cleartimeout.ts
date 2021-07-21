import { Command, CommandoMessage } from 'discord.js-commando';
import Bot from '../../Bot';
import { CONFIG } from '../../globals';

export default class ClearTimeout extends Command {
    constructor(client: Bot) {
        super(client, {
            name: 'clear',
            aliases: ['end', 'stop'],
            guildOnly: true,
            description: 'Immediately stop all pings.',
            group: 'pingable',
            memberName: 'clear',
        });
    }

    hasPermission(message: CommandoMessage, ownerOverride?: boolean): boolean | string {
        return CONFIG.bot.block.indexOf(message.author.id) >= 0;
    }

    public async run(msg: CommandoMessage): Promise<null> {
        const author = msg.author.id;
        const client = this.client as Bot;

        const extended = await client
            .getPingableUserController()
            .extend(author, Date.now(), -1, true);

        if (extended) {
            await msg.delete();
            const notification = await msg.channel.send({
                content: `<@${author}>, you'll no longer be able to be pinged.`,
            });
            await notification.delete({ timeout: 5000 });
        }

        return null;
    }
}
