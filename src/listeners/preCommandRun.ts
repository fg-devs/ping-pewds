import {CommandRunPayload, Listener} from "@sapphire/framework";

class PreCommandRunEvent extends Listener<'preCommandRun'> {
    public async run(payload: CommandRunPayload): Promise<void> {
        const log = this.container.logger;

        log.debug(this, payload);
    }

}

export default PreCommandRunEvent;
