import winston, { format } from 'winston';
import * as path from 'path';
import {CONFIG} from "../globals";

const { label, timestamp, combine, prettyPrint, json } = format;
type Meta = {
    [s: string]: string | boolean | number | Meta | undefined;
}

function getLogger(name: string, meta?: Meta) {
    if (winston.loggers.has(name)) {
        return winston.loggers.get(name);
    }

    const fileTransport = new winston.transports.File({
            filename: path.join(CONFIG.logs, 'logs.log'),
            format: combine(
                timestamp(),
                label({ label: name }),
                prettyPrint({ depth: 4 }),
            )
        });

    const transports: winston.transport[] = [fileTransport];
    if (CONFIG.logLevel.toUpperCase() === 'DEBUG') {
        const consoleTransport = new winston.transports.Console({
            handleExceptions: true,
            debugStdout: true,
            format: combine(
                timestamp(),
                label({ label: name }),
                prettyPrint({ colorize: true, depth: 5 })
            )
        })
        transports.push(consoleTransport);
    }
    return winston.loggers.add(name, {
        transports,
        defaultMeta: meta,
    });
}

export default getLogger;