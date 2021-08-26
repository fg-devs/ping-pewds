import Table from "../models/Table";
import {Parsed, Results, ValidationState} from "../types";
import DatabaseManager from "../database";
import {PoolClient} from "pg";
import {InsertError, SelectError, UpdateError} from "../errors";

type PunishmentObject = {
    userId: number | string;
    endsAt: number | boolean;
    expiresAt?: number;
    active?: boolean;
}

export default class PunishmentsTable extends Table<Results.DBPunishment, Parsed.Punishment> {
    protected readonly accepted: Array<keyof Parsed.Punishment>;
    protected readonly nullables: Array<keyof Parsed.Punishment>;

    protected readonly mappedKeys: {
        [s in keyof Parsed.Punishment]: keyof Results.DBPunishment;
    }

    constructor(manager: DatabaseManager) {
        super(manager, 'punishments');

        this.nullables = ['expiresAt']
        this.accepted = ['userId', 'endsAt', 'active', 'expiresAt'];

        this.mappedKeys = {
            id: 'punishment_id',
            userId: 'punishment_user_id',
            active: 'punishment_active',
            endsAt: 'punishment_ends_at',
            expiresAt: 'punishment_expires_at',
            createdAt: 'punishment_created_at'
        }
    }

    public async create(punishment: PunishmentObject): Promise<boolean>
    public async create(connection: PoolClient, punishment: PunishmentObject): Promise<boolean>
    public async create(connection: PoolClient | PunishmentObject | undefined, punishment?: PunishmentObject): Promise<boolean> {
        if (typeof (connection as PunishmentObject).userId === 'number'
            || typeof (connection as PunishmentObject).userId === 'string') {
            punishment = connection as PunishmentObject;
            connection = undefined;
        }

        if (typeof punishment?.userId !== 'number' && typeof punishment?.userId !== 'string') {
            throw new InsertError('punishment object is not valid')
        }

        const values = [
            punishment.userId,
            // Math.round(punishment.endsAt / 1000),
        ]
        const fields = [
            this.mappedKeys.userId,
            // this.mappedKeys.endsAt
        ]

        if (typeof punishment.endsAt === 'number') {
            values.push(Math.round(punishment.endsAt / 1000));
            fields.push(this.mappedKeys.endsAt);
        }

        if (typeof punishment.expiresAt === 'number') {
            values.push(Math.round(punishment.expiresAt / 1000));
            fields.push(this.mappedKeys.expiresAt);
        }

        if (typeof punishment.active === 'boolean') {
            values.push(punishment.active ? 1 : 0);
            fields.push(this.mappedKeys.active);
        }

        const response = await this.query(
            connection as PoolClient | undefined,
            `INSERT INTO ${this.full} (${fields.join(', ')}) VALUES (${values.map((_, idx) => '$' + (idx + 1)).join(', ')});`,
            values
        ).catch((err) => new InsertError(err));

        if (response instanceof Error) throw response;

        return response.rowCount > 0;
    }

    public async getByUserId(userId: string | number): Promise<Array<Parsed.Punishment | null>>
    public async getByUserId(userId: string | number, includeEnded: boolean): Promise<Array<Parsed.Punishment | null>>
    public async getByUserId(userId: string | number, includeEnded: boolean, includeExpired: boolean): Promise<Array<Parsed.Punishment | null>>
    public async getByUserId(connection: PoolClient, userId: string | number): Promise<Array<Parsed.Punishment | null>>
    public async getByUserId(connection: PoolClient, userId: string | number, includeEnded: boolean): Promise<Array<Parsed.Punishment | null>>
    public async getByUserId(connection: PoolClient, userId: string | number, includeEnded: boolean, includeExpired: boolean): Promise<Array<Parsed.Punishment | null>>
    public async getByUserId(connection: PoolClient | string | number | undefined, userId?: string | number | boolean, includeEnded = false, includeExpired = false): Promise<Array<Parsed.Punishment | null>> {
        if (typeof connection === 'string' || typeof connection === 'number') {
            includeExpired = includeEnded || false;
            includeEnded = userId as boolean || false;
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
        
        const response = await this.query<Results.DBPunishment>(
            connection as PoolClient | undefined,
            `SELECT * FROM ${this.full} WHERE ${this.mappedKeys.userId} = $1 ${filter};`,
            [ userId ]
        ).catch((err) => new SelectError(err));
        
        if (response instanceof Error) throw response;
        
        return response.rows.map(this.parse);
    }

    public async getAllLatest(): Promise<Array<Parsed.PunishmentWithCount | null>>
    public async getAllLatest(connection: PoolClient): Promise<Array<Parsed.PunishmentWithCount | null>>
    public async getAllLatest(connection?: PoolClient): Promise<Array<Parsed.PunishmentWithCount | null>> {

        const response = await this.query<Results.DBPunishmentWithCount>(
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
        ).catch((err) => new SelectError(err))

        if (response instanceof Error) throw response;

        return response.rows.map((item) => {
            const parsed = this.parse(item);
            if (parsed) {
                return {
                    ...parsed,
                    count: Number.parseInt(item.count)
                };
            }
            return null;
        });
    }

    public async getAllActive(): Promise<Array<Parsed.PunishmentWithCount | null>>
    public async getAllActive(connection: PoolClient): Promise<Array<Parsed.PunishmentWithCount | null>>
    public async getAllActive(connection?: PoolClient): Promise<Array<Parsed.PunishmentWithCount | null>> {

        // original query that didn't have the total number of active punishments
        const sql1 = `SELECT DISTINCT ON(${this.mappedKeys.userId}) * FROM ${this.full} WHERE
                (${this.mappedKeys.endsAt} >= EXTRACT(EPOCH FROM NOW()) OR ${this.mappedKeys.endsAt} IS NULL)
                AND (${this.mappedKeys.expiresAt} >= EXTRACT(EPOCH FROM NOW()) OR ${this.mappedKeys.expiresAt} IS NULL)
            ORDER BY ${this.mappedKeys.userId}, ${this.mappedKeys.id} DESC;`

        const response = await this.query<Results.DBPunishmentWithCount>(
            connection,
            `SELECT DISTINCT ON(${this.mappedKeys.userId}) *, (
                SELECT count(*) as count FROM ${this.full} b
                    WHERE b.${this.mappedKeys.userId} = a.${this.mappedKeys.userId}
                    AND (b.${this.mappedKeys.endsAt} >= EXTRACT(EPOCH FROM NOW()) OR b.${this.mappedKeys.endsAt} IS NULL)
                    AND (b.${this.mappedKeys.expiresAt} >= EXTRACT(EPOCH FROM NOW()) OR b.${this.mappedKeys.expiresAt} IS NULL)
                ) FROM ${this.full} a WHERE
                    (a.${this.mappedKeys.endsAt} >= EXTRACT(EPOCH FROM NOW()) OR a.${this.mappedKeys.endsAt} IS NULL)
                    AND (a.${this.mappedKeys.expiresAt} >= EXTRACT(EPOCH FROM NOW()) OR a.${this.mappedKeys.expiresAt} IS NULL);`
        ).catch((err) => new SelectError(err))

        if (response instanceof Error) throw response;

        return response.rows.map((item) => {
            const parsed = this.parse(item);
            if (parsed) {
                return {
                    ...parsed,
                    count: Number.parseInt(item.count)
                };
            }
            return null;
        });
    }

    public async setActive(id: string | number, active: boolean): Promise<boolean>
    public async setActive(connection: PoolClient, id: string | number, active: boolean): Promise<boolean>
    public async setActive(connection: PoolClient | string | number | undefined, id: string | number | boolean, active?: boolean): Promise<boolean> {
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

        if (response instanceof Error) throw response;

        return response.rowCount > 0;
    }

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
            )

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

    protected parse(data?: Results.DBPunishment): Parsed.Punishment | null {
        if (data) {
            return {
                id: data.punishment_id,
                active: data.punishment_active === 1,
                userId: data.punishment_user_id,
                endsAt: data.punishment_ends_at ? new Date(data.punishment_ends_at * 1000) : null,
                expiresAt: data.punishment_expires_at ? new Date(data.punishment_expires_at * 1000) : null,
                createdAt: new Date(data.punishment_created_at * 1000)
            }
        }
        return null;
    }
}