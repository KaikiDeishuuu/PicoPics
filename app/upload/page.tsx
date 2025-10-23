"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Cloud, FileImage, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { UploadCard } from "../../components/upload-card";
import { QuotaBadge } from "../../components/quota-badge";
import { uploadFile } from "../../lib/fetcher";
import { cn } from "../../lib/utils";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "idle" | "uploading" | "success" | "error";
  error?: string;
  result?: unknown;
}

export default function UploadPage() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [quota, setQuota] = useState({ used: 15, limit: 50 });

  const addFiles = useCallback((files: File[]) => {
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name} 不是有效的图片文件`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        // 10MB
        alert(`${file.name} 文件大小超过10MB限制`);
        return false;
      }
      return true;
    });

    const newUploads: UploadItem[] = validFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: "idle",
    }));

    setUploads((prev) => [...prev, ...newUploads]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      addFiles(files);
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      addFiles(files);
      e.target.value = ""; // Reset input
    },
    [addFiles]
  );

  const removeUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const uploadSingleFile = useCallback(async (uploadItem: UploadItem) => {
    try {
      setUploads((prev) =>
        prev.map((item) =>
          item.id === uploadItem.id
            ? { ...item, status: "uploading", progress: 0 }
            : item
        )
      );

      const result = await uploadFile(
        "/api/upload",
        uploadItem.file,
        (progress: number) => {
          setUploads((prev) =>
            prev.map((item) =>
              item.id === uploadItem.id ? { ...item, progress } : item
            )
          );
        }
      );

      setUploads((prev) =>
        prev.map((item) =>
          item.id === uploadItem.id
            ? { ...item, status: "success", progress: 100, result }
            : item
        )
      );

      // Update quota
      setQuota((prev) => ({ ...prev, used: prev.used + 1 }));
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "上传失败";

      setUploads((prev) =>
        prev.map((item) =>
          item.id === uploadItem.id
            ? { ...item, status: "error", error: errorMessage }
            : item
        )
      );
    }
  }, []);

  const startUpload = useCallback(async () => {
    const pendingUploads = uploads.filter((item) => item.status === "idle");

    for (const upload of pendingUploads) {
      await uploadSingleFile(upload);
    }
  }, [uploads, uploadSingleFile]);

  const clearCompleted = useCallback(() => {
    setUploads((prev) =>
      prev.filter(
        (item) => item.status !== "success" && item.status !== "error"
      )
    );
  }, []);

  const hasPendingUploads = uploads.some((item) => item.status === "idle");
  const hasActiveUploads = uploads.some((item) => item.status === "uploading");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">上传图片</h1>
            <p className="text-lg text-gray-600 mb-4">
              支持拖拽上传，实时预览上传进度
            </p>
            <QuotaBadge used={quota.used} limit={quota.limit} />
          </div>

          {/* Upload Area */}
          <motion.div
            className={cn(
              "relative border-2 border-dashed rounded-xl p-12 text-center transition-colors mb-8",
              isDragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Cloud className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                拖拽图片到此处或点击选择
              </h3>
              <p className="text-gray-500 mb-4">
                支持 JPEG、PNG、GIF、WebP 格式，最大 10MB
              </p>
              <Button variant="outline" className="pointer-events-none">
                <FileImage className="mr-2 h-4 w-4" />
                选择文件
              </Button>
            </motion.div>
          </motion.div>

          {/* Upload List */}
          <AnimatePresence>
            {uploads.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4 mb-8"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    上传队列 ({uploads.length})
                  </h3>
                  <div className="space-x-2">
                    {hasPendingUploads && !hasActiveUploads && (
                      <Button onClick={startUpload}>
                        <Upload className="mr-2 h-4 w-4" />
                        开始上传
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={clearCompleted}
                      disabled={hasActiveUploads}
                    >
                      <X className="mr-2 h-4 w-4" />
                      清除完成
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {uploads.map((upload) => (
                    <UploadCard
                      key={upload.id}
                      file={upload.file}
                      progress={upload.progress}
                      status={upload.status}
                      error={upload.error}
                      onRemove={() => removeUpload(upload.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats */}
          {uploads.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">上传统计</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {uploads.filter((u) => u.status === "success").length}
                  </div>
                  <div className="text-sm text-gray-500">成功</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {uploads.filter((u) => u.status === "error").length}
                  </div>
                  <div className="text-sm text-gray-500">失败</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {uploads.filter((u) => u.status === "uploading").length}
                  </div>
                  <div className="text-sm text-gray-500">上传中</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {uploads.filter((u) => u.status === "idle").length}
                  </div>
                  <div className="text-sm text-gray-500">等待中</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
