/**
 * R2 Browser Worker Types
 */

import type { R2Bucket } from "@cloudflare/workers-types";

export interface Env {
  IMAGES: R2Bucket;
  ALLOWED_ORIGINS: string;
  ADMIN_USERS: string;
}

export interface R2ObjectInfo {
  key: string;
  size: number;
  uploaded: string;
  httpEtag: string;
  checksums: {
    md5?: string;
    sha1?: string;
    sha256?: string;
    sha384?: string;
    sha512?: string;
  };
}

export interface R2BrowserResponse {
  success: boolean;
  data?: {
    objects: R2ObjectInfo[];
    truncated: boolean;
    cursor?: string;
  };
  error?: string;
  code?: string;
}

export interface DeleteResponse {
  success: boolean;
  deleted?: string[];
  error?: string;
  code?: string;
}
