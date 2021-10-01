import { Guild, GuildMember, Message, MessageEmbedOptions } from 'discord.js';
import Controller from './controller';
import Bot from '../Bot';
import { CONFIG } from '../globals';
import { Parsed, TargetType } from '../database/types';

export type FlaggedMention = {
    user: string;
    role?: string;
    type: TargetType;
};

type Punishment = Parsed.Punishment;

type PunishmentCache = {
    role: {
        [s: string]: Punishment[];
    };
    user: {
        [s: string]: Punishment[];
    };
};

export default class PunishmentController extends Controller {
    private punishments: PunishmentCache;

    public constructor(bot: Bot) {
        super(bot, 'PunishmentController');

        this.punishments = this.organizePunishments();
    }

    /**
     * used to ensure that all punishments are synchronized with the database for the guild.
     * (It is currently used in a synchronization interval as well as called independently whenever
     * punishments are created/removed)
     * @param syncPunishments if true, synchronizes punishments as well as punishment history
     */
    public async synchronize(syncPunishments = false): Promise<void> {
        const db = this.bot.getDatabase();
        const activePunishments = await db.punishmentHistory.getAllLatest();

        if (syncPunishments) {
            const punishments = await db.punishments.getAllActive();
            this.punishments = this.organizePunishments(punishments);
        }

        const guild = this.bot.guilds.resolve(CONFIG.bot.guild);
        if (guild === null) throw new Error('Guild not found.');
        const sync = this.syncHistory(guild);
        await Promise.all(activePunishments.map(sync));
    }

    /**
     * Creates a guild specific synchronization function used to make sure that
     * will automatically unban/unmute punished users after their punishment is
     * no longer active.
     * @param guild
     */
    public syncHistory(
        guild: Guild
    ): (punishment: Parsed.PunishmentHistoryWithCount | null) => Promise<void> {
        const db = this.bot.getDatabase();
        return async (punishment: Parsed.PunishmentHistoryWithCount | null) => {
            if (punishment === null) {
                return;
            }

            const shouldRemovePunishment =
                punishment.endsAt !== null &&
                punishment.endsAt.getTime() < Date.now() &&
                punishment.active;

            if (!shouldRemovePunishment) return;

            try {
                const member = await guild.members.fetch(punishment.userId);
                if (member) {
                    await member.roles.remove(CONFIG.bot.muteRole);
                    await db.punishmentHistory.setActive(punishment.id, false);
                }
            } catch (noop) {
                // should only fire if the user is not in the guild
            }

            try {
                await guild.members.unban(
                    punishment.userId,
                    'They have served their sentence.'
                );
                await db.punishmentHistory.setActive(punishment.id, false);
                this.getLogger().info(`${punishment.userId} has served their sentence.`);
            } catch (noop) {
                // should only catch if the user was unbanned manually
                // and we shouldn't care about them.
            }
        };
    }

    /**
     * Creates a punishment record for the author of the message and sends discord notification.
     * The punishment given is dependent upon how many punishments the author has previously
     * received, along with whether or not the user has a lenient role.
     * @param message
     * @param mentions
     */
    public async punish(message: Message, mentions: FlaggedMention[]): Promise<void> {
        const author = message.author.id;
        const { guild } = message;
        if (guild === null) {
            throw new Error('guild not found.');
        }

        const guildMember = message.guild?.members.resolve(author);
        if (guildMember === null || typeof guildMember === 'undefined') {
            throw new Error('selected user is not a guild member somehow');
        }

        const db = this.bot.getDatabase();
        const currentPunishments = await db.punishmentHistory.getByUserId(
            guildMember.user.id,
            true
        );

        const hasLenientRole =
            CONFIG.bot.lenientRoles.findIndex((role) => {
                return guildMember.roles.resolve(role) !== null;
            }) >= 0;

        const punishments: Punishment[] = [];

        for (const mention of mentions) {
            if (punishments.length > 0) break;
            let key = mention.type === 'user' ? mention.user : undefined;
            if (typeof key === 'undefined' && mention.type === 'role') key = mention.role;
            punishments.push(...this.getPunishments(mention.type, key, hasLenientRole));
        }

        if (punishments.length === 0 && hasLenientRole) {
            this.getLogger().warn({
                error: 'No lenient punishments found.',
                mentions,
            });
            return;
        }

        const nextPunishment =
            punishments[Math.min(currentPunishments.length, punishments.length - 1)];

        const endsAt =
            typeof nextPunishment.length === 'number'
                ? Date.now() + nextPunishment.length
                : true;

        await db.punishmentHistory.create({
            userId: author,
            endsAt,
        });

        await this.handleDiscordPunishment(
            message,
            nextPunishment,
            mentions,
            currentPunishments,
            endsAt
        );
    }

    /**
     * Sends a DM to the author that they have been punished.
     * This DM contains an embed that shows their punishment history along with how long their
     * punishment will be.
     * @param message
     * @param punishment
     * @param mentions
     * @param punishmentHistory
     * @param endsAt
     * @private
     */
    private async handleDiscordPunishment(
        message: Message,
        punishment: Punishment,
        mentions: FlaggedMention[],
        punishmentHistory: Array<Parsed.PunishmentHistory | null>,
        endsAt: number | true
    ): Promise<void> {
        const duration =
            endsAt === true ? 'the end of time' : `<t:${Math.round(endsAt / 1000)}>`;
        let description: string | undefined;

        switch (punishment.type) {
            case 'ban':
                description = `You've been banned until ${duration} for pinging the following people.`;
                break;
            case 'mute':
                description = `You've been muted until ${duration} for pinging the following people.`;
                break;
            case 'kick':
                description = `You've been kicked for pinging the following people.`;
                break;
            default:
                description = 'Unknown punishment given.';
        }

        const embed: MessageEmbedOptions = {
            title: `You've been banned on ${message.guild?.name} server.`,
            timestamp: Date.now(),
            footer: {
                text: `C'mon, you know better than this!`,
            },
            description,
            fields: [
                {
                    name: 'Mentioned Users',
                    value: mentions.map((mention) => `<@${mention.user}>`).join(', '),
                },
                {
                    name: 'Punishment History',
                    value:
                        punishmentHistory.length > 0
                            ? punishmentHistory
                                  .map((pun) => {
                                      return `Punished at <t:${Math.round(
                                          (pun?.createdAt.getTime() || 0) / 1000
                                      )}>`;
                                  })
                                  .join('\n')
                            : 'No previous punishments',
                },
            ],
            color: 'RED',
        };

        const channel = await message.author.createDM();
        await channel.send({
            embeds: [embed],
        });

        // skip the actual punishment for testing
        if (CONFIG.bot.dryrun) return;

        switch (punishment.type) {
            case 'ban':
                await message.guild?.members.ban(message.author, {
                    reason: `Pinging people they shouldn't ping.`,
                });
                break;
            case 'mute':
                message.guild?.members
                    .resolve(message.author)
                    ?.roles.add(CONFIG.bot.muteRole);
                break;
            case 'kick':
                if (message.member?.kickable)
                    await message.member.kick("Pinging someone he shouldn't.");
                else
                    this.getLogger().warn(
                        `${message.author.username} was not able to be kicked.`
                    );
                break;
            default:
                this.getLogger().error(`Unhandled punishment type ${punishment.type}`);
        }
    }

    /**
     * determine if the selected author is a monitored user by comparing their
     * roles and user ID to the punishments cache of users and roles
     * @param author
     */
    public isMonitoredMember(author?: GuildMember | null): boolean {
        const hasMonitoredRole =
            Object.keys(this.punishments.role).findIndex(
                (role) => author?.roles.resolve(role) !== null
            ) >= 0;
        const isMonitoredUser = this.punishments.user[author?.id || 0] instanceof Array;

        return isMonitoredUser || hasMonitoredRole;
    }

    /**
     * simple function to check whether or not the target has any available punishments to give out.
     * @param target ['user'|'role']
     * @param targetKey [string]
     */
    public hasPunishments(target: TargetType, targetKey?: string): boolean {
        if (typeof targetKey === 'string')
            return this.punishments[target][targetKey].length > 0;
        return false;
    }

    /**
     * returns a list of users that should not be pinged
     */
    public getBlockedUsers(): string[] {
        return Object.keys(this.punishments.user);
    }

    /**
     * returns a list of roles that should not be pinged
     */
    public getBlockedRoles(): string[] {
        return Object.keys(this.punishments.role);
    }

    /**
     * Gets punishment options for a specific target, key, and leniency
     * @param target
     * @param targetKey
     * @param lenient
     */
    public getPunishments(
        target: TargetType,
        targetKey?: string,
        lenient?: boolean,
    ): Punishment[] {
        if (!(typeof targetKey === 'string' && this.punishments[target][targetKey]))
            return [];

        if (!lenient) {
            return [...this.punishments[target][targetKey]]
        }

        const filtered = this.punishments[target][targetKey].filter(
            (k) => k.lenient === lenient
        );
        if (filtered.length === 0 && lenient) {
            return this.punishments[target][targetKey].filter((k) => !k.lenient);
        }
        return filtered;
    }

    /**
     * Used to remap the punishment options received from the databased and put them into a local cache
     * @param punishments
     * @private
     */
    private organizePunishments(punishments?: Punishment[]) {
        const nextCache: PunishmentCache = {
            role: {},
            user: {},
        };
        if (typeof punishments === 'undefined') return nextCache;

        punishments.forEach((punishment) => {
            // eslint-disable-next-line
            switch (punishment.target) {
                case 'user':
                    if (typeof nextCache.user[punishment.targetKey] === 'undefined')
                        nextCache.user[punishment.targetKey] = [];
                    nextCache.user[punishment.targetKey].push(punishment);
                    break;
                case 'role':
                    if (typeof nextCache.role[punishment.targetKey] === 'undefined')
                        nextCache.role[punishment.targetKey] = [];
                    nextCache.role[punishment.targetKey].push(punishment);
                    break;
            }
        });
        return nextCache;
    }
}
