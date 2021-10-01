import { PoolClient } from 'pg';
import Table from '../models/Table';
import { Parsed, Results, ValidationState } from '../types';
import DatabaseManager from '../database';
import { DatabaseError, InsertError, SelectError, UpdateError } from '../errors';

type HistoryObject = {
    userId: number | string;
    endsAt: number | boolean;
    expiresAt?: number;
    active?: boolean;
};

export default class PunishmentHistory extends Table<
    Results.DBPunishmentHistory,
    Parsed.PunishmentHistory
> {
    protected readonly accepted: Array<keyof Parsed.PunishmentHistory>;

    protected readonly nullables: Array<keyof Parsed.PunishmentHistory>;

    protected readonly mappedKeys: {
        [s in keyof Parsed.PunishmentHistory]: keyof Results.DBPunishmentHistory;
    };

    constructor(manager: DatabaseManager) {
        super(manager, 'punishment_history');

        this.nullables = ['expiresAt'];
        this.accepted = ['userId', 'endsAt', 'active', 'expiresAt'];

        this.mappedKeys = {
            id: 'history_id',
            userId: 'history_user_id',
            active: 'history_active',
            endsAt: 'history_ends_at',
            expiresAt: 'history_expires_at',
            createdAt: 'history_created_at',
        };
    }

    public async create(history: HistoryObject): Promise<boolean>;

    public async create(connection: PoolClient, history: HistoryObject): Promise<boolean>;

    /**
     * Create an actual punishment for a user.
     * @param connection
     * @param history
     */
    public async create(
        connection: PoolClient | HistoryObject | undefined,
        history?: HistoryObject
    ): Promise<boolean> {
        if (
            typeof (connection as HistoryObject).userId === 'number' ||
            typeof (connection as HistoryObject).userId === 'string'
        ) {
            history = connection as HistoryObject;
            connection = undefined;
        }

        if (typeof history?.userId !== 'number' && typeof history?.userId !== 'string') {
            throw new InsertError('history object is not valid');
        }

        const values = [
            history.userId,
            // Math.round(punishment.endsAt / 1000),
        ];
        const fields = [
            this.mappedKeys.userId,
            // this.mappedKeys.endsAt
        ];

        if (typeof history.endsAt === 'number') {
            values.push(Math.round(history.endsAt / 1000));
            fields.push(this.mappedKeys.endsAt);
        }

        if (typeof history.expiresAt === 'number') {
            values.push(Math.round(history.expiresAt / 1000));
            fields.push(this.mappedKeys.expiresAt);
        }

        if (typeof history.active === 'boolean') {
            values.push(history.active ? 1 : 0);
            fields.push(this.mappedKeys.active);
        }

        const response = await this.query(
            connection as PoolClient | undefined,
            `INSERT INTO ${this.full} (${fields.join(', ')}) VALUES (${values
                .map((_, idx) => `$${idx + 1}`)
                .join(', ')});`,
            values
        ).catch((err) => new InsertError(err));

        if (response instanceof DatabaseError) throw response;

        return response.rowCount > 0;
    }

    public async getByUserId(
        userId: string | number
    ): Promise<Array<Parsed.PunishmentHistory>>;

    public async getByUserId(
        userId: string | number,
        includeEnded: boolean
    ): Promise<Array<Parsed.PunishmentHistory>>;

    public async getByUserId(
        userId: string | number,
        includeEnded: boolean,
        includeExpired: boolean
    ): Promise<Array<Parsed.PunishmentHistory>>;

    public async getByUserId(
        connection: PoolClient,
        userId: string | number
    ): Promise<Array<Parsed.PunishmentHistory>>;

    public async getByUserId(
        connection: PoolClient,
        userId: string | number,
        includeEnded: boolean
    ): Promise<Array<Parsed.PunishmentHistory>>;

    public async getByUserId(
        connection: PoolClient,
        userId: string | number,
        includeEnded: boolean,
        includeExpired: boolean
    ): Promise<Array<Parsed.PunishmentHistory>>;

    /**
     * Get a specific users punishment history
     * @param connection [PoolClient | string | number | boolean | undefined]
     * @param userId [string | number | boolean]
     * @param includeEnded [boolean]
     * @param includeExpired [boolean]
     */
    public async getByUserId(
        connection: PoolClient | string | number | undefined,
        userId?: string | number | boolean,
        includeEnded = false,
        includeExpired = false
    ): Promise<Array<Parsed.PunishmentHistory>> {
        if (typeof connection === 'string' || typeof connection === 'number') {
            includeExpired = includeEnded || false;
            includeEnded = (userId as boolean) || false;
            userId = connection;
            connection = undefined;
        }

        if (typeof userId !== 'number' && typeof userId !== 'string')
            throw new SelectError('user id is not a number');

        let filter = '';
        if (!includeEnded) {
            filter = `AND (${this.mappedKeys.endsAt} >= EXTRACT(EPOCH FROM NOW()) OR ${this.mappedKeys.endsAt} IS NULL) `;
        }

        if (!includeExpired) {
            filter += `AND (${this.mappedKeys.expiresAt} >= EXTRACT(EPOCH FROM NOW()) OR ${this.mappedKeys.expiresAt} IS NULL) `;
        }

        const response = await this.query<Results.DBPunishmentHistory>(
            connection as PoolClient | undefined,
            `SELECT * FROM ${this.full} WHERE ${this.mappedKeys.userId} = $1 ${filter};`,
            [userId]
        ).catch((err) => new SelectError(err));

        if (response instanceof DatabaseError) throw response;

        return response.rows.map(this.parse);
    }

    public async getAllLatest(): Promise<Array<Parsed.PunishmentHistoryWithCount | null>>;

    public async getAllLatest(
        connection: PoolClient
    ): Promise<Array<Parsed.PunishmentHistoryWithCount | null>>;

    /**
     * returns the latest active punishment for each user who has been punished by the bot.
     * @param connection
     */
    public async getAllLatest(
        connection?: PoolClient
    ): Promise<Array<Parsed.PunishmentHistoryWithCount | null>> {
        const response = await this.query<Results.DBPunishmentHistoryWithCount>(
            connection,
            `SELECT DISTINCT ON(${this.mappedKeys.userId}) *, (
                SELECT count(*) as count FROM ${this.full} b
                    WHERE b.${this.mappedKeys.userId} = a.${this.mappedKeys.userId}
                    -- AND (b.${this.mappedKeys.endsAt} >= EXTRACT(EPOCH FROM NOW()) OR b.${this.mappedKeys.endsAt} IS NULL)
                    AND (b.${this.mappedKeys.expiresAt} >= EXTRACT(EPOCH FROM NOW()) OR b.${this.mappedKeys.expiresAt} IS NULL)
                ) FROM ${this.full} a WHERE 
                (a.${this.mappedKeys.expiresAt} >= EXTRACT(EPOCH FROM NOW()) OR a.${this.mappedKeys.expiresAt} IS NULL)
                -- AND (a.${this.mappedKeys.endsAt} >= EXTRACT(EPOCH FROM NOW()) OR a.${this.mappedKeys.endsAt} IS NULL)
                AND a.${this.mappedKeys.active} = 1
                ORDER BY ${this.mappedKeys.userId}, ${this.mappedKeys.id} DESC;`
        ).catch((err) => new SelectError(err));

        if (response instanceof DatabaseError) throw response;

        return response.rows.map((item) => {
            const parsed = this.parse(item);
            if (parsed) {
                return {
                    ...parsed,
                    count: Number.parseInt(item.count, 10),
                };
            }
            return null;
        });
    }

    public async setActive(id: string | number, active: boolean): Promise<boolean>;

    public async setActive(
        connection: PoolClient,
        id: string | number,
        active: boolean
    ): Promise<boolean>;

    /**
     * sets the selected punishment's active state to the state you provide.
     * @param connection [PoolClient | string | number | undefined]
     * @param id [string | number | boolean]
     * @param active [boolean | undefined]
     */
    public async setActive(
        connection: PoolClient | string | number | undefined,
        id: string | number | boolean,
        active?: boolean
    ): Promise<boolean> {
        if (typeof connection === 'string' || typeof connection === 'number') {
            active = id as boolean;
            id = connection;
            connection = undefined;
        }

        const response = await this.query(
            connection as PoolClient | undefined,
            `UPDATE ${this.full} SET ${this.mappedKeys.active} = $2 WHERE ${this.mappedKeys.id} = $1`,
            [id, active ? 1 : 0]
        ).catch((err) => new UpdateError(err));

        if (response instanceof DatabaseError) throw response;

        return response.rowCount > 0;
    }

    /**
     * Create table if it does not exist
     */
    protected async init(connection?: PoolClient): Promise<ValidationState> {
        try {
            if (typeof connection === 'undefined') connection = await this.acquire();

            await this.query(
                connection,
                `CREATE TABLE ${this.full}
                 (
                     ${this.mappedKeys.id} serial NOT NULL,
                     ${this.mappedKeys.userId} BIGINT NOT NULL,
                     ${this.mappedKeys.active} INT DEFAULT 1,
                     ${this.mappedKeys.endsAt} INT,
                     ${this.mappedKeys.expiresAt} INT,
                     ${this.mappedKeys.createdAt} INT DEFAULT EXTRACT(EPOCH FROM NOW())
                 );`
            );

            await this.query(
                connection,
                `CREATE INDEX ${this.name}_user_id_index
                    ON ${this.full} (${this.mappedKeys.userId});`
            );

            await this.query(
                connection,
                `CREATE INDEX ${this.name}_ends_at_index
                    ON ${this.full} (${this.mappedKeys.endsAt});`
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
     * parse the raw database data into usable objects
     */
    protected parse(data: Results.DBPunishmentHistory): Parsed.PunishmentHistory {
        return {
            id: data.history_id,
            active: data.history_active === 1,
            userId: data.history_user_id,
            endsAt: data.history_ends_at ? new Date(data.history_ends_at * 1000) : null,
            expiresAt: data.history_expires_at
                ? new Date(data.history_expires_at * 1000)
                : null,
            createdAt: new Date(data.history_created_at * 1000),
        };
    }
}
