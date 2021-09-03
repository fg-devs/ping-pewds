import winston, { format } from 'winston';
// import { Logger, LoggerLevel } from '@sapphire/plugin-logger';
// import {LogLevel} from "@sapphire/framework";
import { Logger, LogLevel } from '@sapphire/framework';

const { label, timestamp, combine, prettyPrint } = format;
type Meta = {
    [s: string]: string | boolean | number | Meta | undefined;
};

export class BotLogger extends Logger {
    private static instance: BotLogger | null = null;

    private readonly title?: string;

    public constructor(level?: LogLevel, title?: string) {
        super(level || LogLevel.Debug)
        // super({
        //     level: level || LogLevel.Trace,
        // });
        this.title = title;
    }

    public write(level: LogLevel, ...values: unknown[]): void {
        if (this.title) {
            values.unshift(this.title);
        }
        super.write(level, ...values);
    }

    public getTitledInstance(title?: string): BotLogger {
        return new BotLogger(this.level, title);
    }

    public static getInstance(level?: LogLevel): BotLogger {
        if (BotLogger.instance && level) {
            BotLogger.instance.level = level;
        }
        return BotLogger.instance || new BotLogger(level);
    }
}
