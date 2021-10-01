import { Command, PieceContext, Args, CommandOptions } from '@sapphire/framework';
import { Message } from 'discord.js';
import { ApplyOptions } from '@sapphire/decorators';
import Bot from '../../Bot';
import { CONFIG } from '../../globals';

@ApplyOptions<CommandOptions>({
    name: 'extend',
    description: 'Extend the time that that you want to allow users to ping you.',
    preconditions: ['GuildOnly'],
})
export default class ExtendTimeout extends Command {
    /**
     * compares the message author id to the 'block' config array
     * @param message
     * @param ownerOverride
     */
    public hasPermission(message: Message, ownerOverride?: boolean): boolean {
        const bot = this.container.client as Bot;
        const author = message.guild?.members.resolve(message.author.id);
        return (
            bot.getPunishmentController().isMonitoredMember(author) ||
            ownerOverride === true
        );
    }

    private async validateArgs(args: Args) {
        try {
            return {
                timeout: await args.rest('number'),
            };
        } catch (_) {
            return {
                timeout: 15,
            };
        }
    }

    /**
     * extends the active window of the author by the amount of time in minutes given by the commands parameter
     * @param msg
     * @param args
     */
    public async run(msg: Message, args: Args): Promise<null> {
        if (!this.hasPermission(msg)) return null;

        const { timeout } = await this.validateArgs(args); // await args.rest('number');

        const author = msg.author.id;
        const client = this.container.client as Bot;

        const date = new Date();
        const extended = await client
            .getPingableUserController()
            .extend(author, date.getTime(), timeout, true);
        date.setTime(date.getTime() + timeout * 1000 * 60);
        if (extended) {
            // await msg.delete(); // maybe unnecessary
            const notification = await msg.channel.send({
                content: `<@${author}>, you'll be able to be pinged until **<t:${(
                    date.getTime() / 1000
                ).toFixed(0)}:F>**.
Please note that this command should only be used if you plan on going AFK. Once you speak, the timer will reset to **${
                    CONFIG.bot.blockTimeout
                } minutes** after your last message.`,
            });

            setTimeout(() => {
                notification.delete()
            }, 10000);
        }

        return null;
    }
}
