import * as yaml from 'js-yaml';
import * as fs from "fs";
import Conf from "./conf";
import validate from "./validate";
import BotConfig from "./bot";

export default class Config extends Conf {

    private static CONFIG_LOCATION = process.env.CONFIG || './config.yml'

    public readonly logLevel: string;
    public readonly logs: string;

    public readonly bot: BotConfig;

    constructor() {
        super('config');

        this.logLevel = 'debug';
        this.logs = './logs';

        this.bot = new BotConfig();
    }

    public static getConfig(): Config {
        if (!fs.existsSync(Config.CONFIG_LOCATION))
            throw new Error(`Config file at ${Config.CONFIG_LOCATION} does not exist.`);
        let file = fs.readFileSync(Config.CONFIG_LOCATION, 'utf-8')
        const casted = yaml.load(file) as Config;

        validate<Config>(new Config(), casted);
        validate<BotConfig>(new BotConfig(), casted.bot);

        return casted;
    }
}