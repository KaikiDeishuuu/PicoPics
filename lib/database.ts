import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "agents.db");

// 确保数据目录存在
import fs from "fs";
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: Database.Database | null = null;

export function getDatabase() {
  if (!db) {
    db = new Database(dbPath);

    // 创建agent自定义名称表
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_custom_names (
        uuid TEXT PRIMARY KEY,
        custom_name TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

// 保存agent自定义名称
export function saveAgentCustomName(uuid: string, name: string) {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO agent_custom_names (uuid, custom_name, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `);

  try {
    stmt.run(uuid, name);
    return { success: true };
  } catch (error) {
    console.error("Error saving agent custom name:", error);
    return { success: false, error: error.message };
  }
}

// 获取agent自定义名称
export function getAgentCustomName(uuid: string): string | null {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT custom_name FROM agent_custom_names WHERE uuid = ?
  `);

  try {
    const result = stmt.get(uuid) as { custom_name: string } | undefined;
    return result?.custom_name || null;
  } catch (error) {
    console.error("Error getting agent custom name:", error);
    return null;
  }
}

// 获取所有agent自定义名称
export function getAllAgentCustomNames(): Record<string, string> {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT uuid, custom_name FROM agent_custom_names
  `);

  try {
    const results = stmt.all() as { uuid: string; custom_name: string }[];
    return results.reduce((acc, row) => {
      acc[row.uuid] = row.custom_name;
      return acc;
    }, {} as Record<string, string>);
  } catch (error) {
    console.error("Error getting all agent custom names:", error);
    return {};
  }
}
