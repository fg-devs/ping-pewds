import { CommandRunPayload, Listener } from '@sapphire/framework';
import LogUtil from '../utils/LogUtil';

class CommandErrorEvent extends Listener<'commandError'> {
    public async run(err: Error, payload: CommandRunPayload): Promise<void> {
        const log = this.container.logger;
        const message = `${payload.message.author.tag} executed "${payload.command?.name}"
${await LogUtil.breakDownMsg(payload)}
${LogUtil.breakDownErr(err)}`;

        log.error(message);
    }
}

export default CommandErrorEvent;
