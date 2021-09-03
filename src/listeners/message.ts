import {Listener} from "@sapphire/framework";
import {Message} from "discord.js";
import Bot from "../Bot";

class MessageEvent extends Listener<'message'> {
    public async run(message: Message): Promise<void> {
        const bot = this.container.client as Bot;

        const pingableController = bot.getPingableUserController();
        const pingController = bot.getPingController();

        if (await pingableController.handleMessage(message)) return;

        await pingController.handleMessage(message);
    }
}

export default MessageEvent;
