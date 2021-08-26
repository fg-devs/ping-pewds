import Controller from "./controller";
import Bot from "../Bot";
import {Guild, Message, MessageEmbed, MessageEmbedOptions} from "discord.js";
import {CONFIG} from "../globals";
import {Parsed} from "../database/types";


export default class PunishmentController extends Controller {

    constructor(bot: Bot) {
        super(bot, 'PunishmentController');
    }

    public async synchronize(): Promise<void> {
        const db = this.bot.getDatabase();
        const activePunishments = await db.punishments.getAllLatest()

        const guild = this.bot.guilds.resolve(CONFIG.bot.guild)
        if (guild === null) throw new Error('Guild not found.');
        const sync = this.syncPunishment(guild);
        await Promise.all(activePunishments.map(sync));
    }

    public syncPunishment(guild: Guild) {
        const db = this.bot.getDatabase();
        return async (punishment: Parsed.PunishmentWithCount | null) => {
            if (punishment === null) {
                return;
            }

            let shouldRemovePunishment = punishment.endsAt !== null && punishment.endsAt.getTime() < Date.now() && punishment.active;

            if (shouldRemovePunishment) {
                // TODO handle unmuting
                try {
                    await guild.members.unban(
                        punishment.userId,
                        'They have served their sentence.'
                    );
                    await db.punishments.setActive(punishment.id, false);
                    this.getLogger().info(
                        `${punishment.userId} has served their sentence.`
                    );
                } catch (noop) {
                    // should only catch if the user was unbanned manually
                    // and we shouldn't care about them.
                }
                return;
            }

            // TODO handle muted punishments

            await guild.members.ban(punishment.userId, {
                reason: this.getPunishmentReason(punishment.count),
                days: 1
            })
        }
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
     * @param punishTime
     * @param pinged
     * @param lenient
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

        if (lenient && punishments === 0) {
            // TODO handle lenient first time offender (mute them)
        } else {
            await message.guild?.members.ban(message.author, {
                reason: this.getPunishmentReason(punishments, lenient),
                days: 1 // since the bot has to synchronize manually, this doesn't really matter
            })
        }


        this.getLogger().info(`${message.author.id} was ${this.getPunishmentReason(punishments, lenient)}`)
    }

    private getPunishmentReason(punishments: number, lenient = false): string {
        switch (punishments) {
            case 0: // first punishment
                return lenient
                    ? 'Muted for 1 day for pinging users they shouldn\'t.'
                    : 'Banned for 7 days for pinging users they shouldn\'t.'
            case 1: // second punishment
                return lenient
                    ? 'Banned for 7 days for pinging users they shouldn\'t.'
                    : 'Banned for 30 days for pinging users they shouldn\'t.'
            case 2: // third punishment
                return lenient
                    ? 'Banned for 30 days for pinging users they shouldn\'t.'
                    : 'Permanently banned for pinging users they shouldn\'t.';
            default:
                return 'Permanently banned for pinging users they shouldn\'t.';
        }
    }

    private getPunishmentTime(punishments: number, lenient = false): number | boolean {

        const now = Date.now();

        const days = (days: number) => now + days * 1000 * 60 * 60 * 24;

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