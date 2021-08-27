export default class DatabaseError extends Error {
    static DELETE_ERROR = 'Delete Error';

    static INSERT_ERROR = 'Insert Error';

    static UPDATE_ERROR = 'Update Error';

    static SELECT_ERROR = 'Select Error';

    readonly errorMessage?: string;

    constructor(type: string, message?: string);

    constructor(error: Error, type: string, message?: string);

    constructor(error: Error | string, type?: string, message?: string) {
        if (!(error instanceof Error) && typeof message === 'undefined') {
            message = error;
        }
        if (error instanceof Error && typeof message === 'undefined') {
            message = error.message;
        }
        super(message);

        // remap the actual error into this error
        if (error instanceof Error) {
            // eslint-disable-next-line
            for (const key in error) {
                // eslint-disable-next-line
                this[key as never] = error[key as never];
            }
            this.errorMessage = error.message;
        }
        if (type) this.name = type;
    }
}
