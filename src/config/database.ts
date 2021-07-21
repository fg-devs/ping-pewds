import Conf from './conf';

export default class DatabaseConfig extends Conf {
    public readonly host: string;
    public readonly port: number;
    public readonly user: string;
    public readonly pass: string;
    public readonly database: string;
    public readonly schema: string;
    public readonly connections: number;

    constructor() {
        super('database');

        this.host = 'localhost';
        this.port = 5432;
        this.user = 'username';
        this.pass = 'password';
        this.database = 'floorgang';
        this.schema = 'ping_pewds';
        this.connections = 10;
    }
}
