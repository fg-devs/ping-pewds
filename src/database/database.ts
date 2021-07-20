import {Pool, PoolConfig, DatabaseError} from "pg";
import Table from "./models/Table";
import getLogger from "../utils/logger";
import BlockedUsersTable from "./tables/BlockedUsers";
const logger = getLogger('database:manager')

type CustomizedConfig = PoolConfig & {
    schema: string;
}

export default class DatabaseManager {
    public readonly pool: Pool;

    private readonly schema: string;
    private readonly escapedSchema: string;
    private readonly username?: string;

    public readonly blockedUsers: BlockedUsersTable;

    constructor(config: CustomizedConfig) {
        const { schema, ...poolConfig } = config;
        this.pool = new Pool(poolConfig);
        this.username = poolConfig.user;
        this.schema = schema;
        this.escapedSchema = `"${schema}"`;

        this.blockedUsers = new BlockedUsersTable(this);
    }


    public acquire() {
        return this.pool.connect();
    }

    public async dropAll() {
        const connection = await this.acquire();

        const tables = this.getAttachedTables();

        await Promise.all(tables.map((table) => table.drop(connection)))
            .catch((err: DatabaseError) => {
                console.log(err);
                throw err;
            })
    }

    public async init() {
        const connection = await this.acquire();
        try {
            await connection.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema};`);
        } catch (e) {
            console.error(e)
        }

        await Promise.all(this.getAttachedTables().map((table) =>
            table.validate(connection)
        )).catch((err) => logger.error(err));

        connection.release();
    }

    public getSchema() {
        return this.schema;
    }

    public getEscapedSchema() {
        return this.escapedSchema;
    }

    private getAttachedTables() {
        return Object.keys(this)
            .map((key) => (this[key as never] as unknown instanceof Table ? this[key as never] as Table : undefined))
            .filter((table) => typeof table !== 'undefined') as Table[];
    }
}