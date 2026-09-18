import type Database from "better-sqlite3";

interface D1Result {
  success: boolean;
  meta?: {
    changes?: number;
    last_row_id?: number;
    duration?: number;
  };
}

interface D1PreparedStatement {
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<D1Result>;
}

interface D1PreparedStatementBuilder {
  bind(...values: unknown[]): D1PreparedStatement;
}

/**
 * better-sqlite3-backed D1: the workers only use prepare(sql).bind(...).first()/
 * all()/run(), with `?` placeholders and the D1 result shapes
 * (first → row|null, all → {results}, run → {success, meta.changes}).
 */
export class D1Sqlite {
  constructor(private readonly db: Database.Database) {}

  prepare(sql: string): D1PreparedStatementBuilder & D1PreparedStatement {
    const stmt = this.db.prepare(sql);
    const sanitize = (values: unknown[]) => values.map((v) => (v === undefined ? null : v));
    const make = (values: unknown[]): D1PreparedStatement => {
      const params = sanitize(values);
      return {
        first: async <T>() => (stmt.get(...params) as T) ?? null,
        all: async <T>() => ({ results: stmt.all(...params) as T[] }),
        run: async () => {
          const info = stmt.run(...params);
          return {
            success: true,
            meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) },
          };
        },
      };
    };
    // Workers call both prepare(sql).first() (no bind, e.g. admin stats
    // aggregates) and prepare(sql).bind(...).first().
    return { ...make([]), bind: (...values: unknown[]) => make(values) };
  }

  /** In-memory pragma needed by the gateway bootstrap (WAL, busy timeout). */
  exec(sql: string): void {
    this.db.exec(sql);
  }
}
