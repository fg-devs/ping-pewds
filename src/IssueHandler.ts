import { Message } from 'discord.js';
import {Command, CommandErrorPayload, CommandRunPayload} from "@sapphire/framework";
import Bot from './Bot';
import LogUtil from './utils/LogUtil';
import {BotLogger} from "./utils/logger";

class IssueHandler {
    /**
     * Log command failures
     * @param {Command} cmd Command that failed
     * @param {Error} err Error that ocurred
     * @param {any[]} _args Ignored arguments
     */
    public async onCommandError(
        err: Error,
        cmd: CommandErrorPayload,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any
        ..._args: any[]
    ): Promise<void> {
        const log = this.getLogger(cmd);
        const message = `${cmd.message.author.tag} executed "${cmd.command?.name}"
${await LogUtil.breakDownMsg(cmd)}
${LogUtil.breakDownErr(err)}`;

        log.error(message);
    }

    /**
     * Log command executions
     * @param {Command} c Command being executed
     * @param {Promise} _p Command's result
     * @param {CommandoMessage} msg The user's message that executed the command
     */
    public async onCommandRun(
        msg: Message,
        cmd: Command,
        payload: CommandRunPayload,
    ): Promise<void> {
        const log = this.getLogger(payload);
        const message = `${msg.author.tag} executed this command\n${await LogUtil.breakDownMsg(
            payload
        )}`;

        log.debug(message);
    }

    private getLogger(c: CommandRunPayload): BotLogger {
        return Bot.getLogger(`[command::${c.command.name}]`);
    }
}

export default IssueHandler;
