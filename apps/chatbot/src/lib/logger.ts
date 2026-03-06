import { createLogger } from '@common';
import type { Logger } from 'pino';

let logger: Logger;

export function getLogger(): Logger {
  if (!logger) {
    logger = createLogger('chatbot-app');
  }

  return logger;
}
