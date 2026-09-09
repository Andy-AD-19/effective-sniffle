import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const SQLITE_PROTOCOL = "file:";

export function configureSqliteDatabaseUrl() {
  const configuredUrl = process.env.DATABASE_URL;
  if (configuredUrl) {
    if (!configuredUrl.startsWith(SQLITE_PROTOCOL)) {
      throw new Error("DATABASE_URL must use a SQLite file: URL. PostgreSQL URLs are no longer supported.");
    }
    ensureSqliteDirectory(configuredUrl);
    return configuredUrl;
  }

  const databasePath = process.env.FMOH_DATABASE_PATH ?? join(applicationDataDirectory(), "fmoh-inventory.db");
  const sqliteUrl = `${SQLITE_PROTOCOL}${databasePath.replace(/\\/g, "/")}`;
  process.env.DATABASE_URL = sqliteUrl;
  ensureSqliteDirectory(sqliteUrl);
  return sqliteUrl;
}

function applicationDataDirectory() {
  const baseDirectory = process.env.APPDATA ?? process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Roaming");
  return join(baseDirectory, "FMOH Inventory");
}

function ensureSqliteDirectory(sqliteUrl: string) {
  const databasePath = sqliteUrl.slice(SQLITE_PROTOCOL.length);
  if (!databasePath || databasePath.startsWith(":")) return;
  mkdirSync(dirname(databasePath), { recursive: true });
}
