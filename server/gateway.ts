/**
 * PicoPics VPS gateway: mounts the three Cloudflare Worker Hono apps
 * (uploader / history / cdn) unchanged on one Node process, backed by a
 * Cloudflare compatibility layer (R2→disk, D1→SQLite, Durable Objects→
 * in-process instances, caches.default→memory).
 *
 * Single-origin routing (no CORS):
 *   POST /auth/callback, /upload, /api/*  → uploader app
 *   GET  /api/history                     → history app
 *   GET  /images/*                        → cdn app
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import Database from "better-sqlite3";
import cdnApp from "../workers/cdn";
import historyApp from "../workers/history";
import uploaderApp, { IPBlacklist, UploadQuota } from "../workers/uploader";
import { installCachesShim } from "./cf-compat/caches";
import { D1Sqlite } from "./cf-compat/d1";
import { createNamespace } from "./cf-compat/durable-objects";
import { withCfConnectingIp } from "./cf-compat/headers";
import { R2BucketDisk } from "./cf-compat/r2";
import { loadEnvFile } from "./env";

// Columns inferred from the workers' queries (see git history for context:
// the Cloudflare D1 database was created out-of-band, without in-repo DDL).
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS user_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_id TEXT,
  user_id TEXT NOT NULL,
  r2_object_key TEXT NOT NULL UNIQUE,
  filename TEXT,
  upload_date TEXT,
  file_size INTEGER,
  mime_type TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_images_user ON user_images(user_id);
CREATE INDEX IF NOT EXISTS idx_user_images_upload_date ON user_images(upload_date);
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  username TEXT,
  email TEXT,
  avatar_url TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  telegram_chat_id TEXT,
  notification_enabled INTEGER DEFAULT 0,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS do_storage (
  namespace TEXT NOT NULL,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (namespace, name, key)
);
`;

export interface GatewayConfig {
  port: number;
  dataDir: string;
  publicOrigin: string;
  githubClientId: string;
  githubClientSecret: string;
  adminToken: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  maxFileSize: string;
  dailyQuotaBytes: string;
  abuseDetectionEnabled: string;
  contentModerationEnabled: string;
  allowedOrigins: string;
  allowedReferers: string;
  imagesBucketId: string;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const publicOrigin = (env.PUBLIC_ORIGIN ?? "").replace(/\/+$/, "");
  return {
    port: Number(env.PORT ?? 8080),
    dataDir: env.DATA_DIR ?? "/var/lib/picopics",
    publicOrigin,
    githubClientId: env.GITHUB_CLIENT_ID ?? "",
    githubClientSecret: env.GITHUB_CLIENT_SECRET ?? "",
    adminToken: env.ADMIN_TOKEN ?? "",
    telegramBotToken: env.TELEGRAM_BOT_TOKEN,
    telegramChatId: env.TELEGRAM_CHAT_ID,
    maxFileSize: env.MAX_FILE_SIZE ?? "10485760",
    dailyQuotaBytes: env.DAILY_QUOTA_BYTES ?? "104857600",
    abuseDetectionEnabled: env.ABUSE_DETECTION_ENABLED ?? "true",
    contentModerationEnabled: env.CONTENT_MODERATION_ENABLED ?? "false",
    allowedOrigins: env.ALLOWED_ORIGINS || publicOrigin || "*",
    allowedReferers: env.ALLOWED_REFERERS || publicOrigin || "localhost",
    imagesBucketId: env.IMAGES_BUCKET_ID ?? "",
  };
}

/** Builds the shim env objects and the request dispatcher (testable). */
export function createGateway(config: GatewayConfig) {
  mkdirSync(config.dataDir, { recursive: true });
  mkdirSync(join(config.dataDir, "images"), { recursive: true });

  const db = new Database(join(config.dataDir, "db.sqlite"));
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA_SQL);

  const d1 = new D1Sqlite(db);
  const r2 = new R2BucketDisk(join(config.dataDir, "images"));
  const cdnBaseUrl = config.publicOrigin || "";

  // The workers fall back to https://image.hiaplha.xyz when CDN_BASE_URL is
  // unset — an empty string would trigger that, so only same-origin public
  // deployments are wired here.
  if (!cdnBaseUrl) {
    throw new Error("PUBLIC_ORIGIN must be set (e.g. https://picopics.example.com)");
  }

  const uploaderEnv = {
    IMAGES: r2,
    DB: d1,
    UPLOAD_QUOTA: createNamespace("UPLOAD_QUOTA", UploadQuota, null, db),
    IP_BLACKLIST: createNamespace("IP_BLACKLIST", IPBlacklist, null, db),
    ALLOWED_ORIGINS: config.allowedOrigins,
    MAX_FILE_SIZE: config.maxFileSize,
    DAILY_QUOTA_BYTES: config.dailyQuotaBytes,
    ABUSE_DETECTION_ENABLED: config.abuseDetectionEnabled,
    CONTENT_MODERATION_ENABLED: config.contentModerationEnabled,
    GITHUB_CLIENT_ID: config.githubClientId,
    GITHUB_CLIENT_SECRET: config.githubClientSecret,
    ADMIN_TOKEN: config.adminToken,
    TELEGRAM_BOT_TOKEN: config.telegramBotToken,
    TELEGRAM_CHAT_ID: config.telegramChatId,
    CDN_BASE_URL: cdnBaseUrl,
  };

  const historyEnv = {
    DB: d1,
    ALLOWED_ORIGINS: config.allowedOrigins,
    CDN_BASE_URL: cdnBaseUrl,
  };

  const cdnEnv = {
    IMAGES: r2,
    IMAGES_BUCKET_ID: config.imagesBucketId,
    ALLOWED_ORIGINS: "*",
    ALLOWED_REFERERS: config.allowedReferers,
  };

  installCachesShim();

  // Hono's c.executionCtx getter THROWS (rather than returning undefined)
  // when no context was supplied, and the workers guard Telegram sends with
  // `if (c.executionCtx)` — so every fetch() must receive one. waitUntil is
  // fire-and-forget, matching Workers semantics closely enough here.
  const executionCtx = {
    waitUntil(promise: Promise<unknown>) {
      void promise.catch(() => {});
    },
    passThroughOnException() {},
  };

  async function dispatch(request: Request): Promise<Response> {
    const req = withCfConnectingIp(request);
    const path = new URL(req.url).pathname;

    if (path === "/api/history") {
      return historyApp.fetch(req, historyEnv as never, executionCtx as never);
    }
    if (path.startsWith("/images/")) {
      return cdnApp.fetch(req, cdnEnv as never, executionCtx as never);
    }
    // /upload, /auth/callback, /api/*, /health, /test-telegram, admin routes
    return uploaderApp.fetch(req, uploaderEnv as never, executionCtx as never);
  }

  return {
    dispatch,
    close: () => db.close(),
    config,
  };
}

function main() {
  loadEnvFile(join(process.cwd(), ".env"));
  const config = configFromEnv();

  if (!config.githubClientId || !config.githubClientSecret) {
    console.warn("GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET not set — login will fail");
  }
  if (!config.adminToken) {
    console.warn("ADMIN_TOKEN not set — admin endpoints will reject all requests");
  }

  const gateway = createGateway(config);
  const server = serve({ port: config.port, fetch: (req) => gateway.dispatch(req) }, (info) => {
    console.log(`picopics gateway listening on http://127.0.0.1:${info.port}`);
  });

  const shutdown = () => {
    server.close(() => {
      gateway.close();
      process.exit(0);
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

// Unit tests import this module; only run the server when executed directly.
if (process.argv[1]?.endsWith("gateway.js") || process.argv[1]?.endsWith("gateway.ts")) {
  main();
}
