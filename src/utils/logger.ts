import winston, { format } from 'winston';
const { label, timestamp, combine, prettyPrint } = format;
type Meta = {
    [s: string]: string | boolean | number | Meta | undefined;
};

/**
 * get a logger instance with {name} and optional {meta} data
 * @param name
 * @param meta
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

export default getLogger;
