import winston, { Logger as WinstonLogger, format } from 'winston';
import * as path from 'path';
import {CONFIG} from "../globals";

const { label, timestamp, combine, prettyPrint, json } = format;


const _timestamp: (str?: string) => any =
    (process.env.NODE_ENV || '').trim() === 'production'
        ? () => timestamp()
        : (str?: string) => label({ label: str || 'Development' });

export class Logger {

    private static LOGGERS: { [s: string]: Logger } = {};

    private readonly name: string;
    private readonly level: string;

    private readonly logger: WinstonLogger;

    constructor(name: string, level?: string) {
        this.name = name;
        this.level = level || 'debug'
        this.logger = winston.createLogger({
            level: this.level,
            transports: [
                new winston.transports.File({
                    filename: path.join(CONFIG.logs, 'logs.log'),
                    format: combine(
                        timestamp(),
                        label({ label: this.name }),
                        prettyPrint({ depth: 4 }),
                    )
                }),
            ]
        })

        if (this.level === 'debug') {
            this.logger.add(new winston.transports.Console({
                handleExceptions: true,
                format: combine(
                    timestamp(),
                    label({ label: this.name }),
                    prettyPrint({ colorize: true, depth: 5 })
                )
            }));
        }

        this.logger.exceptions.handle(
            new winston.transports.File({ filename: path.join(CONFIG.logs, 'exceptions.log') })
        )
    }

    public error(message: any) {
        this.logger.error(message);
    }

    public debug(message: any) {
        this.logger.debug(message)
    }

    public warn(message: any) {
        this.logger.warn(message)
    }

    public info(message: any) {
        this.logger.info(message);
    }

    public log(message: any) {
        this.debug(message);
    }

    // public error(message: any) {
    //     this.logger.log({
    //         level: 'error',
    //         message
    //     })
    // }
    //
    // public debug(message: any) {
    //     this.logger.log({
    //         level: 'debug',
    //         message
    //     })
    // }
    //
    // public warn(message: any) {
    //     this.logger.log({
    //         level: 'warn',
    //         message
    //     })
    // }
    //
    // public log(message: any) {
    //     this.debug(message);
    // }


    public static getLogger(name: string, level?: string) {
        if (Logger.LOGGERS[name]) {
            return Logger.LOGGERS[name];
        }

        Logger.LOGGERS[name] = new Logger(name, level);
        return Logger.LOGGERS[name];
    }

}