declare module 'bun:sqlite' {
  export type DatabaseOptions = {
    readonly?: boolean;
    create?: boolean;
    readwrite?: boolean;
    safeIntegers?: boolean;
    strict?: boolean;
  };

  export type Statement<ReturnType, ParamsType extends unknown[]> = {
    get(...params: ParamsType): ReturnType | null;
    all(...params: ParamsType): ReturnType[];
    run(...params: ParamsType): unknown;
  };

  export class Database {
    constructor(filename: string, options?: number | DatabaseOptions);
    exec(sql: string): void;
    query<ReturnType, ParamsType extends unknown[]>(sql: string): Statement<ReturnType, ParamsType>;
    close(throwOnError?: boolean): void;
  }
}
