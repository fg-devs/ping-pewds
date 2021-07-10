import {CommandoClient, CommandoMessage} from "discord.js-commando";
import path from "path";
import {CONFIG} from "./globals";
import {Logger} from "./utils/logger";
import IssueHandler from "./IssueHandler";
import EventHandler from "./EventHandler";
import {PingableUserController} from "./controllers/PingableUserController";
import DatabaseManager from "./database/database";
import {PingController} from "./controllers/PingController";
import ExtendTimeout from "./commands/pingable/extendtimeout";
import ClearTimeout from "./commands/pingable/cleartimeout";

export default class Bot extends CommandoClient {
    private static bot: Bot;

    private readonly events: EventHandler;

    private readonly pingableUserController: PingableUserController;
    private readonly pingController: PingController;

    private readonly database: DatabaseManager;

    constructor() {
        super({
            commandPrefix: CONFIG.bot.prefix,
            owner: CONFIG.bot.owners,
        });

        this.database = new DatabaseManager({
            host: CONFIG.database.host,
            port: CONFIG.database.port,
            user: CONFIG.database.user,
            database: CONFIG.database.database,
            schema: CONFIG.database.schema,
            password: CONFIG.database.pass,
            max: CONFIG.database.connections,
        })

        this.pingableUserController = new PingableUserController(this);
        this.pingController = new PingController(this);

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
            .registerGroups([
                ['pingable', 'Commands for Pingable users']
            ])
            // .registerCommandsIn(path.join(__dirname, './commands'))

        this.registry.registerCommands([
            ExtendTimeout,
            ClearTimeout,
        ])
    }

    public async start() {
        await this.database.init();
        await this.pingableUserController.init();
        await this.login(CONFIG.bot.token)
    }

    public getPingableUserController() {
        return this.pingableUserController;
    }

    public getPingController() {
        return this.pingController;
    }

    public getDatabase() {
        return this.database;
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