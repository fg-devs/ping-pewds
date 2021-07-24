import Controller from "./controller";
import Bot from "../Bot";
import {Message, MessageEmbed, MessageEmbedOptions} from "discord.js";


export default class PunishmentController extends Controller {

    constructor(bot: Bot) {
        super(bot, 'PunishmentController');
    }

    async init(): Promise<void> {
        // const db = this.bot.getDatabase();

    }

    public async punish(message: Message, pingedUsers: string[]) {
        const author = message.author.id;
        const guildMember = message.guild?.member(author);
        if (guildMember === null || typeof guildMember === 'undefined') {
            throw new Error('selected user is not a guild member somehow')
        }
        const db = this.bot.getDatabase();
        const currentPunishments = await db.punishments.getByUserId(guildMember.user.id, true);

        // TODO create a lenient role that has lighter punishments
        //      necessary for the tiered roles to have lighter punishments since they are patrons

        const punishTime = this.getPunishmentTime(currentPunishments.length);

        await db.punishments.create({
            userId: message.author.id as string,
            endsAt: punishTime,
        })

        await this.handleDiscordPunishment(message, currentPunishments.length, punishTime, pingedUsers);
    }

    /**
     * used to notify users of punishment
     * @todo handle discord punishments
     * @param message
     * @param punishments
     * @private
     */
    private async handleDiscordPunishment(message: Message, punishments: number, punishTime: boolean | number, pinged: string[], lenient = false) {
        let embed: MessageEmbedOptions = {
            title: `You've been banned on ${message.guild?.name}.`,
            timestamp: Date.now(),
            footer: {
                text: `C'mon, you know better than this!`
            },
            color: "RED"
        }
        const peopleOrPerson = pinged.length === 1 ? 'person' : 'people';
        // const parsedPings = pinged.map((id) => `<@${id}>`);
        switch (punishments) {
            case 0: // first punishment
                embed = {
                    ...embed,
                    description: `You've been temporarily banned for **7 days**.
You pinged the following ${peopleOrPerson}: ${pinged.join(', ')}\n
You will be unbanned on **<t:${Math.round(punishTime as number / 1000)}>**.`,
                }
                break;
            case 1: // second punishment
                embed = {
                    ...embed,
                    description: `You've been temporarily banned for **30 days**.
You pinged the following ${peopleOrPerson}: ${pinged.join(', ')}\n
This is your second time pinging someone you shouldn't. ${!lenient 
                        ? 'If you do it again, you will be permanently banned.' 
                        : ''
                    }
You will be unbanned on **<t:${Math.round(punishTime as number / 1000)}>**.`,
                }
                break;
            case 2: // third punishment
                embed = {
                    ...embed,
                    title: `You've been banned on ${message.guild?.name}.`,
                    description: `You've been banned for eternity.
You pinged the following ${peopleOrPerson}: ${pinged.join(', ')}\n
This is your third time pinging someone you shouldn't.\n\n${!lenient ? 
                        "As they say in Baseball, *three strikes and you're out!*"
                        : "If you do this again, you will be permanently banned."
                    }`,
                    footer: {
                        text: 'Oops!'
                    }
                }
                break;
            case 3: // fourth punishment
                embed = {
                    ...embed,
                    title: `You've been banned on ${message.guild?.name}.`,
                    description: `You've been banned for eternity.
You pinged the following ${peopleOrPerson}: ${pinged.join(', ')}\n
This is your fourth time pinging someone you shouldn't.\n
You should have learned by now, but since you haven't, you're no longer welcome.`,
                    footer: {
                        text: 'Oops!'
                    }
                }
                break;
        }
        const channel = await message.author.createDM();
        await channel.send({
            embed
        })
    }

    private getPunishmentTime(punishments: number, lenient = false): number | boolean {

        const now = Date.now();

        const days = (days: number) => now + days * 1000 * 60 * 60 * 24;
        const minutes = (minutes: number) => now + minutes * 1000 * 60;

        switch (punishments) {
            case 0: // first punishment
                return lenient ? days(1) : days(7)
            case 1: // second punishment
                return lenient ? days(7) : days(30)
            case 2: // third punishment
                return lenient ? days(30) : true;
            default:
                return true;
        }
    }

}