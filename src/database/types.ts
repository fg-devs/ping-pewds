import PunishmentHistory from "./tables/PunishmentHistory";

export enum ValidationState {
    NOT_PROCESSED,
    INVALID,
    NEEDS_MIGRATION,
    VALIDATED,
    HAS_ADDITIONAL_INIT,
}

export type Nullable<T> = null | T;

export type PunishmentType = 'ban' | 'mute' | 'kick';

export type TargetType = 'role' | 'user';

type StandardPunishment = {
    target: 'standard',
    targetKey: null;
}

type TargetedPunishment = {
    target: 'role' | 'user';
    targetKey: string;
}

type DefaultPunishmentProps = {
    id: number;
    index: number;
    active: boolean;
    lenient: boolean;
    length: number | null;
    type: PunishmentType
    target: TargetType;
    targetKey: Nullable<string>;
}

export namespace Results {
    export type DBMonitoredUser = {
        user_id: number;
        user_last_message: number;
    };

    export type DBPunishmentHistory = {
        history_id: number;
        history_user_id: string;
        history_active: number;
        history_ends_at: number;
        history_expires_at: number | null;
        history_created_at: number;
    };

    export type DBPunishmentHistoryWithCount = DBPunishmentHistory & {
        count: string;
    };

    export type DBPunishment = {
        punishment_id: number;
        punishment_index: number;
        punishment_active: number;
        punishment_lenient: number;
        punishment_type: PunishmentType;
        punishment_target: TargetType;
        punishment_target_key: Nullable<string>;
        punishment_length: Nullable<number>;
    }
}

export namespace Parsed {
    export type MonitoredUser = {
        id: number;
        lastMessage: number;
    };

    export type PunishmentHistory = {
        id: number;
        userId: string;
        active: boolean;
        endsAt: Date | null;
        expiresAt: Date | null;
        createdAt: Date;
    };

    export type PunishmentHistoryWithCount = PunishmentHistory & {
        count: number;
    };

    export type Punishment = DefaultPunishmentProps & (StandardPunishment | TargetedPunishment)
}

export type ValueObject = Array<string | number | boolean>;

export type DBTable = Results.DBMonitoredUser | Results.DBPunishmentHistory | Results.DBPunishment;
// | Results.NextTable

export type DBParsed = Parsed.MonitoredUser | Parsed.PunishmentHistory | Parsed.Punishment;
// | Parsed.NextTable

export namespace Tables {
    export namespace Punishments {
        export type CreateObject = Omit<Parsed.Punishment, 'id'|'active'|'length'> & {
            length?: number;
        };

        export type RemoveObject = Omit<Parsed.Punishment, 'id'|'active'|'length'|'type'>
    }
}
