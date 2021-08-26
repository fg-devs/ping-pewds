import {SapphireClient} from "@sapphire/framework";
import { CONFIG } from './globals';
import {BotLogger} from './utils/logger';
import IssueHandler from './IssueHandler';
import EventHandler from './EventHandler';
import { PingableUserController } from './controllers/PingableUserController';
import DatabaseManager from './database/database';
import { PingController } from './controllers/PingController';
import ExtendTimeout from './commands/pingable/extendtimeout';
import ClearTimeout from './commands/pingable/cleartimeout';
import PunishmentController from "./controllers/PunishmentController";

class Bot extends SapphireClient {
    private readonly events: EventHandler;

    private readonly pingableUserController: PingableUserController;

    private readonly pingController: PingController;

    private readonly punishmentController: PunishmentController;

    private readonly database: DatabaseManager;

    private readonly synchronizeTimeout: number;

    private synchronizeLoop: NodeJS.Timeout | undefined;

    constructor() {
        super({
            defaultPrefix: CONFIG.bot.prefix,
            id: CONFIG.bot.token,
            logger: {
                instance: BotLogger.getInstance()
            }
        })

        this.synchronizeTimeout = 1000 * 60; // 1 minute

        this.database = new DatabaseManager({
            host: CONFIG.database.host,
            port: CONFIG.database.port,
            user: CONFIG.database.user,
            database: CONFIG.database.database,
            schema: CONFIG.database.schema,
            password: CONFIG.database.pass,
            max: CONFIG.database.connections,
        });

        this.pingableUserController = new PingableUserController(this);
        this.pingController = new PingController(this);
        this.punishmentController = new PunishmentController(this);

        this.events = new EventHandler(this);
        this.registerEvents();

    }

    /**
     * start the bot by initializing the database and controllers, then logging into Discord.
     */
    public async start(): Promise<void> {
        await this.database.init();
        await this.login(CONFIG.bot.token);
        await this.punishmentController.synchronize();
        await this.pingableUserController.init();
        this.synchronizeLoop = setInterval(
            () => this.punishmentController.synchronize()
                .catch((err) => Bot.getLogger('synchronization').error(err)),
            this.synchronizeTimeout
        )
    }

    /**
     * Register message listeners and command handlers
     * @private
     */
    private registerEvents(): void {
        const issues = new IssueHandler();
        this.on('commandError', issues.onCommandError.bind(issues));
        this.on('commandRun', issues.onCommandRun.bind(issues));

        this.on('message', this.events.onMessage.bind(this.events));

        this.once('ready', this.events.onReady.bind(this.events));
    }

    public getPingableUserController(): PingableUserController {
        return this.pingableUserController;
    }

    public getPingController(): PingController {
        return this.pingController;
    }

    public getPunishmentController(): PunishmentController {
        return this.punishmentController;
    }

    public getDatabase(): DatabaseManager {
        return this.database;
    }

    public static getLogger(section: string): BotLogger {
        return BotLogger.getInstance()
            .getTitledInstance(section);
    }
}

export default Bot;
