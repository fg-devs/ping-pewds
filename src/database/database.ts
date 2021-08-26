import { Pool, PoolConfig, DatabaseError, PoolClient } from 'pg';
import Table from './models/Table';
import BlockedUsersTable from './tables/BlockedUsers';
import Bot from '../Bot';
import {BotLogger} from "../utils/logger";
import PunishmentsTable from "./tables/Punishments";

type CustomizedConfig = PoolConfig & {
    schema: string;
};

export default class DatabaseManager {
    public readonly pool: Pool;

    private readonly schema: string;

    private readonly escapedSchema: string;

    private readonly username?: string;

    private readonly logger: BotLogger;

    public readonly blockedUsers: BlockedUsersTable;

    public readonly punishments: PunishmentsTable;

    constructor(config: CustomizedConfig) {
        const { schema, ...poolConfig } = config;
        this.pool = new Pool(poolConfig);
        this.username = poolConfig.user;
        this.schema = schema;
        this.escapedSchema = `"${schema}"`;

        this.blockedUsers = new BlockedUsersTable(this);
        this.punishments = new PunishmentsTable(this);

        this.logger = DatabaseManager.getLogger();
    }

    /**
     * acquire a database connection
     */
    public acquire(): Promise<PoolClient> {
        return this.pool.connect();
    }

    /**
     * drops all associated tables
     * -- only used in tests currently
     */
    public async dropAll(): Promise<void> {
        const connection = await this.acquire();

        const tables = this.getAttachedTables();

        await Promise.all(tables.map((table) => table.drop(connection))).catch(
            (err: DatabaseError) => {
                console.log(err);
                throw err;
            }
        );
    }

    /**
     * creates a database schema and validates/creates/migrates all associated tables.
     *
     * Does not catch any errors, so the bot crashes if initialization fails
     */
    public async init(): Promise<void> {
        const connection = await this.acquire();

        await connection.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema};`);

        await Promise.all(
            this.getAttachedTables().map((table) => table.validate(connection))
        );

        connection.release();
    }

    /**
     * gets the original, unescape schema string
     */
    public getSchema(): string {
        return this.schema;
    }

    /**
     * gets a properly escaped schema string
     */
    public getEscapedSchema(): string {
        return this.escapedSchema;
    }

    private getAttachedTables(): Table[] {
        return Object.keys(this)
            .map((key) =>
                (this[key as never] as unknown) instanceof Table
                    ? (this[key as never] as Table)
                    : undefined
            )
            .filter((table) => typeof table !== 'undefined') as Table[];
    }

    public static getLogger(section?: string): BotLogger {
        return Bot.getLogger(`[Database${!!section && `::${section}`}]`);
    }
}
