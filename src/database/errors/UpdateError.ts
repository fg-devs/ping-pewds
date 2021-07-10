import { DatabaseError as DBError } from 'pg';
import DatabaseError from './DatabaseError';

export default class UpdateError extends DatabaseError {
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
        super(DatabaseError.UPDATE_ERROR, message);
        this.name = DatabaseError.UPDATE_ERROR;
        this.error = error as DBError;
    }
}
