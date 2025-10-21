/**
 * 上传结果展示组件
 * 显示各种格式的链接，支持一键复制
 */

"use client";

import { useState } from "react";
import type { UploadSuccessResponse } from "@/types";
import { generateLinkFormats } from "@/services/upload";

interface ResultDisplayProps {
  data: UploadSuccessResponse;
}

export default function ResultDisplay({ data }: ResultDisplayProps) {
  const [copiedField, setCopiedField] = useState<string>("");

  const links = generateLinkFormats(data.url, data.fileName);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const linkFields = [
    {
      label: "Direct URL",
      value: links.url,
      name: "url",
      description: "Direct image access URL",
    },
    {
      label: "HTML",
      value: links.html,
      name: "html",
      description: "HTML img tag with alt",
    },
    {
      label: "HTML (Simple)",
      value: links.htmlSimple,
      name: "htmlSimple",
      description: "Simplified HTML tag",
    },
    {
      label: "Markdown",
      value: links.markdown,
      name: "markdown",
      description: "Markdown image syntax",
    },
    {
      label: "Markdown (Link)",
      value: links.markdownWithLink,
      name: "markdownWithLink",
      description: "Clickable Markdown syntax",
    },
    {
      label: "BBCode",
      value: links.bbcode,
      name: "bbcode",
      description: "Forum BBCode format",
    },
  ];

  return (
    <div className="mt-8 space-y-6">
      {/* Image preview */}
      <div className="glass-modern border-gradient relative rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1">
        <h3 className="mb-4 text-xl font-semibold text-white">Image Preview</h3>
        <div className="flex justify-center rounded-2xl border border-white/10 bg-black/50 p-4">
          <img
            src={data.url}
            alt="Uploaded"
            className="max-w-full max-h-96 rounded hover:scale-105 transition-transform cursor-pointer"
            onClick={() => window.open(data.url, "_blank")}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="mb-1 text-xs text-white/60">Filename</div>
            <div
              className="font-mono text-xs text-white/70 truncate"
              title={data.fileName}
            >
              {data.fileName}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="mb-1 text-xs text-white/60">Size</div>
            <div className="font-semibold text-white">
              {formatFileSize(data.size)}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="mb-1 text-xs text-white/60">Type</div>
            <div className="font-semibold text-white">{data.type}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="mb-1 text-xs text-white/60">Time</div>
            <div className="text-xs font-semibold text-white">
              {new Date(data.uploadedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Link formats */}
      <div className="glass-modern border-gradient relative rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1">
        <h3 className="mb-4 flex items-center justify-between text-xl font-semibold text-white">
          <span>Link Formats</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
            {linkFields.length} formats
          </span>
        </h3>

        <div className="space-y-4">
          {linkFields.map((field, index) => (
            <div
              key={field.name}
              className="group animate-slide-in-right"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center text-sm font-semibold text-white">
                  <span className="text-lg mr-2">
                    {field.label.split(" ")[0]}
                  </span>
                  <span>{field.label.split(" ").slice(1).join(" ")}</span>
                </label>
                <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/50">
                  {field.description}
                </span>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={field.value}
                    readOnly
                    onClick={(e) => e.currentTarget.select()}
                    className="w-full cursor-text rounded-xl border border-white/10 bg-black/60 px-4 py-3 font-mono text-sm text-white/80 transition focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/40 hover:border-orange-300/40"
                  />
                </div>
                <button
                  onClick={() => copyToClipboard(field.value, field.name)}
                  className={`whitespace-nowrap rounded-xl px-6 py-3 text-sm font-medium transition ${
                    copiedField === field.name
                      ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40"
                      : "border border-orange-400/40 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50"
                  }`}
                >
                  {copiedField === field.name ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Success message */}
      <div className="glass-modern-soft border border-emerald-400/40 rounded-2xl p-5">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/30 text-xl text-emerald-200">
              ✓
            </div>
          </div>
          <div className="ml-4">
            <h4 className="text-base font-semibold text-emerald-300 mb-1">
              Upload Successful
            </h4>
            <p className="text-sm text-emerald-400/80 mb-1">
              Image uploaded to Cloudflare R2 and available via global CDN.
            </p>
            <p className="text-xs text-emerald-500/60">
              Save the links above for future use. You can continue uploading
              more images.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
