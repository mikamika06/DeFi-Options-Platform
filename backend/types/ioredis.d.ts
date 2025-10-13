declare module "ioredis" {
  export interface RedisOptions {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  }
}
