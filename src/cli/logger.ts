import winston from 'winston';

export enum ErrorCode {
  ApiwitchConfigNotFound = 1000,
  RequestTypeNotDefined,
  ResponseTypeNotDefined,
  RequestRawSchemaFailed,
  ResponseRawSchemaFailed,
  ConfigNotFound,
  ConfigIncludeDirMissing,
  UnknownError,
}

const { combine, timestamp, label, prettyPrint, colorize, simple } = winston.format;

const _logger = winston.createLogger({
  format: combine(prettyPrint(), colorize(), simple(), timestamp()),
  transports: [new winston.transports.Console({ level: process.env.LOG_LEVEL || 'info' })],
});

interface LoggerInterface {
  debug: (msg: string | object) => void;
  warn: (msg: string) => void;
  error: (code: ErrorCode, msg: string) => void;
  info: (msg: string | object) => void;
}

export const logger = {
  debug: (msg: string | object) => {
    if (typeof msg === 'string') {
      _logger.debug(msg);
    } else {
      _logger.debug(JSON.stringify(msg));
    }
    _logger.debug(msg);
  },
  warn: (msg: string) => {
    if (typeof msg === 'string') {
      _logger.warn(msg);
    } else {
      _logger.warn(JSON.stringify(msg));
    }
  },
  error: (code: ErrorCode, msg: string) => {
    _logger.error(`Error[${code}] --> ${msg}`);
  },
  info: (msg: string | object) => {
    if (typeof msg === 'string') {
      _logger.info(msg);
    } else {
      _logger.info(JSON.stringify(msg));
    }
  },
} as LoggerInterface;
