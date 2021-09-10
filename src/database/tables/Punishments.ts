import Table from "../models/Table";
import {Parsed, Results, ValidationState} from "../types";
import DatabaseManager from "../database";
import {PoolClient} from "pg";
import {DatabaseError, InsertError, SelectError} from "../errors";

type PunishmentObject = Omit<Parsed.Punishment, 'id'|'active'|'length'> & {
    length?: number;
};

export default class Punishments extends Table<
    Results.DBPunishment,
    Parsed.Punishment
    > {
    protected readonly accepted: Array<keyof Parsed.Punishment>;

    protected readonly nullables: Array<keyof Parsed.Punishment>;

    protected readonly mappedKeys: {
        [s in keyof Parsed.Punishment]: keyof Results.DBPunishment;
    };

    public constructor(manager: DatabaseManager) {
        super(manager, 'punishments');

        this.nullables = ['targetKey', 'length'];
        this.accepted = ['active', 'type', 'lenient', 'length', 'target', 'targetKey', 'index'];

        this.mappedKeys = {
            id: 'punishment_id',
            active: 'punishment_active',
            index: 'punishment_index',
            type: 'punishment_type',
            lenient: 'punishment_lenient',
            length: 'punishment_length',
            target: 'punishment_target',
            targetKey: 'punishment_target_key'
        };
    }

    public async create(punishment: PunishmentObject): Promise<boolean>
    public async create(connection: PoolClient | undefined, punishment: PunishmentObject): Promise<boolean>
    public async create(connection: PoolClient | PunishmentObject | undefined, punishment?: PunishmentObject): Promise<boolean> {
        if (typeof (connection as PunishmentObject)?.type === 'string') {
            punishment = connection as PunishmentObject;
            connection = undefined;
        }

        if (typeof punishment === 'undefined') {
            throw new InsertError('No punishment object provided');
        }

        if (['ban', 'kick', 'mute'].indexOf(punishment.type) === -1) {
            throw new InsertError(`An invalid punishment type was provided: ${punishment.type}`);
        }

        if (['user', 'role'].indexOf(punishment.target) === -1 && typeof punishment.targetKey !== 'string') {
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
        ] as never[]

        const fields = [
            this.mappedKeys.active,
            this.mappedKeys.index,
            this.mappedKeys.type,
            this.mappedKeys.target,
            this.mappedKeys.targetKey,
            this.mappedKeys.lenient,
            this.mappedKeys.length
        ]

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

    public async getAllActive(connection?: PoolClient) {

        const response = await this.query<Results.DBPunishment>(
            connection,
            `SELECT * FROM ${this.full} WHERE ${this.mappedKeys.active} = 1;`
        ).catch((err) => new SelectError(err));

        if (response instanceof DatabaseError) throw response;

        return response.rows.map(this.parse)
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
                     ${this.mappedKeys.type} CHAR(16) NOT NULL,
                     ${this.mappedKeys.target} CHAR(16) NOT NULL,
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

            return ValidationState.VALIDATED;
        } catch (e) {
            this.getLogger().error(e);
            return ValidationState.INVALID;
        }
    }

    protected parse(data?: Results.DBPunishment): Parsed.Punishment | null {
        if (typeof data === 'undefined' || data === null)
            return null;

        return {
            id: data.punishment_id,
            active: data.punishment_active === 1,
            type: data.punishment_type,
            lenient: data.punishment_lenient === 1,
            length: data.punishment_length,
            target: data.punishment_target,
            targetKey: data.punishment_target_key,
        } as Parsed.Punishment
    }
}
