import {Command, CommandRunPayload, Listener} from "@sapphire/framework";
import {Message} from "discord.js";
import LogUtil from "../utils/LogUtil";

class CommandRunEvent extends Listener<'commandRun'> {
    public async run(msg: Message, command: Command, payload: CommandRunPayload): Promise<void> {
        const log = this.container.logger;
        const message = `${
            msg.author.tag
        } executed this command\n${await LogUtil.breakDownMsg(payload)}`;

        log.debug(message);
    }
}

export default CommandRunEvent;
