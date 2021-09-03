import {Listener} from "@sapphire/framework";

class ReadyEvent extends Listener<'ready'> {
    public async run(): Promise<void> {
        this.container.logger.debug('Bot is ready.');
        console.log(this)
    }
}

export default ReadyEvent;
