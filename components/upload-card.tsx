"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

interface UploadCardProps {
  file: File;
  progress: number;
  status: "idle" | "uploading" | "success" | "error";
  error?: string;
  onRemove?: () => void;
  className?: string;
}

export function UploadCard({
  file,
  progress,
  status,
  error,
  onRemove,
  className,
}: UploadCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "uploading":
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Upload className="h-5 w-5 text-blue-500" />
          </motion.div>
        );
      default:
        return <Upload className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "border-green-200 bg-green-50";
      case "error":
        return "border-red-200 bg-red-50";
      case "uploading":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "relative border rounded-lg p-4 transition-colors",
        getStatusColor(),
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.name}
            </p>
            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>
        </div>

        {onRemove && status !== "uploading" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0 hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {status === "uploading" && (
        <div className="mt-3">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            {Math.round(progress)}% 已上传
          </p>
        </div>
      )}
    </motion.div>
  );
}
