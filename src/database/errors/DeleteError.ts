import { DatabaseError as DBError } from 'pg';
import DatabaseError from './DatabaseError';

export default class DeleteError extends DatabaseError {

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

        if (error instanceof Error)
            super(error, DatabaseError.DELETE_ERROR, message);
        else
            super(DatabaseError.DELETE_ERROR, message);

        this.name = DatabaseError.DELETE_ERROR;
    }
}
