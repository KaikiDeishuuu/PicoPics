import { z } from "zod";

const envSchema = z.object({
  // Cloudflare
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  CLOUDFLARE_API_TOKEN: z.string().min(1),

  // R2 Storage
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),

  // GitHub OAuth (optional)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Upload limits
  MAX_FILE_SIZE: z.string().transform(Number).default("10485760"), // 10MB
  ALLOWED_FILE_TYPES: z.string().default("image/jpeg,image/png,image/gif,image/webp"),

  // Rate limiting
  DAILY_UPLOAD_LIMIT: z.string().transform(Number).default("50"),
  HOURLY_UPLOAD_LIMIT: z.string().transform(Number).default("10"),

  // Security
  ALLOWED_ORIGINS: z.string().default("*"),

  // AI (optional)
  AI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let envCache: Env | null = null;

export function getEnv(): Env {
  if (envCache) return envCache;

  try {
    const parsed = envSchema.parse(process.env);
    envCache = parsed;
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${errorMessages.join("\n")}`);
    }
    throw error;
  }
}

// Type-safe environment access
export const env = new Proxy({} as Env, {
  get(_, prop: keyof Env) {
    return getEnv()[prop];
  },
});
