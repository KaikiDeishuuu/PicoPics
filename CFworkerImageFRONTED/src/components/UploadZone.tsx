/**
 * 图片上传组件
 * 支持：拖拽上传、点击上传、粘贴上传
 */

"use client";

import {
  useCallback,
  useState,
  useRef,
  useEffect,
  DragEvent,
  ChangeEvent,
} from "react";
import { UploadStatus } from "@/types";
import type { UploadSuccessResponse } from "@/types";
import clsx from "clsx";
import { SimpleUploader } from "@/utils/simpleUploader";

interface UploadZoneProps {
  onUploadSuccess: (data: UploadSuccessResponse) => void;
  onUploadError: (error: string) => void;
  accessToken?: string;
}

export default function UploadZone({
  onUploadSuccess,
  onUploadError,
  accessToken,
}: UploadZoneProps) {
  const [status, setStatus] = useState<UploadStatus>(UploadStatus.IDLE);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 执行实际上传 - 使用 SimpleUploader
   */
  const performUpload = useCallback(
    async (file: File) => {
      setStatus(UploadStatus.UPLOADING);
      setUploadProgress("准备中...");
      setProgressPercent(0);

      try {
        const uploader = new SimpleUploader(file, {
          accessToken,
          onProgress: (progress: number) => {
            setProgressPercent(progress);
            if (progress < 20) {
              setUploadProgress("压缩中...");
            } else {
              setUploadProgress(`上传中 ${progress}%`);
            }
          },
          onError: (error) => {
            setStatus(UploadStatus.ERROR);
            setUploadProgress("");
            onUploadError(error.message);
          },
          onSuccess: (response) => {
            if (response.success && response.url) {
              setStatus(UploadStatus.SUCCESS);
              setUploadProgress("上传成功！");
              onUploadSuccess({
                success: true,
                url: response.url,
                fileName: response.fileName || file.name,
                size: response.size || file.size,
                type: response.type || file.type,
                uploadedAt: response.uploadedAt || new Date().toISOString(),
              });
            } else {
              setStatus(UploadStatus.ERROR);
              setUploadProgress("");
              onUploadError(response.error || "上传失败");
            }
          },
        });

        await uploader.start();
      } catch (error) {
        setStatus(UploadStatus.ERROR);
        setUploadProgress("");
        onUploadError(error instanceof Error ? error.message : "上传失败");
      }
    },
    [accessToken, onUploadSuccess, onUploadError]
  );

  /**
   * 处理文件上传
   */
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        onUploadError("请上传图片文件");
        return;
      }

      await performUpload(file);
    },
    [performUpload, onUploadError]
  );

  /**
   * 处理拖拽进入
   */
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  /**
   * 处理拖拽悬停
   */
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * 处理文件放置
   */
  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  /**
   * 处理文件选择
   */
  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  /**
   * 处理点击上传区域
   */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 处理粘贴事件
   */
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileUpload(file);
            break;
          }
        }
      }
    },
    [handleFileUpload]
  );

  // 监听粘贴事件
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const listener = handlePaste as unknown as EventListener;
    window.addEventListener("paste", listener);

    return () => {
      window.removeEventListener("paste", listener);
    };
  }, [handlePaste]);

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border-2 border-dashed p-8 md:p-12 transition-all duration-300 cursor-pointer group shadow-2xl mx-auto w-full max-w-3xl",
        "hover:-translate-y-1 hover:shadow-orange-500/30",
        {
          "border-white/15 bg-black/40":
            status === UploadStatus.IDLE && !isDragging,
          "border-orange-500/70 bg-orange-500/10": isDragging,
          "border-indigo-400/70 bg-indigo-500/10":
            status === UploadStatus.UPLOADING,
          "border-emerald-400/80 bg-emerald-500/10":
            status === UploadStatus.SUCCESS,
          "border-red-500/80 bg-red-500/10": status === UploadStatus.ERROR,
        }
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {/* 背景装饰 - 深色调 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-[-3rem] left-[-3rem] h-40 w-40 rounded-full bg-orange-500/40 blur-3xl animate-float"></div>
        <div
          className="absolute bottom-[-3rem] right-[-3rem] h-52 w-52 rounded-full bg-pink-500/40 blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="text-center relative z-10">
        {/* 图标区域 */}
        <div className="mb-6 flex justify-center">
          {status === UploadStatus.UPLOADING ? (
            <div className="relative">
              <div className="inline-block h-20 w-20 animate-spin rounded-full border-t-4 border-b-4 border-orange-400"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="h-10 w-10 text-orange-100"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5" />
                  <path d="M6 11l6-6 6 6" />
                  <path d="M5 19h14" />
                </svg>
              </div>
            </div>
          ) : status === UploadStatus.SUCCESS ? (
            <div className="animate-bounce-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-200 shadow-2xl shadow-emerald-500/30 border border-emerald-400/40">
                <svg
                  className="h-10 w-10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12.5L10 17.5L19 8.5" />
                </svg>
              </div>
            </div>
          ) : status === UploadStatus.ERROR ? (
            <div className="animate-bounce-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 text-red-200 shadow-2xl shadow-red-500/30 border border-red-400/40">
                <svg
                  className="h-10 w-10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </div>
            </div>
          ) : (
            <div className="group-hover:scale-110 transition-transform duration-300">
              <svg
                className="h-20 w-20 text-white/30 transition-colors group-hover:text-orange-200"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Prompt text */}
        <div className="mb-4">
          <h3 className="mb-2 text-xl font-semibold text-white">
            {status === UploadStatus.IDLE &&
              (isDragging ? "Drop to Upload" : "Upload Image")}
            {status === UploadStatus.UPLOADING && "Uploading..."}
            {status === UploadStatus.SUCCESS && "Success"}
            {status === UploadStatus.ERROR && "Failed"}
          </h3>

          {status === UploadStatus.UPLOADING && (
            <div className="mx-auto mt-4 max-w-md">
              <div className="relative h-2 overflow-hidden rounded bg-white/10">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <p className="mt-2 text-sm text-white/70">{uploadProgress}</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-2 text-white/60">
          {status === UploadStatus.IDLE && (
            <div>
              <p className="text-sm text-white/70">
                Click, Drag & Drop, or Ctrl+V
              </p>
              <div className="mt-3 flex items-center justify-center space-x-4 text-xs text-white/60">
                <span>JPG / PNG / GIF / WebP</span>
                <span>•</span>
                <span>Max 10MB</span>
              </div>
            </div>
          )}
          {status === UploadStatus.SUCCESS && (
            <p className="text-sm text-emerald-300">
              Continue uploading more images
            </p>
          )}
          {status === UploadStatus.ERROR && (
            <p className="text-sm text-red-300">Please try again</p>
          )}
        </div>
      </div>

      {/* 边角装饰 */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-current opacity-20 rounded-tl-lg"></div>
      <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-current opacity-20 rounded-tr-lg"></div>
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-current opacity-20 rounded-bl-lg"></div>
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-current opacity-20 rounded-br-lg"></div>
    </div>
  );
}
