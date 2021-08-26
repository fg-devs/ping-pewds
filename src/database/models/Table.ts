import { PoolClient, QueryResult } from 'pg';
import DatabaseManager from '../database';
import { DatabaseError } from '../errors';
import { DBParsed, DBTable, ValidationState, ValueObject } from '../types';
import { BotLogger } from '../../utils/logger';

export default class Table<Row = DBTable, Parsed = DBParsed> {
    protected readonly manager: DatabaseManager;

    protected readonly name: string;

    protected readonly full: string;

    protected state: ValidationState;

    protected readonly accepted: Array<keyof Parsed>;

    protected readonly nullables: Array<keyof Parsed>;

    protected readonly mappedKeys: {
        [s in keyof Parsed]: keyof Row;
    };

    constructor(manager: DatabaseManager, name: string) {
        this.manager = manager;
        this.name = name;
        this.full = `${this.manager.getEscapedSchema()}."${this.name}"`;
        this.state = ValidationState.NOT_PROCESSED;
        this.accepted = [];
        this.nullables = [];
        this.mappedKeys = {} as any;
    }

    /**
     * get a database connection from DatabaseManager
     */
    public acquire(): Promise<PoolClient> {
        return this.manager.acquire();
    }

    /**
     * uses the connection to query the database
     * @param connection
     * @param statement
     * @param values
     */
    private attachedQuery<T = any>(
        connection: PoolClient,
        statement: string,
        values?: ValueObject
    ): Promise<QueryResult<T>> {
        return new Promise((resolve, reject) => {
            connection.query<T>(statement, values || [], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
    }

    /**
     * creates a new connection, performs the query, then releases the connection
     * @param statement
     * @param values
     */
    private async internalQuery<T = any>(
        statement: string,
        values?: ValueObject
    ): Promise<QueryResult<T>> {
        const connection = await this.acquire();

        const result = await this.attachedQuery(connection, statement, values).catch(
            (err) => {
                connection.release(err);
                throw err;
            }
        );

        connection.release();
        return result;
    }

    /**
     * used to query ther database
     * @param connection a previously acquired database connection
     * @param statement the SQL statement to be queried
     * @param values the parameters sent along with the statement
     */
    public async query<T = any>(
        statement: string,
        values?: ValueObject
    ): Promise<QueryResult<T>>;

    public async query<T = any>(
        connection: PoolClient | undefined,
        statement: string,
        values?: ValueObject
    ): Promise<QueryResult<T>>;

    public async query<T = any>(
        connection: PoolClient | string | undefined,
        statement?: string | ValueObject,
        values?: ValueObject
    ): Promise<QueryResult<T>> {
        if (typeof connection === 'object') {
            return this.attachedQuery(connection, statement as string, values);
        }
        if (typeof connection === 'string') {
            return this.internalQuery(connection, statement as ValueObject);
        }
        if (typeof statement === 'string') {
            return this.internalQuery(statement, values);
        }
        console.error({ connection, statement, values });
        throw new DatabaseError('should never happen', 'but it did, so...');
    }

    /**
     * Checks to see if the table exists
     * @param connection
     * @protected
     */
    protected async tableExists(connection?: PoolClient): Promise<boolean> {
        const response = await this.query(
            connection,
            `select COUNT(*) as count from information_schema.columns where table_schema = $1 and table_name = $2;`,
            [this.manager.getSchema(), this.name]
        ).catch((err) => new DatabaseError(err));

        if (response instanceof DatabaseError) throw response;

        return response.rows[0].count > 0;
    }

    /**
     * Drops the current table
     * @param connection
     */
    public async drop(connection?: PoolClient): Promise<void> {
        await this.query(connection, `DROP TABLE IF EXISTS ${this.full};`);
    }

    /**
     * gets the database name string
     */
    public getName(): string {
        return this.name;
    }

    /**
     * gets the fully qualified table name. ("schema"."table_name")
     */
    public getFullName(): string {
        return this.full;
    }

    /**
     * Goes through validation steps to ensure that the table exists and handles migrations
     * @param connection
     */
    public async validate(connection?: PoolClient): Promise<void> {
        const exists = await this.tableExists(connection);
        if (exists) {
            switch (this.state) {
                case ValidationState.NOT_PROCESSED:
                case ValidationState.NEEDS_MIGRATION:
                    this.state = await this.migrate(connection);
                    break;
                case ValidationState.HAS_ADDITIONAL_INIT:
                    this.state = await this.init(connection);
                    this.getLogger().debug(
                        `${this.full} required additional initialization.`
                    );
                    await this.validate(connection);
                    break;
                default:
                    throw new DatabaseError(
                        'Initialization Failed',
                        'Database could not be validated successfully'
                    );
            }
        } else {
            this.state = await this.init(connection);
            this.getLogger().debug(`${this.name} table created.`);
            if (this.state >= ValidationState.NEEDS_MIGRATION) {
                await this.validate(connection);
            }
        }
    }

    /**
     * Parses database response into a usable, parsed object
     * @param data
     * @protected
     */
    protected parse(data?: Row): Parsed | null {
        throw new DatabaseError(`Row parse for ${this.full} has not been implemented.`);
    }

    /**
     * Used to make changes to the table after the table has been created, instead of having to drop and recreate.
     * @param connection
     * @protected
     */
    protected async migrate(connection?: PoolClient): Promise<ValidationState> {
        return ValidationState.VALIDATED;
    }

    /**
     * initializes the table by creating it if it does not exist, along with creating all required indexes
     * @param connection
     * @protected
     */
    protected async init(connection?: PoolClient): Promise<ValidationState> {
        throw new Error(`Table init for ${this.full} has not been implemented.`);
    }

    protected getLogger(): BotLogger {
        return DatabaseManager.getLogger(`Table::${this.name}`);
    }
}
