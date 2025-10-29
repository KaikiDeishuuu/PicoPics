// AWS兼容的数据库配置
// 支持SQLite（本地开发）、PostgreSQL（AWS部署）和D1（Cloudflare）

const isProduction = process.env.NODE_ENV === "production";
const usePostgres = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const useD1 =
  process.env.CF_D1_DATABASE_ID || process.env.CLOUDFLARE_D1_DATABASE_ID;

if (useD1) {
  // 使用D1（Cloudflare）
  console.log("Using Cloudflare D1 database");
} else if (usePostgres) {
  // 使用PostgreSQL（AWS RDS）
  console.log("Using PostgreSQL database");
} else {
  // 使用SQLite（本地开发）
  console.log("Using SQLite database");
}

// 数据库接口
export interface DatabaseInterface {
  saveAgentCustomName(
    uuid: string,
    name: string,
    ip?: string,
    location?: string
  ): Promise<{ success: boolean; error?: string }>;
  getAgentCustomName(uuid: string): Promise<string | null>;
  getAllAgentCustomNames(): Promise<Record<string, string>>;
  getAgentInfo(
    uuid: string
  ): Promise<{ name: string; ip: string; location: string } | null>;
  getAllAgentInfo(): Promise<
    Record<string, { name: string; ip: string; location: string }>
  >;
}

// 创建数据库实例的函数
function createDatabase(): DatabaseInterface {
  if (useD1) {
    // D1实现（Cloudflare）
    const databaseId =
      process.env.CF_D1_DATABASE_ID || process.env.CLOUDFLARE_D1_DATABASE_ID;
    const accountId =
      process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken =
      process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

    const executeD1Query = async (sql: string, params: any[] = []) => {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sql,
            params,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`D1 query failed: ${response.statusText}`);
      }

      return await response.json();
    };

    // 初始化表
    executeD1Query(`
      CREATE TABLE IF NOT EXISTS agent_custom_names (
        uuid TEXT PRIMARY KEY,
        custom_name TEXT NOT NULL,
        ip TEXT,
        location TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(console.error);

    return {
      async saveAgentCustomName(
        uuid: string,
        name: string,
        ip?: string,
        location?: string
      ) {
        try {
          await executeD1Query(
            `
            INSERT OR REPLACE INTO agent_custom_names (uuid, custom_name, ip, location, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          `,
            [uuid, name, ip || "", location || ""]
          );
          return { success: true };
        } catch (error: any) {
          console.error("Error saving agent custom name to D1:", error);
          return { success: false, error: error.message };
        }
      },

      async getAgentCustomName(uuid: string) {
        try {
          const result = await executeD1Query(
            "SELECT custom_name FROM agent_custom_names WHERE uuid = ?",
            [uuid]
          );
          return result.results.length > 0
            ? result.results[0].custom_name
            : null;
        } catch (error) {
          console.error("Error getting agent custom name from D1:", error);
          return null;
        }
      },

      async getAllAgentCustomNames() {
        try {
          const result = await executeD1Query(
            "SELECT uuid, custom_name FROM agent_custom_names"
          );
          return result.results.reduce(
            (acc: Record<string, string>, row: any) => {
              acc[row.uuid] = row.custom_name;
              return acc;
            },
            {}
          );
        } catch (error) {
          console.error("Error getting all agent custom names from D1:", error);
          return {};
        }
      },

      async getAgentInfo(uuid: string) {
        try {
          const result = await executeD1Query(
            "SELECT custom_name, ip, location FROM agent_custom_names WHERE uuid = ?",
            [uuid]
          );
          if (result.results.length > 0) {
            const row = result.results[0];
            return {
              name: row.custom_name,
              ip: row.ip || "",
              location: row.location || "",
            };
          }
          return null;
        } catch (error) {
          console.error("Error getting agent info from D1:", error);
          return null;
        }
      },

      async getAllAgentInfo() {
        try {
          const result = await executeD1Query(
            "SELECT uuid, custom_name, ip, location FROM agent_custom_names"
          );
          return result.results.reduce(
            (
              acc: Record<
                string,
                { name: string; ip: string; location: string }
              >,
              row: any
            ) => {
              acc[row.uuid] = {
                name: row.custom_name,
                ip: row.ip || "",
                location: row.location || "",
              };
              return acc;
            },
            {}
          );
        } catch (error) {
          console.error("Error getting all agent info from D1:", error);
          return {};
        }
      },
    };
  } else if (!usePostgres) {
    // SQLite实现（本地开发）
    const Database = require("better-sqlite3");
    const path = require("path");
    const fs = require("fs");

    const dbPath = path.join(process.cwd(), "data", "agents.db");
    const dataDir = path.dirname(dbPath);

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    let db: any = null;

    const getDatabase = () => {
      if (!db) {
        db = new Database(dbPath);
        db.exec(`
          CREATE TABLE IF NOT EXISTS agent_custom_names (
            uuid TEXT PRIMARY KEY,
            custom_name TEXT NOT NULL,
            ip TEXT,
            location TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }
      return db;
    };

    return {
      async saveAgentCustomName(
        uuid: string,
        name: string,
        ip?: string,
        location?: string
      ) {
        try {
          const database = getDatabase();
          const stmt = database.prepare(`
            INSERT OR REPLACE INTO agent_custom_names (uuid, custom_name, ip, location, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          `);
          stmt.run(uuid, name, ip || "", location || "");
          return { success: true };
        } catch (error: any) {
          console.error("Error saving agent custom name:", error);
          return { success: false, error: error.message };
        }
      },

      async getAgentCustomName(uuid: string) {
        try {
          const database = getDatabase();
          const stmt = database.prepare(`
            SELECT custom_name FROM agent_custom_names WHERE uuid = ?
          `);
          const result = stmt.get(uuid) as { custom_name: string } | undefined;
          return result?.custom_name || null;
        } catch (error) {
          console.error("Error getting agent custom name:", error);
          return null;
        }
      },

      async getAllAgentCustomNames() {
        try {
          const database = getDatabase();
          const stmt = database.prepare(`
            SELECT uuid, custom_name FROM agent_custom_names
          `);
          const results = stmt.all() as { uuid: string; custom_name: string }[];
          return results.reduce((acc, row) => {
            acc[row.uuid] = row.custom_name;
            return acc;
          }, {} as Record<string, string>);
        } catch (error) {
          console.error("Error getting all agent custom names:", error);
          return {};
        }
      },

      async getAgentInfo(uuid: string) {
        try {
          const database = getDatabase();
          const stmt = database.prepare(`
            SELECT custom_name, ip, location FROM agent_custom_names WHERE uuid = ?
          `);
          const result = stmt.get(uuid) as
            | { custom_name: string; ip: string; location: string }
            | undefined;
          if (result) {
            return {
              name: result.custom_name,
              ip: result.ip || "",
              location: result.location || "",
            };
          }
          return null;
        } catch (error) {
          console.error("Error getting agent info:", error);
          return null;
        }
      },

      async getAllAgentInfo() {
        try {
          const database = getDatabase();
          const stmt = database.prepare(`
            SELECT uuid, custom_name, ip, location FROM agent_custom_names
          `);
          const results = stmt.all() as {
            uuid: string;
            custom_name: string;
            ip: string;
            location: string;
          }[];
          return results.reduce((acc, row) => {
            acc[row.uuid] = {
              name: row.custom_name,
              ip: row.ip || "",
              location: row.location || "",
            };
            return acc;
          }, {} as Record<string, { name: string; ip: string; location: string }>);
        } catch (error) {
          console.error("Error getting all agent info:", error);
          return {};
        }
      },
    };
  } else {
    // PostgreSQL实现（AWS RDS）
    const { Pool } = require("pg");

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    });

    // 初始化表
    pool
      .query(
        `
      CREATE TABLE IF NOT EXISTS agent_custom_names (
        uuid VARCHAR(36) PRIMARY KEY,
        custom_name VARCHAR(255) NOT NULL,
        ip VARCHAR(45),
        location VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
      )
      .catch(console.error);

    return {
      async saveAgentCustomName(
        uuid: string,
        name: string,
        ip?: string,
        location?: string
      ) {
        try {
          await pool.query(
            `
            INSERT INTO agent_custom_names (uuid, custom_name, ip, location, updated_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (uuid) DO UPDATE SET
              custom_name = EXCLUDED.custom_name,
              ip = EXCLUDED.ip,
              location = EXCLUDED.location,
              updated_at = CURRENT_TIMESTAMP
          `,
            [uuid, name, ip || "", location || ""]
          );
          return { success: true };
        } catch (error: any) {
          console.error("Error saving agent custom name:", error);
          return { success: false, error: error.message };
        }
      },

      async getAgentCustomName(uuid: string) {
        try {
          const result = await pool.query(
            "SELECT custom_name FROM agent_custom_names WHERE uuid = $1",
            [uuid]
          );
          return result.rows[0]?.custom_name || null;
        } catch (error) {
          console.error("Error getting agent custom name:", error);
          return null;
        }
      },

      async getAllAgentCustomNames() {
        try {
          const result = await pool.query(
            "SELECT uuid, custom_name FROM agent_custom_names"
          );
          return result.rows.reduce((acc, row) => {
            acc[row.uuid] = row.custom_name;
            return acc;
          }, {} as Record<string, string>);
        } catch (error) {
          console.error("Error getting all agent custom names:", error);
          return {};
        }
      },

      async getAgentInfo(uuid: string) {
        try {
          const result = await pool.query(
            "SELECT custom_name, ip, location FROM agent_custom_names WHERE uuid = $1",
            [uuid]
          );
          if (result.rows.length > 0) {
            const row = result.rows[0];
            return {
              name: row.custom_name,
              ip: row.ip || "",
              location: row.location || "",
            };
          }
          return null;
        } catch (error) {
          console.error("Error getting agent info:", error);
          return null;
        }
      },

      async getAllAgentInfo() {
        try {
          const result = await pool.query(
            "SELECT uuid, custom_name, ip, location FROM agent_custom_names"
          );
          return result.rows.reduce((acc, row) => {
            acc[row.uuid] = {
              name: row.custom_name,
              ip: row.ip || "",
              location: row.location || "",
            };
            return acc;
          }, {} as Record<string, { name: string; ip: string; location: string }>);
        } catch (error) {
          console.error("Error getting all agent info:", error);
          return {};
        }
      },
    };
  }
}

// 导出数据库实例
export const database = createDatabase();
