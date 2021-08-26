import winston, { format } from 'winston';
import { Logger, LogLevel } from '@sapphire/framework';

const { label, timestamp, combine, prettyPrint } = format;
type Meta = {
    [s: string]: string | boolean | number | Meta | undefined;
};

export class BotLogger extends Logger {
    private static instance: BotLogger | null = null;

    private readonly title?: string;

    public constructor(level?: LogLevel, title?: string) {
        super(level || LogLevel.Trace);
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

/**
 * get a logger instance with {name} and optional {meta} data
 * @param name
 * @param meta
 * @deprecated keeping for code example
 */
function getLogger(name: string, meta?: Meta): winston.Logger {
    if (winston.loggers.has(name)) {
        return winston.loggers.get(name);
    }
    return winston.loggers.add(name, {
        transports: [
            new winston.transports.Console({
                handleExceptions: true,
                debugStdout: true,
                format: combine(
                    timestamp(),
                    label({ label: name }),
                    prettyPrint({ colorize: true, depth: 5 })
                ),
            }),
        ],
        defaultMeta: meta,
    });
}
