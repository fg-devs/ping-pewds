import Conf from "./conf";

export default class BotConfig extends Conf {

    public readonly token: string;
    public readonly prefix: string;
    public readonly owners: string[];
    public readonly block: string[];
    public readonly blockTimeout: number;
    public readonly excludedChannels: string[];

    constructor() {
        super('bot');
        this.token = 'BotToken';
        this.prefix = '!';
        this.owners = ['id1', 'id2'];
        this.block = []
        this.excludedChannels = [];
        this.blockTimeout = 10;
    }
}