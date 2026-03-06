import pino, { Logger, TransportSingleOptions } from 'pino';
import { env } from '../lib/env';

const REDACT_PATHS = [
  'authorization',
  '*.authorization',
  'headers.authorization',
  'req.headers.authorization',
  'request.headers.authorization',
  'password',
  '*.password',
  'pwd',
  '*.pwd',
  'token',
  '*.token',
  'accessToken',
  '*.accessToken',
  'refreshToken',
  '*.refreshToken',
  'apiKey',
  '*.apiKey',
  'GOOGLE_API_KEY',
  'SUPABASE_API_KEY',
];

function isTerminalStdout(): boolean {
  return typeof process !== 'undefined' && Boolean(process.stdout?.isTTY);
}

function getDevTransport(): TransportSingleOptions | undefined {
  if (env.NODE_ENV !== 'development' || !isTerminalStdout()) {
    return undefined;
  }

  try {
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'hostname',
      },
    };
  } catch {
    return undefined;
  }
}

export function createLogger(name: string): Logger {
  return pino({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    name,
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      err: pino.stdSerializers.err,
    },
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    transport: getDevTransport(),
  });
}
