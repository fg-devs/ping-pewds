import { DatabaseError as DBError } from 'pg-protocol/dist/messages';

type RippedDBError = Omit<DBError, 'message' | 'length' | 'name'>;

export default class DatabaseError implements RippedDBError {
    public static DELETE_ERROR = 'Delete Error';

    public static INSERT_ERROR = 'Insert Error';

    public static UPDATE_ERROR = 'Update Error';

    public static SELECT_ERROR = 'Select Error';

    public readonly errorMessage?: string;

    public readonly errorName?: string;

    public message: string;

    public code: string | undefined;

    public column: string | undefined;

    public constraint: string | undefined;

    public dataType: string | undefined;

    public detail: string | undefined;

    public file: string | undefined;

    public hint: string | undefined;

    public internalPosition: string | undefined;

    public internalQuery: string | undefined;

    public readonly length: number | undefined;

    public line: string | undefined;

    public name: string;

    public position: string | undefined;

    public routine: string | undefined;

    public schema: string | undefined;

    public severity: string | undefined;

    public table: string | undefined;

    public where: string | undefined;

    constructor(error?: Error | string, message?: string) {
        if (typeof error === 'string' && typeof message === 'undefined') {
            message = error;
            error = undefined;
        }
        if (error instanceof Error && typeof message === 'undefined') {
            message = error.message;
        }

        // remap the actual error into this error
        if (error instanceof Error) {
            // eslint-disable-next-line
            for (const key in error) {
                // eslint-disable-next-line
                this[key as never] = error[key as never];
            }
            this.errorName = error.name;
            this.errorMessage = error.message;
        }

        this.name = 'Database Error';
        this.message = message || '';
    }
}
