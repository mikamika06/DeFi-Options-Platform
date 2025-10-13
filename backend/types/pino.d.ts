declare module "pino" {
  export interface Logger {
    info(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    debug(...args: any[]): void;
    child(options?: any): Logger;
  }

  export interface LoggerOptions {
    name?: string;
    level?: string;
  }

  export default function pino(options?: LoggerOptions): Logger;
}
