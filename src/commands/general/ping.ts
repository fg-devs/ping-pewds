import { Command, CommandOptions } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { Message } from 'discord.js';

@ApplyOptions<CommandOptions>({
    name: 'ping',
    description: 'Send back the ping of the bot',
    preconditions: ['GuildOnly'],
    fullCategory: ['general'],
    enabled: true,
})
export default class PingCommand extends Command {
    async run(msg: Message): Promise<void> {
        const m = await msg.channel.send('Ping?');
        await m.edit(
            `Pong! Bot Latency ${Math.round(
                this.container.client.ws.ping
            )}ms. API Latency ${m.createdTimestamp - msg.createdTimestamp}ms.`
        );
    }
}
