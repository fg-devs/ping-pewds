import Conf from "./conf";

export default class BotConfig extends Conf {

    public readonly token: string;
    public readonly prefix: string;
    public readonly owners: string[];

    constructor() {
        super('bot');
        this.token = 'BotToken';
        this.prefix = '!';
        this.owners = ['id1', 'id2'];
    }
}