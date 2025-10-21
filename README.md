# PicoPics

A full-stack, AI-powered image hosting service built on the Cloudflare ecosystem.

---

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare Stack">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
</p>

---

## Project Summary

PicoPics is a developer-focused image hosting and delivery platform optimized for performance and cost-efficiency on Cloudflare. It provides secure upload flows, AI-powered moderation, quota and abuse protections, and global delivery at the edge.

---

## Visual Architecture Overview

![PicoPics Architecture](./docs/architecture.svg)

---

## Architecture — Explanation

**Design goals**

* Keep data at the edge for low latency
* Separate upload validation from delivery
* Centralize quota and abuse control in durable state
* Use object storage for cost-efficient long-term storage

**High-level flow**

1. The user uploads an image from the Next.js frontend (client-side compression and chunking optional).
2. The upload hits the Uploader Worker, which authenticates, performs heuristics, and invokes Cloudflare AI for moderation.
3. If approved, the worker writes the image (original and derived variants) to R2 and records metadata.
4. Durable Objects enforce per-user quotas, global rate limits, and coordinate abuse mitigation.
5. The CDN Delivery Worker serves images from R2 with caching and optional on-the-fly transforms.

---

## Core Features

* Global CDN delivery via Cloudflare
* GitHub OAuth-based authentication
* AI-assisted content moderation
* Abuse protection and quota management using Durable Objects
* Chunked uploads and resumable transfers for reliability
* Image optimization and caching at the edge

---

## Technology Stack

| Layer    | Component                               |
| -------- | --------------------------------------- |
| Frontend | Next.js (App Router) + React            |
| Compute  | Cloudflare Workers (uploader, delivery) |
| Storage  | Cloudflare R2                           |
| State    | Cloudflare Durable Objects              |
| AI       | Cloudflare AI / custom models           |
| Language | TypeScript                              |
| Styling  | Tailwind CSS                            |
| Hosting  | Cloudflare Pages / Workers              |

---

## Getting Started (short)

1. Install dependencies

```bash
npm install
```

2. Create R2 bucket

```bash
npx wrangler r2 bucket create r2-explorer-bucket
```

3. Deploy

```bash
npx wrangler deploy
```

4. Tail logs

```bash
npx wrangler tail
```

Refer to `DEPLOY_GUIDE.md` for a step-by-step walkthrough.

---

## Project Structure

```
PicoPics/
├── worker-uploader/
├── worker-cdn/
├── frontend/
├── docs/
│   └── architecture.svg   # optional external copy
├── DEPLOY_GUIDE.md
├── SECURITY.md
└── README.md
```

---

## License

This project is released under the MIT License. See `LICENSE` for details.

---

Created by [Kaiki](https://github.com/KaikiDeishuuu)
