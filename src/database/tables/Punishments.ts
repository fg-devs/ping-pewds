import { PoolClient } from 'pg';
import Table from '../models/Table';
import { Parsed, Results, Tables, ValidationState } from '../types';
import DatabaseManager from '../database';
import { DatabaseError, DeleteError, InsertError, SelectError } from '../errors';

type CreateObject = Tables.Punishments.CreateObject;
type RemoveObject = Tables.Punishments.RemoveObject;

export default class Punishments extends Table<Results.DBPunishment, Parsed.Punishment> {
    protected readonly accepted: Array<keyof Parsed.Punishment>;

    protected readonly nullables: Array<keyof Parsed.Punishment>;

    protected readonly mappedKeys: {
        [s in keyof Parsed.Punishment]: keyof Results.DBPunishment;
    };

    public constructor(manager: DatabaseManager) {
        super(manager, 'punishments');

        this.nullables = ['targetKey', 'length'];
        this.accepted = [
            'active',
            'type',
            'lenient',
            'length',
            'target',
            'targetKey',
            'index',
        ];

        this.mappedKeys = {
            id: 'punishment_id',
            active: 'punishment_active',
            index: 'punishment_index',
            type: 'punishment_type',
            lenient: 'punishment_lenient',
            length: 'punishment_length',
            target: 'punishment_target',
            targetKey: 'punishment_target_key',
        };
    }

    public async create(punishment: CreateObject): Promise<boolean>;

    public async create(
        connection: PoolClient | undefined,
        punishment: CreateObject
    ): Promise<boolean>;

    public async create(
        connection: PoolClient | CreateObject | undefined,
        punishment?: CreateObject
    ): Promise<boolean> {
        if (typeof (connection as CreateObject)?.type === 'string') {
            punishment = connection as CreateObject;
            connection = undefined;
        }

        if (typeof punishment === 'undefined') {
            throw new InsertError('No punishment object provided');
        }

        if (['ban', 'kick', 'mute'].indexOf(punishment.type) === -1) {
            throw new InsertError(
                `An invalid punishment type was provided: ${punishment.type}`
            );
        }

        if (
            ['user', 'role'].indexOf(punishment.target) === -1 &&
            typeof punishment.targetKey !== 'string'
        ) {
            throw new InsertError(`${punishment.target} requires a targetKey`);
        }

        const values = [
            1, // active flag
            punishment.index,
            punishment.type,
            punishment.target,
            punishment.targetKey,
            punishment.lenient ? 1 : 0,
            typeof punishment.length === 'number' ? punishment.length : null,
        ] as never[];

        const fields = [
            this.mappedKeys.active,
            this.mappedKeys.index,
            this.mappedKeys.type,
            this.mappedKeys.target,
            this.mappedKeys.targetKey,
            this.mappedKeys.lenient,
            this.mappedKeys.length,
        ];

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

    public async getAllActive(
        connection?: PoolClient
    ): Promise<Array<Parsed.Punishment>> {
        const response = await this.query<Results.DBPunishment>(
            connection,
            `SELECT * FROM ${this.full} WHERE ${this.mappedKeys.active} = 1
                ORDER BY ${this.mappedKeys.index}, ${this.mappedKeys.target}, ${this.mappedKeys.targetKey}, ${this.mappedKeys.lenient};`
        ).catch((err) => new SelectError(err));

        if (response instanceof DatabaseError) throw response;

        return response.rows.map(this.parse);
    }

    public async remove(punishmment: RemoveObject): Promise<boolean>;

    public async remove(
        connection: PoolClient | undefined,
        punishment: RemoveObject
    ): Promise<boolean>;

    public async remove(
        connection: PoolClient | RemoveObject | undefined,
        punishment?: RemoveObject
    ): Promise<boolean> {
        if (typeof (connection as RemoveObject)?.target === 'string') {
            punishment = connection as RemoveObject;
            connection = undefined;
        }

        if (typeof punishment === 'undefined') {
            throw new InsertError('No punishment object provided');
        }

        if (
            ['user', 'role'].indexOf(punishment.target) === -1 &&
            typeof punishment.targetKey !== 'string'
        ) {
            throw new InsertError(`${punishment.target} requires a targetKey`);
        }

        const fields = [
            punishment.index,
            punishment.target,
            punishment.targetKey,
            punishment.lenient ? 1 : 0,
        ];

        const response = await this.query(
            connection as PoolClient | undefined,
            `DELETE FROM ${this.full} WHERE
                ${this.mappedKeys.index} = $1
                AND ${this.mappedKeys.target} = $2
                AND ${this.mappedKeys.targetKey} = $3
                AND ${this.mappedKeys.lenient} = $4;`,
            fields
        ).catch((err) => new DeleteError(err));

        if (response instanceof DatabaseError) throw response;

        return response.rowCount > 0;
    }

    protected async init(connection?: PoolClient): Promise<ValidationState> {
        try {
            await this.query(
                connection,
                `CREATE TABLE ${this.full}
                 (
                     ${this.mappedKeys.id} serial NOT NULL,
                     ${this.mappedKeys.index} INT NOT NULL,
                     ${this.mappedKeys.active} INT DEFAULT 1,
                     ${this.mappedKeys.type} VARCHAR(16) NOT NULL,
                     ${this.mappedKeys.target} VARCHAR(16) NOT NULL,
                     ${this.mappedKeys.targetKey} BIGINT,
                     ${this.mappedKeys.length} INT,
                     ${this.mappedKeys.lenient} INT DEFAULT 1
                 );`
            );
            if (typeof connection === 'undefined') connection = await this.acquire();

            await this.query(
                connection,
                `ALTER TABLE ${this.full} ADD CONSTRAINT ${this.name}_pk
                    PRIMARY KEY (${this.mappedKeys.id}, ${this.mappedKeys.index});`
            );

            await this.query(
                connection,
                `CREATE UNIQUE INDEX ${this.name}_unique_idx ON ${this.full}
                    (${this.mappedKeys.index}, ${this.mappedKeys.target}, ${this.mappedKeys.targetKey}, ${this.mappedKeys.lenient})`
            );

            return ValidationState.VALIDATED;
        } catch (e) {
            this.getLogger().error(e);
            return ValidationState.INVALID;
        }
    }

    protected parse(data: Results.DBPunishment): Parsed.Punishment {
        return {
            id: data.punishment_id,
            active: data.punishment_active === 1,
            index: data.punishment_index,
            type: data.punishment_type,
            lenient: data.punishment_lenient === 1,
            length: data.punishment_length,
            target: data.punishment_target,
            targetKey: data.punishment_target_key as never,
        };
    }
}
