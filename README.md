# PicoPics

PicoPics is an authenticated image hosting app built with Next.js and Cloudflare Workers/R2. It provides fast uploads, personal gallery browsing, and usage quota visibility.

## Features

- Authenticated image upload flow
- Drag-and-drop upload
- Click-to-select upload
- Clipboard paste upload (`Ctrl+V` on Windows/Linux, `Cmd+V` on macOS)
- Upload progress and status feedback
- Personal gallery/history view
- Quota display
- Cloudflare Worker + R2-backed storage pipeline

## Tech Stack

- Next.js 15 + React 18 + TypeScript
- TanStack React Query
- react-dropzone
- Vitest + Biome
- Cloudflare Workers + R2 + D1

## Local Development

```bash
npm install
cp env.example .env.local
npm run dev
```

Visit `http://localhost:3000`.

## Environment Variables

Use `env.example` (or `.env.template`) as the source of truth.

- `UPLOAD_API` (server-side preferred): upload worker base URL (without `/upload`)
- `NEXT_PUBLIC_UPLOAD_API` (compatibility/client fallback): upload worker base URL
- `NEXT_PUBLIC_HISTORY_API`: history worker base URL
- `NEXT_PUBLIC_CDN_BASE`: CDN base URL for image delivery
- `NEXT_PUBLIC_R2_BROWSER_API`: optional R2 browser API URL
- `NEXT_PUBLIC_GITHUB_CLIENT_ID`: GitHub OAuth client ID
- `ADMIN_TOKEN`: admin API token
- `NEXT_PUBLIC_MAX_UPLOAD_SIZE`: client-side max upload size

Never commit real secrets, private tokens, or production credentials.

## Upload Limits and File Types

- Default max file size: **10 MB**
- Allowed formats: **JPG / PNG / GIF / WebP**
- SVG is intentionally disabled by default due to XSS risk unless strict sanitization is added server-side.

## Upload UX

On `/upload`, users can:

1. Drag an image into the upload card.
2. Click to select an image from disk.
3. Paste an image directly with `Ctrl+V` / `Cmd+V`.

When pasting:

- The page extracts image files from clipboard data.
- Non-image clipboard content is ignored.
- Unsupported or oversized files are rejected with clear feedback.
- Upload progress and success/error state use the same upload pipeline as drag/click uploads.

## Health Check Commands

Run all project quality checks before merging:

```bash
npm run check
npm run type-check
npm run test
npm run build
```

## Deployment Notes

- Upload proxy route: `app/api/upload/route.ts`
  - Prefers `UPLOAD_API`, falls back to `NEXT_PUBLIC_UPLOAD_API`.
- Upload worker config examples:
  - `wrangler.toml.example`
  - `workers/uploader-wrangler.toml`
- History worker config:
  - `workers/history-wrangler.toml`

Configure runtime variables in your deployment platform (Cloudflare/Vercel) instead of hardcoding endpoints.

## Manual Test: Clipboard Upload

1. Log in to PicoPics.
2. Open `/upload`.
3. Copy an image (or take a screenshot and copy it).
4. Press `Ctrl+V` / `Cmd+V`.
5. Confirm upload status/progress updates and redirect to gallery on success.

## License

MIT License. See [LICENSE](./LICENSE).
