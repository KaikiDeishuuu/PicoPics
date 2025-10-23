"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { CheckCircle, Copy, ExternalLink } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

interface ResultDisplayProps {
  data: {
    url: string;
    fileName: string;
    size: number;
    type: string;
    uploadedAt: string;
  };
  className?: string;
}

export function ResultDisplay({ data, className }: ResultDisplayProps) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const openInNewTab = () => {
    window.open(data.url, "_blank");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-lg border border-green-200 p-6 shadow-sm",
        className
      )}
    >
      <div className="flex items-center space-x-2 mb-4">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <h3 className="text-lg font-semibold text-green-800">上传成功</h3>
      </div>

      {/* 图片预览 */}
      <div className="mb-4">
        <Image
          src={data.url}
          alt="Uploaded"
          width={1200}
          height={800}
          className="rounded-lg w-full h-auto object-contain max-h-96"
          unoptimized
        />
      </div>

      {/* 文件信息 */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">文件名:</span>
          <span className="font-medium">{data.fileName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">大小:</span>
          <span className="font-medium">{formatFileSize(data.size)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">类型:</span>
          <span className="font-medium">{data.type}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">上传时间:</span>
          <span className="font-medium">
            {new Date(data.uploadedAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* URL 输入框 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          图片链接:
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={data.url}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="flex items-center space-x-1"
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span>{copied ? "已复制" : "复制"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openInNewTab}
            className="flex items-center space-x-1"
          >
            <ExternalLink className="h-4 w-4" />
            <span>打开</span>
          </Button>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex space-x-2">
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="flex-1"
        >
          继续上传
        </Button>
        <Button
          onClick={() => (window.location.href = "/gallery")}
          className="flex-1"
        >
          查看图库
        </Button>
      </div>
    </motion.div>
  );
}
