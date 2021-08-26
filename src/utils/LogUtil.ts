import { CommandRunPayload } from '@sapphire/framework';

class LogUtil {
    /**
     * This breaks down the details of a command that was executed
     * @param {CommandRunPayload} cmd The message that executed the command
     * @returns {string}
     */
    public static async breakDownMsg(cmd: CommandRunPayload): Promise<string> {
        return ` * Time: ${cmd.message.createdAt}
 * Full: ${cmd.command?.name} ${await cmd.args.rest('string')}
 * Guild: ${cmd.message.guild ? cmd.message.guild.name : 'No Guild'}`;
    }

    /**
     * Break down an error to be read to log
     * @param {Error} err
     * @returns {string}
     */
    public static breakDownErr(err: Error): string {
        return ` * Error: ${err.message}\n * Stack: ${err.stack}`;
    }
}

export default LogUtil;
