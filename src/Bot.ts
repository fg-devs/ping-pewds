import {CommandoClient, CommandoMessage} from "discord.js-commando";
import path from "path";
import {CONFIG} from "./globals";
import {Logger} from "./utils/logger";
import IssueHandler from "./IssueHandler";
import EventHandler from "./EventHandler";

export default class Bot extends CommandoClient {
    private static bot: Bot;

    private readonly events: EventHandler;

    constructor() {
        super({
            commandPrefix: CONFIG.bot.prefix,
            owner: CONFIG.bot.owners,
        });

        this.events = new EventHandler(this);
        this.registerEvents();

        this.dispatcher.addInhibitor(this.inhibitor.bind(this));

        this.registry
            .registerDefaults()
            .registerDefaultGroups()
            .registerDefaultCommands({
                help: false,
                unknownCommand: false,
                commandState: false,
                eval: false,
                prefix: false,
                ping: false,
            })
            // .registerGroups([
            //     ['admin']
            // ])
            // .registerCommandsIn(path.join(__dirname, './commands'))
    }

    public async start() {
        await this.login(CONFIG.bot.token)
    }

    public static getBot() {
        if (Bot.bot !== null) {
            return Bot.bot;
        }
        throw new Error('getBot was called before initialization.');
    }

    public static getLogger(section: string): Logger {
        const logger = Logger.getLogger(`Bot::${section}`, CONFIG.logLevel);
        return logger;
    }

    private registerEvents() {
        const issues = new IssueHandler();
        this.on('commandError', issues.onCommandError.bind(issues))
            .on('commandRun', issues.onCommandRun.bind(issues))
            .on('commandRegister', issues.onCommandRegister.bind(issues));


        this.on('message', this.events.onMessage.bind(this.events));

        this.once('ready', this.events.onReady.bind(this.events));

    }

    private inhibitor(msg: CommandoMessage): false | string {
        const passes = msg.content.startsWith(this.commandPrefix)
            && msg.guild !== null;

        return passes ? false : '';
    }
}