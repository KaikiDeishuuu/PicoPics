"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UploadCardProps {
  onUpload: (file: File, onProgress: (progress: number) => void) => Promise<void>;
  onRejected?: (message: string) => void;
  maxSize?: number;
  acceptedTypes?: string[];
  className?: string;
}

export function UploadCard({
  onUpload,
  onRejected,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"],
  className,
}: UploadCardProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // 验证文件大小
      if (file.size > maxSize) {
        const message = `文件大小超过限制 (${Math.round(maxSize / 1024 / 1024)}MB)`;
        setError(message);
        onRejected?.(message);
        return;
      }

      // 验证文件类型
      if (!acceptedTypes.includes(file.type)) {
        const message = "不支持的文件类型。允许格式: JPG / PNG / GIF / WebP";
        setError(message);
        onRejected?.(message);
        return;
      }

      try {
        setUploading(true);
        setError(null);
        setSuccess(false);
        setProgress(0);

        await onUpload(file, (progress) => {
          setProgress(progress);
        });

        setSuccess(true);
        setProgress(100);
      } catch (err) {
        const message = err instanceof Error ? err.message : "上传失败";
        setError(message);
        onRejected?.(message);
      } finally {
        setUploading(false);
      }
    },
    [onRejected, onUpload, maxSize, acceptedTypes]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.fromEntries(acceptedTypes.map((type) => [type, []])),
    multiple: false,
    disabled: uploading,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
        isDragActive && "border-primary bg-primary/5",
        uploading && "border-blue-500 bg-blue-50",
        success && "border-green-500 bg-green-50",
        error && "border-red-500 bg-red-50",
        className
      )}
    >
      <div {...getRootProps()} className="cursor-pointer">
        <input {...getInputProps()} />

        <motion.div
          animate={{ scale: isDragActive ? 1.05 : 1 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="p-4 rounded-full bg-muted">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>

          <div>
            <p className="text-lg font-medium">
              {isDragActive ? "释放图片以上传" : "拖拽图片到这里"}
            </p>
            <p className="text-sm text-muted-foreground">或点击选择图片</p>
            <p className="text-xs text-muted-foreground mt-1">或按 Ctrl+V / Cmd+V 粘贴截图或图片</p>
          </div>

          <div className="text-xs text-muted-foreground">
            支持 JPG / PNG / GIF / WebP，最大 {Math.round(maxSize / 1024 / 1024)}MB
          </div>
        </motion.div>
      </div>

      {/* 上传进度 */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2"
          >
            <div className="flex items-center justify-between text-sm">
              <span>上传中...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误信息 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 flex items-center justify-center space-x-2 text-red-600"
          >
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 成功信息 */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 flex items-center justify-center space-x-2 text-green-600"
          >
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">上传成功！</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSuccess(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
