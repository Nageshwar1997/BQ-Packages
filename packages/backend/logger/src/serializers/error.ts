import { stdSerializers } from 'pino';

export function createErrorSerializer() {
  return (error: unknown) => {
    return stdSerializers.err(error instanceof Error ? error : new Error(String(error)));
  };
}
