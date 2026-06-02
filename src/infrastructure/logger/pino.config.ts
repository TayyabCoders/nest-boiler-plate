import pino from 'pino';
import { ConfigService } from '@nestjs/config';

export const createPinoConfig = (configService: ConfigService) => {
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const isDevelopment = nodeEnv === 'development';
  const logFormat = configService.get<string>('LOG_FORMAT') || (isDevelopment ? 'pretty' : 'json');
  const logLevel = configService.get<string>('LOG_LEVEL') || 'info';
  const redactEnabled = configService.get<boolean>('LOG_REDACT_ENABLED') !== false;

  return {
    name: 'nest-boilerplate',
    level: logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
    redact: redactEnabled
      ? {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            '*.password',
            '*.token',
            '*.secret',
            '*.creditCard',
            '*.ssn',
            '*.apiKey',
            '*.accessToken',
            '*.refreshToken',
          ],
          censor: '[REDACTED]',
          remove: true,
        }
      : undefined,
    transport: logFormat === 'pretty'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined,
  };
};
