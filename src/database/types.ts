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

    export type DBPunishment = {
        punishment_id: number;
        punishment_user_id: number;
        punishment_ends_at: number;
        punishment_expires_at: number | null;
        punishment_created_at: number;
    }
}

export namespace Parsed {
    export type BlockedUser = {
        id: number;
        lastMessage: number;
    };
    export type Punishment = {
        id: number;
        userId: number;
        endsAt: Date | null;
        expiresAt: Date | null;
        createdAt: Date;
    };
}

export type ValueObject = Array<string | number | boolean>;

export type DBTable = Results.DBBlockedUser
    | Results.DBPunishment
// | Results.NextTable

export type DBParsed = Parsed.BlockedUser
    | Parsed.Punishment
// | Parsed.NextTable
