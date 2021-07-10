import { DatabaseError as DBError } from 'pg';
import DatabaseError from './DatabaseError';

export default class DeleteError extends DatabaseError {
    readonly error?: DBError;

    constructor(message: string);

    constructor(error: DBError);

    constructor(error: DBError, message: string);

    constructor(error?: DBError | string, message?: string) {
        if (!(error instanceof DBError) && typeof message === 'undefined') {
            message = error;
        }
        if (error instanceof DBError && typeof message === 'undefined') {
            message = error.message;
        }
        super(DatabaseError.DELETE_ERROR, message);
        this.name = DatabaseError.DELETE_ERROR;
        this.error = error as DBError;
    }
}
