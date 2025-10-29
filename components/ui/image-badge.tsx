"use client";

import { motion } from "framer-motion";
import { Check, Copy, Download, ExternalLink, Share2 } from "lucide-react";
import { useState } from "react";

interface ImageBadgeProps {
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
  className?: string;
}

interface UrlFormatItemProps {
  label: string;
  description: string;
  code: string;
  onCopy: () => void;
  copied: boolean;
}

function UrlFormatItem({
  label,
  description,
  code,
  onCopy,
  copied,
}: UrlFormatItemProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-foreground/80 text-xs font-medium">
            {label}
          </span>
          <span className="text-muted-foreground text-xs ml-2">
            {description}
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCopy}
          className="p-1 bg-muted hover:bg-muted/80 rounded transition-colors"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3 text-foreground" />
          )}
        </motion.button>
      </div>
      <div className="bg-muted/50 rounded p-2 border border-border/50">
        <code className="text-foreground/70 text-xs font-mono break-all">
          {code}
        </code>
      </div>
    </div>
  );
}

export function ImageBadge({
  url,
  filename,
  size,
  uploadedAt,
  className = "",
}: ImageBadgeProps) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / k ** i).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const openInNewTab = () => {
    window.open(url, "_blank");
  };

  const downloadImage = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card backdrop-blur-md border border-border rounded-lg p-4 space-y-3 ${className}`}
    >
      {/* 文件名和操作按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-foreground font-medium truncate">{filename}</h4>
          <p className="text-muted-foreground text-sm">
            {formatFileSize(size)} • {formatDate(uploadedAt)}
          </p>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={copyToClipboard}
            className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            title="Copy URL"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-foreground" />
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openInNewTab}
            className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4 text-foreground" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={downloadImage}
            className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4 text-foreground" />
          </motion.button>
        </div>
      </div>

      {/* 多格式URL显示区域 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-foreground/80 text-sm font-medium">
            Link Formats:
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowDetails(!showDetails)}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {showDetails ? "Hide Formats" : "Show Formats"}
          </motion.button>
        </div>

        <motion.div
          initial={false}
          animate={{ height: showDetails ? "auto" : 0 }}
          className="overflow-hidden"
        >
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50 space-y-2">
            {/* Direct URL */}
            <UrlFormatItem
              label="Direct"
              description="URL"
              code={url}
              onCopy={copyToClipboard}
              copied={copied}
            />
            {/* HTML with alt */}
            <UrlFormatItem
              label="HTML"
              description="HTML img tag with alt"
              code={`<img src="${url}" alt="${filename}">`}
              onCopy={() => {
                navigator.clipboard.writeText(
                  `<img src="${url}" alt="${filename}">`
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              copied={copied}
            />
            {/* HTML Simple */}
            <UrlFormatItem
              label="HTML"
              description="(Simple)"
              code={`<img src="${url}">`}
              onCopy={() => {
                navigator.clipboard.writeText(`<img src="${url}">`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              copied={copied}
            />
            {/* Markdown */}
            <UrlFormatItem
              label="Markdown"
              description="Markdown image syntax"
              code={`![${filename}](${url})`}
              onCopy={() => {
                navigator.clipboard.writeText(`![${filename}](${url})`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              copied={copied}
            />
            {/* Markdown Link */}
            <UrlFormatItem
              label="Markdown"
              description="(Link)"
              code={`[![${filename}](${url})](${url})`}
              onCopy={() => {
                navigator.clipboard.writeText(
                  `[![${filename}](${url})](${url})`
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              copied={copied}
            />
            {/* BBCode */}
            <UrlFormatItem
              label="BBCode"
              description="Forum BBCode format"
              code={`[img]${url}[/img]`}
              onCopy={() => {
                navigator.clipboard.writeText(`[img]${url}[/img]`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              copied={copied}
            />
          </div>
        </motion.div>
      </div>

      {/* 快速操作按钮 */}
      <div className="flex space-x-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={copyToClipboard}
          className="flex-1 bg-blue-600/80 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy URL</span>
            </>
          )}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={downloadImage}
          className="flex-1 bg-green-600/80 hover:bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

// 简化的引用戳组件
export function SimpleImageBadge({
  url,
  filename,
  size,
  uploadedAt,
  className = "",
}: ImageBadgeProps) {
  const [copied, setCopied] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / k ** i).toFixed(2)) + " " + sizes[i];
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-card/90 backdrop-blur-md border border-border/30 rounded-lg p-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-medium text-sm truncate">
            {filename}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatFileSize(size)}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={copyToClipboard}
          className="ml-3 p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-foreground" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
