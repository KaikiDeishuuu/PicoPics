"use client";

import { motion } from "framer-motion";
import { CheckCircle, FileImage, Upload, X, XCircle } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

interface UploadCardProps {
  file: File;
  progress: number;
  status: "idle" | "uploading" | "success" | "error";
  error?: string;
  onRemove: () => void;
}

export function UploadCard({ file, progress, status, error, onRemove }: UploadCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / k ** i).toFixed(2)) + " " + sizes[i];
  };

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "uploading":
        return <Upload className="h-5 w-5 text-blue-500 animate-pulse" />;
      default:
        return <FileImage className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "success":
        return "上传成功";
      case "error":
        return "上传失败";
      case "uploading":
        return "上传中...";
      default:
        return "等待上传";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "uploading":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-black/80 rounded-lg border border-white/20 p-4 shadow-sm"
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">{getStatusIcon()}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white truncate">{file.name}</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-1 flex items-center space-x-2">
            <span className="text-xs text-white/70">{formatFileSize(file.size)}</span>
            <span className="text-xs text-white/40">•</span>
            <span className={cn("text-xs font-medium", getStatusColor())}>{getStatusText()}</span>
          </div>

          {status === "uploading" && (
            <div className="mt-2">
              <Progress value={progress} className="h-1" />
              <div className="mt-1 text-xs text-white/70 text-right">{Math.round(progress)}%</div>
            </div>
          )}

          {status === "error" && error && (
            <div className="mt-2 text-xs text-red-400 bg-red-900/30 p-2 rounded border border-red-400/30">
              {error}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
