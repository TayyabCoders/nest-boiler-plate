export abstract class ILogger {
  abstract debug(context: string, message: string, meta?: Record<string, unknown>): void;
  abstract log(context: string, message: string, meta?: Record<string, unknown>): void;
  abstract error(context: string, message: string, trace?: string, meta?: Record<string, unknown>): void;
  abstract warn(context: string, message: string, meta?: Record<string, unknown>): void;
}