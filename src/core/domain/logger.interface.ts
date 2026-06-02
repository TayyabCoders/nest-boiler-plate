export abstract class ILogger {
  abstract fatal(context: string, message: string, meta?: Record<string, unknown>): void;
  abstract error(context: string, message: string, trace?: string, meta?: Record<string, unknown>): void;
  abstract warn(context: string, message: string, meta?: Record<string, unknown>): void;
  abstract log(context: string, message: string, meta?: Record<string, unknown>): void;
  abstract info(context: string, message: string, meta?: Record<string, unknown>): void;
  abstract debug(context: string, message: string, meta?: Record<string, unknown>): void;
  abstract trace(context: string, message: string, meta?: Record<string, unknown>): void;
  abstract child(context: string, meta?: Record<string, unknown>): ILogger;
}