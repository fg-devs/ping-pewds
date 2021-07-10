
export enum ValidationState {
    NOT_PROCESSED,
    INVALID,
    NEEDS_MIGRATION,
    VALIDATED,
    HAS_ADDITIONAL_INIT
}

export namespace Results {
    export type DBBlockedUser = {
        user_id: number;
        user_last_message: number;
    }
}

export namespace Parsed {
    export type BlockedUser = {
        id: number;
        lastMessage: number;
    }
}

export type DBTable = Results.DBBlockedUser
    // | Results.NextTable

export type DBParsed = Parsed.BlockedUser
    // | Parsed.NextTable

export type BaseResult = {}

export type Result<T> = {}