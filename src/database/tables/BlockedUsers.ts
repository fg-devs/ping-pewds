import Table from "../models/Table";
import {Parsed, Results, ValidationState} from "../types";
import {PoolClient} from "pg";
import DatabaseManager from "../database";
import {Logger} from "../../utils/logger";
import {InsertError, SelectError, UpdateError} from "../errors";

const logger = Logger.getLogger('database:table:blocked_users');

export default class BlockedUsersTable extends Table<Results.DBBlockedUser, Parsed.BlockedUser> {

    protected readonly accepted: Array<keyof Parsed.BlockedUser>;
    protected readonly nullables: Array<keyof Parsed.BlockedUser>;

    protected readonly mappedKeys: {
        [s in keyof Parsed.BlockedUser]: keyof Results.DBBlockedUser;
    }

    constructor(manager: DatabaseManager) {
        super(manager, 'blocked_users');
        this.nullables = ['lastPing'];
        this.accepted = ['id', 'lastPing'];

        this.mappedKeys = {
            id: 'user_id',
            lastPing: 'user_last_ping'
        }
    }

    public async initializeUsers(ids: number | number[]): Promise<boolean>
    public async initializeUsers(connection: PoolClient, ids: number | number[]): Promise<boolean>
    public async initializeUsers(connection?: PoolClient | number | number[], ids?: number | number[]): Promise<boolean> {
        if ((connection instanceof Array) || typeof connection === 'number') {
            ids = connection;
            connection = undefined;
        }
        if (typeof ids === 'undefined') throw new InsertError('No ids entered to initialize.');
        if (typeof ids === 'number') ids = [ids];
        const params = ids.map((noop, idx) => `($${idx+1})`).join(',');

        const response = await this.query(
            connection as PoolClient | undefined,
            `INSERT INTO ${this.full} (${this.mappedKeys.id}) VALUES ${params} ON CONFLICT DO NOTHING;`,
            ids
        ).catch((err) => new InsertError(err));

        if (response instanceof Error) throw response;

        return response.rowCount > 0;
    }

    public async updateLastPing(id: number, timestamp: number): Promise<boolean>
    public async updateLastPing(connection: PoolClient, id: number, timestamp: number): Promise<boolean>
    public async updateLastPing(connection: PoolClient | number | undefined, id: number, timestamp?: number): Promise<boolean> {
        if (typeof connection === 'number') {
            timestamp = id;
            id = connection;
            connection = undefined;
        }

        const response = await this.query(
            connection as PoolClient | undefined,
            `UPDATE ${this.full} SET ${this.mappedKeys.lastPing} = $2 WHERE ${this.mappedKeys.id} = $1;`,
            [id, timestamp as number]
        ).catch((err) => new UpdateError(err));

        if (response instanceof Error) throw response;

        return response.rowCount === 1;
    }

    public async getLastPing(id: number): Promise<Date>
    public async getLastPing(connection: PoolClient, id: number): Promise<Date>
    public async getLastPing(connection: PoolClient | number | undefined, id?: number): Promise<Date> {
        if (typeof connection === 'number') {
            id = connection;
            connection = undefined;
        }

        const response = await this.query<Results.DBBlockedUser>(
            connection as PoolClient | undefined,
            `SELECT ${this.mappedKeys.lastPing} FROM ${this.full} WHERE ${this.mappedKeys.id} = $1`,
            [id as number]
        ).catch((err) => new SelectError(err));

        if (response instanceof Error) throw response;

        if (response.rows.length === 1) {
            const date = new Date();
            date.setTime(response.rows[0].user_last_ping);
            return date;
        }
        return new Date('01/01/1970');
    }

    public async getById(ids: number | number[]): Promise<Array<Parsed.BlockedUser | null>>
    public async getById(connection: PoolClient, ids: number | number[]): Promise<Array<Parsed.BlockedUser | null>>
    public async getById(connection: PoolClient | number | number[] | undefined, ids?: number | number[]): Promise<Array<Parsed.BlockedUser | null>> {
        if ((connection instanceof Array) || typeof connection === 'number') {
            ids = connection;
            connection = undefined;
        }
        if (typeof ids === 'undefined') throw new InsertError('No ids entered to initialize.');
        if (typeof ids === 'number') ids = [ids];
        const params = ids.map((noop, idx) => `$${idx+1}`).join(',');

        const response = await this.query<Results.DBBlockedUser>(
            connection as PoolClient | undefined,
            `SELECT * FROM ${this.full} WHERE ${this.mappedKeys.id} IN (${params});`,
            ids,
        ).catch((err) => new SelectError(err));

        if (response instanceof Error) throw response;

        return response.rows.map(this.parse);
    }


    protected async init(connection?: PoolClient): Promise<ValidationState> {
        try {
            if (typeof connection === 'undefined') connection = await this.acquire();

            await this.query(
                connection,
                `CREATE TABLE ${this.full} (
                    ${this.mappedKeys.id}         BIGINT NOT NULL,
                    ${this.mappedKeys.lastPing}   BIGINT
                 );`
            )

            await this.query(
                connection,
                `CREATE UNIQUE INDEX ${this.name}_uindex ON ${this.full} (${this.mappedKeys.id});`
            )

            await this.query(
                connection,
                `ALTER TABLE ${this.full} ADD CONSTRAINT ${this.name}_pk PRIMARY KEY (${this.mappedKeys.id});`
            )


            return ValidationState.VALIDATED;
        } catch (e) {
            logger.error(e);
            return ValidationState.INVALID;
        }
    }

    protected parse(data?: Results.DBBlockedUser): Parsed.BlockedUser | null {
        if (data) {
            return {
                id: data.user_id,
                lastPing: Number.parseInt(`${data.user_last_ping}`),
            }
        }
        return null;
    }

}