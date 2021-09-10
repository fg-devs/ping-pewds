import PunishmentHistory from "./tables/PunishmentHistory";

export enum ValidationState {
    NOT_PROCESSED,
    INVALID,
    NEEDS_MIGRATION,
    VALIDATED,
    HAS_ADDITIONAL_INIT,
}

export namespace Results {
    export type DBBlockedUser = {
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
}

export namespace Parsed {
    export type BlockedUser = {
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
}

export type ValueObject = Array<string | number | boolean>;

export type DBTable = Results.DBBlockedUser | Results.DBPunishmentHistory;
// | Results.NextTable

export type DBParsed = Parsed.BlockedUser | Parsed.PunishmentHistory;
// | Parsed.NextTable
