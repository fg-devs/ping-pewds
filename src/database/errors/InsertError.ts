import { DatabaseError as DBError } from 'pg';
import DatabaseError from './DatabaseError';

export default class InsertError extends DatabaseError {
    readonly error?: DBError;

    constructor(message: string);

    constructor(error: DBError);

    constructor(error: DBError, message: string);

    constructor(error?: DBError | string, message?: string) {
        if (!(error instanceof Error) && typeof message === 'undefined') {
            message = error;
        }
        if (error instanceof Error && typeof message === 'undefined') {
            message = error.message;
        }
        super(DatabaseError.INSERT_ERROR, message);
        this.name = DatabaseError.INSERT_ERROR;
        this.error = error as DBError;
    }
}
