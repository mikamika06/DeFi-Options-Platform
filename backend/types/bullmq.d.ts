declare module "bullmq" {
  export interface QueueOptions {
    connection?: any;
  }

  export interface WorkerOptions {
    connection?: any;
  }

  export interface QueueEventOptions {
    connection?: any;
  }

  export class Job<T = any> {
    id?: string;
    data: T;
  }

  export class Queue<T = any> {
    constructor(name: string, opts?: QueueOptions);
    add(name: string, data: T, opts?: any): Promise<{ id?: string }>;
  }

  export class QueueScheduler {
    constructor(name: string, opts?: QueueOptions);
    waitUntilReady(): Promise<void>;
  }

  export class QueueEvents {
    constructor(name: string, opts?: QueueEventOptions);
    waitUntilReady(): Promise<void>;
  }

  export class Worker<T = any> {
    constructor(name: string, processor: (job: Job<T>) => Promise<any>, opts?: WorkerOptions);
    on(event: "completed", handler: (job: Job<T>) => void): void;
    on(event: "failed", handler: (job: Job<T> | undefined, err: Error) => void): void;
  }
}
