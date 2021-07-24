import Table from '../models/Table';
import { Parsed, Results, ValidationState } from '../types';
import { PoolClient } from 'pg';
import DatabaseManager from '../database';
import { InsertError, SelectError, UpdateError } from '../errors';

export default class BlockedUsersTable extends Table<
    Results.DBBlockedUser,
    Parsed.BlockedUser
> {
    protected readonly accepted: Array<keyof Parsed.BlockedUser>;
    protected readonly nullables: Array<keyof Parsed.BlockedUser>;

    protected readonly mappedKeys: {
        [s in keyof Parsed.BlockedUser]: keyof Results.DBBlockedUser;
    };

    constructor(manager: DatabaseManager) {
        super(manager, 'blocked_users');
        this.nullables = ['lastMessage'];
        this.accepted = ['id', 'lastMessage'];

        this.mappedKeys = {
            id: 'user_id',
            lastMessage: 'user_last_message',
        };
    }

    /**
     * creates a record for each user that should have pings blocked.
     * @param ids user ids to have records created for
     */
    public async initializeUsers(ids: number | number[]): Promise<boolean>;
    public async initializeUsers(
        connection: PoolClient,
        ids: number | number[]
    ): Promise<boolean>;
    public async initializeUsers(
        connection?: PoolClient | number | number[],
        ids?: number | number[]
    ): Promise<boolean> {
        if (connection instanceof Array || typeof connection === 'number') {
            ids = connection;
            connection = undefined;
        }
        if (typeof ids === 'undefined')
            throw new InsertError('No ids entered to initialize.');
        if (typeof ids === 'number') ids = [ids];
        const params = ids.map((noop, idx) => `($${idx + 1})`).join(',');

        const response = await this.query(
            connection as PoolClient | undefined,
            `INSERT INTO ${this.full} (${this.mappedKeys.id}) VALUES ${params} ON CONFLICT DO NOTHING;`,
            ids
        ).catch((err) => new InsertError(err));

        if (response instanceof Error) throw response;

        return response.rowCount > 0;
    }

    /**
     * Updates the timestamp for the last message send by the user id provided
     * @param id user id to have record updated
     * @param timestamp the timestamp to be updated to
     */
    public async updateLastMessage(id: number, timestamp: number): Promise<boolean>;
    public async updateLastMessage(
        connection: PoolClient,
        id: number,
        timestamp: number
    ): Promise<boolean>;
    public async updateLastMessage(
        connection: PoolClient | number | undefined,
        id: number,
        timestamp?: number
    ): Promise<boolean> {
        if (typeof connection === 'number') {
            timestamp = id;
            id = connection;
            connection = undefined;
        }

        const response = await this.query(
            connection as PoolClient | undefined,
            `UPDATE ${this.full} SET ${this.mappedKeys.lastMessage} = $2 WHERE ${this.mappedKeys.id} = $1;`,
            [id, timestamp as number]
        ).catch((err) => new UpdateError(err));

        if (response instanceof Error) throw response;

        return response.rowCount === 1;
    }

    /**
     * gets the last message timestamp in Date form for the selected user id.
     * @param id user id to get the timestamp from
     */
    public async getLastMessage(id: number): Promise<Date>;
    public async getLastMessage(connection: PoolClient, id: number): Promise<Date>;
    public async getLastMessage(
        connection: PoolClient | number | undefined,
        id?: number
    ): Promise<Date> {
        if (typeof connection === 'number') {
            id = connection;
            connection = undefined;
        }

        const response = await this.query<Results.DBBlockedUser>(
            connection as PoolClient | undefined,
            `SELECT ${this.mappedKeys.lastMessage} FROM ${this.full} WHERE ${this.mappedKeys.id} = $1`,
            [id as number]
        ).catch((err) => new SelectError(err));

        if (response instanceof Error) throw response;

        if (response.rows.length === 1) {
            const date = new Date();
            date.setTime(response.rows[0].user_last_message);
            return date;
        }
        return new Date('01/01/1970');
    }

    /**
     * returns an array for the entire record for the selected user id(s)
     * @param ids users ids to fetch
     */
    public async getById(
        ids: number | number[]
    ): Promise<Array<Parsed.BlockedUser | null>>;
    public async getById(
        connection: PoolClient,
        ids: number | number[]
    ): Promise<Array<Parsed.BlockedUser | null>>;
    public async getById(
        connection: PoolClient | number | number[] | undefined,
        ids?: number | number[]
    ): Promise<Array<Parsed.BlockedUser | null>> {
        if (connection instanceof Array || typeof connection === 'number') {
            ids = connection;
            connection = undefined;
        }
        if (typeof ids === 'undefined')
            throw new InsertError('No ids entered to initialize.');
        if (typeof ids === 'number') ids = [ids];
        const params = ids.map((noop, idx) => `$${idx + 1}`).join(',');

        const response = await this.query<Results.DBBlockedUser>(
            connection as PoolClient | undefined,
            `SELECT * FROM ${this.full} WHERE ${this.mappedKeys.id} IN (${params});`,
            ids
        ).catch((err) => new SelectError(err));

        if (response instanceof Error) throw response;

        return response.rows.map(this.parse);
    }

    /**
     * initializes the table
     * @param connection
     * @protected
     */
    protected async init(connection?: PoolClient): Promise<ValidationState> {
        try {
            if (typeof connection === 'undefined') connection = await this.acquire();

            await this.query(
                connection,
                `CREATE TABLE ${this.full} (
                    ${this.mappedKeys.id}         BIGINT NOT NULL,
                    ${this.mappedKeys.lastMessage}   BIGINT
                 );`
            );

            await this.query(
                connection,
                `CREATE UNIQUE INDEX ${this.name}_uindex ON ${this.full} (${this.mappedKeys.id});`
            );

            await this.query(
                connection,
                `ALTER TABLE ${this.full} ADD CONSTRAINT ${this.name}_pk PRIMARY KEY (${this.mappedKeys.id});`
            );

            return ValidationState.VALIDATED;
        } catch (e) {
            this.getLogger().error(e);
            return ValidationState.INVALID;
        }
    }

    /**
     * parses the raw database response into a usable object
     * @param data
     * @protected
     */
    protected parse(data?: Results.DBBlockedUser): Parsed.BlockedUser | null {
        if (data) {
            return {
                id: data.user_id,
                lastMessage: Number.parseInt(`${data.user_last_message}`),
            };
        }
        return null;
    }
}
