import Conf from './conf';

class BotConfig extends Conf {
    public readonly token: string;

    public readonly prefix: string;

    public readonly guild: string;

    public readonly owners: string[];

    public readonly blockTimeout: number;

    public readonly excludedChannels: string[];

    public readonly notifyTimeout: number;

    public readonly notifyRoles: string[];

    public readonly moderatorRoles: string[];

    public readonly notifyChannels: string[];

    public readonly lenientRoles: string[];

    public readonly muteRole: string;

    public readonly dryrun: boolean;

    constructor() {
        super('bot');
        this.token = 'BotToken';
        this.prefix = '!';
        this.guild = '';
        this.owners = ['id1', 'id2'];
        this.excludedChannels = [];
        this.blockTimeout = 10;
        this.notifyTimeout = 10;
        this.notifyRoles = [];
        this.notifyChannels = [];
        this.lenientRoles = [];
        this.moderatorRoles = [];
        this.muteRole = '';
        this.dryrun = false;
    }
}

export default BotConfig;
