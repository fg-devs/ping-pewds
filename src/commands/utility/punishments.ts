import {ApplyOptions} from "@sapphire/decorators";
import {Args, Command, CommandContext, CommandOptions} from "@sapphire/framework";
import {SubCommandPluginCommand, SubCommandPluginCommandOptions} from "@sapphire/plugin-subcommands";
import {Message, MessageEmbed, MessageEmbedOptions} from "discord.js";
import Bot from "../../Bot";
import {Nullable, PunishmentType, Tables, TargetType} from "../../database/types";
import {InsertError, DatabaseError} from "../../database/errors";
import {minutesToReadable, sentByAuthorizedUser} from "../../utils";

@ApplyOptions<SubCommandPluginCommandOptions>({
    name: 'punishments',
    description: 'Show, create, and remove punishments for pinging them from users and roles',
    preconditions: ['GuildOnly'],
    subCommands: [
        {
            input: 'list',
            default: true,
        },
        {
            input: 'create',
        },
        {
            input: 'update'
        },
        {
            input: 'remove'
        }
    ]
})
export default class Punishments extends SubCommandPluginCommand {

    private static hasPermission(message: Message) {
        const author = message.guild?.members.resolve(message.author.id);
        return sentByAuthorizedUser(author)
    }

    public async run(message: Message, args: Args, context: CommandContext) {
        if (!Punishments.hasPermission(message)) return;
        await super.run(message, args, context);
    }

    public async list(message: Message): Promise<void> {
        console.log('list', message)
    }

    public async create(message: Message, args: Args): Promise<void> {
        const parsedArgs = await Punishments.parseCreateArgs(args)
            .catch((err) => {
                console.error(err)
                return null
            });

        if (parsedArgs === null) {
            // TODO send embed with command structure
            await message.channel.send({
                embeds: [ Punishments.CREATE_PUNISHMENT_EMBED ],
            });
            return;
        }

        const bot = this.container.client as Bot;
        const created = await bot.getDatabase().punishments.create({
            index: parsedArgs.index,
            target: parsedArgs.target,
            targetKey: parsedArgs.targetKey,
            type: parsedArgs.type,
            length: parsedArgs.length ? parsedArgs.length * 1000 * 60 : undefined,
            lenient: parsedArgs.lenient,
        }).catch((err: InsertError) => err);

        if (created instanceof DatabaseError) {
            message.channel.send({
                content: `An error occurred while trying to create the punishment.
Please notify a developer so that we can check the internal logs`
            })
            this.container.logger.info(created)
            return;
        }

        await message.reply({
            allowedMentions: { users: [], roles: [], repliedUser: false },
            content: `Successfully added punishment to ${parsedArgs.target} ${Punishments.getRoleOrUser(parsedArgs)}.
\`\`\`Punishment Type: ${parsedArgs.type}
Punishment Target: ${parsedArgs.target}
Punishment Target Key: ${Punishments.getRoleOrUser(parsedArgs)}
Punishment is lenient: ${parsedArgs.lenient}
Punishment length ${minutesToReadable(parsedArgs.length)}
\`\`\``
        })

        await bot.getPunishmentController().synchronize();
    }

    private static getRoleOrUser(args: Tables.Punishments.CreateObject) {
        if (args.target === 'role')
            return `<@&${args.targetKey}>`
        if (args.target === 'user')
            return `<@${args.targetKey}>`;
        return args.targetKey;
    }

    private static async parseCreateArgs(argsObj: Args): Promise<Tables.Punishments.CreateObject> {
        const numeric = /^(\.|\d)+$/;
        const mention = /^<(@&?!?)(.*)>$/
        const argsStr = (await argsObj.rest('string') || '').toLowerCase()
        let [
            index, type, target, targetKey, lenient, length
        ]: any[] = argsStr.split(/\s+/);

        if (index.match(numeric) === null)
            throw new Error('index must be numeric')
        index = Number.parseInt(index);

        if (['ban','kick','mute'].indexOf(type) === -1)
            throw new Error('punishment type is invalid')

        const requiresTargetKey = ['user', 'role'].indexOf(target);
        if (requiresTargetKey === -1)
            throw new Error('punishment target is invalid')

        const mentionedMatch = targetKey.match(mention)
        if (targetKey.match(numeric) === null && mentionedMatch === null)
            throw new Error('punishment target key must be numeric')

        if (mentionedMatch !== null) {
            // replace the mention string with just the ID
            targetKey = mentionedMatch[2] as string;
        }

        if (['1', '0', 'yes', 'no', 'true', 'false'].indexOf(lenient.toLowerCase()) === -1)
            throw new Error('punishment leniency must be boolean(ish)')
        lenient = (['1', 'yes', 'true'].indexOf(lenient) >= 0)

        if ((length?.match(numeric) || null) === null)
            length = undefined;
        else
            length = Number.parseInt(length, 10)

        return {
            index,
            type,
            target,
            targetKey,
            lenient,
            length,
        }
    }

    private static CREATE_PUNISHMENT_EMBED = {
        title: 'How To Create A Punishment',
        description: `The following command is the structure you should use when creating a punishment via this command
\`!punishments create [PriorityIndex] [Type] [Target] [TargetKey] [Lenient] [Length?]\``,
        fields: [
            {
                name: 'Priority Index',
                value: '`Numeric, [0 - 10000]` (lower number means punishment is give first)'
            },
            {
                name: 'Type',
                value: '`Ban | Mute | Kick` (the type of punishment)'
            },
            {
                name: 'Target',
                value: '`Role | User` (role means anyone with the role will have ping protection)'
            },
            {
                name: 'Target Key',
                value: '`@user | @role | Role ID | User ID` (You can mention a user or role, or you can input the ID of the role or user)'
            },
            {
                name: 'Lenient',
                value: '`yes | no | true | false` (allows you to have two different types of punishments based on the punished users role, bros vs tiered punishment)'
            },
            {
                name: 'Length *(optional)*',
                value: '`numeric | nothing` The length of the punishment in minutes (1 day is 1440 minutes).\n**If blank, the punishment is indefinite**'
            }
        ],
        footer: {
            text: 'If you have any questions, get in touch with the developers.'
        },
    };
}
