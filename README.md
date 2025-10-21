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

Below is a concise, publication-ready SVG diagram that represents the system components and data flow. The SVG is embedded directly so it renders on GitHub and in static site generators that support inline SVG.

<p align="center">
  <!-- Inline SVG: keeps README self-contained and visually crisp -->
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 520" width="80%" role="img" aria-label="PicoPics architecture diagram">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="10" flood-opacity="0.15" />
      </filter>
      <style>
        .box { rx:10; ry:10; stroke:#222; stroke-width:1; filter:url(#shadow); }
        .title { font: 700 18px/1.1 Inter, Arial, sans-serif; fill:#0f172a }
        .label { font: 600 13px/1 Inter, Arial, sans-serif; fill:#0f172a }
        .desc { font: 400 12px/1 Inter, Arial, sans-serif; fill:#334155 }
        .arrow { stroke:#94a3b8; stroke-width:2; fill:none; marker-end:url(#arrowhead); }
      </style>
      <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"/>
      </marker>
    </defs>

<!-- Top row: Frontend -->
<g transform="translate(40,20)">
  <rect class="box" width="260" height="80" fill="#e6f0ff" />
  <text class="title" x="18" y="32">Next.js Frontend</text>
  <text class="desc" x="18" y="52">User interface — upload, browse, manage</text>
</g>

<!-- Uploader Worker -->
<g transform="translate(380,20)">
  <rect class="box" width="260" height="100" fill="#e9e7ff" />
  <text class="title" x="18" y="32">Uploader Worker</text>
  <text class="desc" x="18" y="52">Authentication • Pre-checks • Chunked upload</text>
  <text class="desc" x="18" y="70">Triggers AI moderation and storage write</text>
</g>

<!-- AI & Quota -->
<g transform="translate(720,20)">
  <rect class="box" width="240" height="120" fill="#fff7ed" />
  <text class="title" x="18" y="32">Cloudflare AI</text>
  <text class="desc" x="18" y="52">Image analysis & moderation</text>
  <rect x="18" y="62" width="204" height="1" fill="#e6e7eb" />
  <text class="label" x="18" y="86">Durable Objects</text>
  <text class="desc" x="18" y="102">Quota, rate limit & abuse state</text>
</g>

<!-- Storage (R2) center -->
<g transform="translate(360,180)">
  <rect class="box" width="280" height="110" fill="#fff0d6" />
  <text class="title" x="20" y="44">R2 Storage</text>
  <text class="desc" x="20" y="66">Objects: original, optimized, thumbnails</text>
  <text class="desc" x="20" y="86">HTTP metadata and lifecycle rules</text>
</g>

<!-- Delivery Worker -->
<g transform="translate(40,340)">
  <rect class="box" width="260" height="100" fill="#e6fff5" />
  <text class="title" x="18" y="34">CDN Delivery Worker</text>
  <text class="desc" x="18" y="58">Edge-optimized response • caching rules • transforms</text>
</g>

<!-- End User -->
<g transform="translate(720,340)">
  <rect class="box" width="240" height="100" fill="#e9f5ff" />
  <text class="title" x="18" y="34">End User</text>
  <text class="desc" x="18" y="58">Browser or client requesting images</text>
</g>

<!-- Arrows: Frontend -> Uploader -->
<path class="arrow" d="M300 60 L380 60" />
<text class="label" x="330" y="50">POST /upload</text>

<!-- Uploader -> AI -->
<path class="arrow" d="M640 60 L720 60" />
<text class="label" x="650" y="50">scan(image)</text>

<!-- Uploader -> R2 -->
<path class="arrow" d="M500 120 L500 180" />
<text class="label" x="420" y="150">write object</text>

<!-- AI -> R2 (approve) -->
<path class="arrow" d="M840 120 L640 240" />
<text class="label" x="730" y="160">approved → store</text>

<!-- R2 -> CDN Worker -->
<path class="arrow" d="M420 290 L200 380" />
<text class="label" x="300" y="340">GET /image/:id</text>

<!-- CDN -> End User -->
<path class="arrow" d="M560 290 L720 380" />
<text class="label" x="620" y="340">edge cache → client</text>

<!-- Durable Objects interactions (dashed) -->
<path stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 6" fill="none" d="M560 80 L720 130" />
<text class="desc" x="580" y="100">quota/check</text>

<!-- Legend -->
<g transform="translate(40,460)">
  <text class="label" x="0" y="14">Legend</text>
  <rect x="0" y="22" width="12" height="12" fill="#e6f0ff" stroke="#222"/>
  <text class="desc" x="20" y="32">Frontend</text>
  <rect x="140" y="22" width="12" height="12" fill="#e9e7ff" stroke="#222"/>
  <text class="desc" x="160" y="32">Worker (compute)</text>
  <rect x="320" y="22" width="12" height="12" fill="#fff0d6" stroke="#222"/>
  <text class="desc" x="340" y="32">Storage</text>
  <rect x="520" y="22" width="12" height="12" fill="#e6fff5" stroke="#222"/>
  <text class="desc" x="540" y="32">Delivery</text>
</g>

  </svg>
</p>

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
