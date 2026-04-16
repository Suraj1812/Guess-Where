declare module "pg" {
  export class Pool {
    constructor(config?: { connectionString?: string });
    query<T = unknown>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
    connect(): Promise<{
      query: <T = unknown>(text: string, values?: unknown[]) => Promise<{ rows: T[] }>;
      release: () => void;
    }>;
    end(): Promise<void>;
  }
}
