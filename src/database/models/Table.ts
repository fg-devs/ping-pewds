import DatabaseManager from "../database";
import {DatabaseError} from "../errors";
import {PoolClient, QueryResult} from "pg";
import {DBParsed, DBTable, ValidationState} from "../types";
import {Logger} from "../../utils/logger";

const logger = Logger.getLogger('database:table');

export type ValueObject = Array<string|number|boolean>;

export default class Table<Row = DBTable, Parsed = DBParsed> {
    protected readonly manager: DatabaseManager;

    protected readonly name: string;
    protected readonly full: string;

    protected state: ValidationState;

    protected readonly accepted: Array<keyof Parsed>;
    protected readonly nullables: Array<keyof Parsed>;

    protected readonly mappedKeys: {
        [s in keyof Parsed]: keyof Row;
    }

    constructor(manager: DatabaseManager, name: string) {
        this.manager = manager;
        this.name = name;
        this.full = `${this.manager.getEscapedSchema()}."${this.name}"`
        this.state = ValidationState.NOT_PROCESSED;
        this.accepted = [];
        this.nullables = [];
        this.mappedKeys = {} as any;
    }

    public acquire() {
        return this.manager.acquire();
    }

    public attachedQuery<T = any>(connection: PoolClient, statement: string, values?: ValueObject): Promise<QueryResult<T>> {
        return new Promise((resolve, reject) => {
            connection.query<T>(statement, values || [], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            })
        })
    }

    public async internalQuery<T = any>(statement: string, values?: ValueObject): Promise<QueryResult<T>> {
        const connection = await this.acquire();

        const result = await this.attachedQuery(connection, statement, values)
            .catch((err) => {
                connection.release(err);
                throw err;
            })

        connection.release();
        return result;
    }

    public async query<T = any>(statement: string, values?: ValueObject): Promise<QueryResult<T>>
    public async query<T = any>(connection: PoolClient | undefined, statement: string, values?: ValueObject): Promise<QueryResult<T>>
    public async query<T = any>(connection: PoolClient | string | undefined, statement?: string | ValueObject, values?: ValueObject): Promise<QueryResult<T>> {
        if (typeof connection === 'object') {
            return this.attachedQuery(connection, statement as string, values);
        }
        if (typeof connection === 'string') {
            return this.internalQuery(connection, statement as ValueObject);
        }
        if (typeof statement === 'string') {
            return this.internalQuery(statement, values);
        }
        console.error({connection, statement, values});
        throw new DatabaseError('should never happen', 'but it did, so...');
    }

    protected async tableExists(connection?: PoolClient) {
        const response = await this.query(
            connection,
            `select COUNT(*) as count from information_schema.columns where table_schema = $1 and table_name = $2;`,
            [this.manager.getSchema(), this.name]
        ).catch((err) => new DatabaseError(err));

        if (response instanceof DatabaseError) throw response;

        return response.rows[0].count > 0;
    }

    public async drop(connection?: PoolClient) {
        await this.query(connection, `DROP TABLE ${this.full};`);
    }

    public getName() {
        return this.name;
    }

    public getFullName() {
        return this.full;
    }

    public async validate(connection?: PoolClient) {
        const exists = await this.tableExists(connection);
        if (exists) {
            switch (this.state) {
                case ValidationState.NOT_PROCESSED:
                case ValidationState.NEEDS_MIGRATION:
                    this.state = await this.migrate(connection);
                    break;
                case ValidationState.HAS_ADDITIONAL_INIT:
                    this.state = await this.init(connection);
                    logger.log(`${this.full} required additional initialization.`);
                    await this.validate(connection);
                    break;
                case ValidationState.INVALID:
                    throw new DatabaseError('Initialization Failed', 'Database could not be validated successfully')
            }
        } else {
            this.state = await this.init(connection);
            logger.log(`${this.name} table created.`);
            if (this.state >= ValidationState.NEEDS_MIGRATION) {
                await this.validate(connection);
            }
        }
    }

    protected parse(data: Row): Parsed {
        throw new DatabaseError(`Row parse for ${this.full} has not been implemented.`);
    }

    protected async migrate(connection?: PoolClient): Promise<ValidationState> {
        return ValidationState.VALIDATED
    }

    protected async init(connection?: PoolClient): Promise<ValidationState> {
        throw new Error(`Table init for ${this.full} has not been implemented.`);
    }
}