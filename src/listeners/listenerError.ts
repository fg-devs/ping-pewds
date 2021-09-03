import {Listener, ListenerErrorPayload} from "@sapphire/framework";

class ListenerErrorEvent extends Listener<'listenerError'> {
    public async run(err: Error, payload: ListenerErrorPayload): Promise<void> {
        const log = this.container.logger;
        const message = `${payload.piece.event} executed
Name: ${payload.piece.name}
Path: ${payload.piece.path}
Error: ${err.name}, ${err.message}
Stack: ${err.stack}`;

        log.error(message);
    }
}

export default ListenerErrorEvent;
