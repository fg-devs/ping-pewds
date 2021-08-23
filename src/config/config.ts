import * as yaml from 'js-yaml';
import * as fs from 'fs';
import Conf from './conf';
import validate from './validate';
import BotConfig from './bot';
import DatabaseConfig from './database';

export default class Config extends Conf {
    private static CONFIG_LOCATION = process.env.CONFIG || './config.yml';

    public readonly bot: BotConfig;

    public readonly database: DatabaseConfig;

    constructor() {
        super('config');

        this.bot = new BotConfig();
        this.database = new DatabaseConfig();
    }

    public static getConfig(): Config {
        if (!fs.existsSync(Config.CONFIG_LOCATION))
            throw new Error(`Config file at ${Config.CONFIG_LOCATION} does not exist.`);
        const file = fs.readFileSync(Config.CONFIG_LOCATION, 'utf-8');
        const casted = yaml.load(file) as Config;

        validate<Config>(new Config(), casted);
        validate<BotConfig>(new BotConfig(), casted.bot);
        validate<DatabaseConfig>(new DatabaseConfig(), casted.database);

        return casted;
    }
}
