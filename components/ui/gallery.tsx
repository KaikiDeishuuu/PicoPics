"use client";

import {
  Code,
  Copy,
  Download,
  Eye,
  FileText,
  Link as LinkIcon,
  MessageSquare,
  Share2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import Masonry from "react-masonry-css";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { OptimizedImage } from "./image";
import { ImageBadge } from "./image-badge";
import { Modal } from "./modal";

interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
  filename?: string;
  uploadDate?: string;
  size?: number;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  onDelete?: (id: string) => void;
  onImageClick?: (image: GalleryImage) => void;
  className?: string;
  loading?: boolean;
}

export function ImageGallery({
  images,
  onDelete,
  onImageClick,
  className,
  loading = false,
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [imageSizes, setImageSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleImageLoad = (
    id: string,
    e: React.SyntheticEvent<HTMLImageElement>
  ) => {
    const img = e.currentTarget;
    setImageSizes((prev) => ({
      ...prev,
      [id]: { width: img.naturalWidth, height: img.naturalHeight },
    }));
  };

  const handleCopy = async (
    image: GalleryImage,
    format: string,
    label: string
  ) => {
    const filename = image.filename || `image-${image.id}`;
    let text = "";

    switch (format) {
      case "url":
        text = image.src;
        break;
      case "html":
        text = `<img src="${image.src}" alt="${filename}" />`;
        break;
      case "markdown":
        text = `![${filename}](${image.src})`;
        break;
      case "bbcode":
        text = `[img]${image.src}[/img]`;
        break;
    }

    await navigator.clipboard.writeText(text);
    toast.success("已复制", `${label} 格式已复制`);
  };

  const openModal = (img: GalleryImage) => {
    setSelectedImage(img);
    setIsModalOpen(true);
    onImageClick?.(img);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  if (loading)
    return (
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
          className
        )}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl" />
        ))}
      </div>
    );

  if (images.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center text-muted-foreground">
        <Eye className="w-8 h-8 opacity-60" />
        <div>
          <h3 className="text-lg font-medium">暂无图片</h3>
          <p className="text-sm text-muted-foreground">
            开始上传你的第一张图片吧
          </p>
        </div>
      </div>
    );

  const breakpointColumnsObj = {
    default: 4,
    1280: 3, // xl
    1024: 3, // lg
    768: 2, // md
    640: 2, // sm
    0: 1, // xs
  };

  return (
    <>
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="my-masonry-grid"
        columnClassName="my-masonry-grid_column"
      >
        {images.map((img) => (
          <div
            key={img.id}
            className="mb-5 group cursor-pointer"
            onClick={() => openModal(img)}
          >
            <div className="overflow-hidden rounded-2xl bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
              {/* 图片区域 */}
              <div className="relative">
                <img
                  src={img.src}
                  alt={img.alt}
                  onLoad={(e) => handleImageLoad(img.id, e)}
                  className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all pointer-events-none">
                  <Eye className="w-6 h-6 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* 信息区 */}
              <div className="p-3 sm:p-4 space-y-2 bg-card/70 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-medium text-foreground truncate flex-1 min-w-0">
                    {img.filename || `图片 ${img.id}`}
                  </h3>
                  {img.uploadDate && (
                    <p className="text-xs text-zinc-400 whitespace-nowrap flex-shrink-0">
                      {new Date(img.uploadDate).toLocaleDateString("zh-CN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    {
                      label: "URL",
                      format: "url",
                      desc: "Direct URL",
                      icon: LinkIcon,
                    },
                    {
                      label: "HTML",
                      format: "html",
                      desc: "HTML tag",
                      icon: Code,
                    },
                    {
                      label: "MD",
                      format: "markdown",
                      desc: "Markdown",
                      icon: FileText,
                    },
                    {
                      label: "BBC",
                      format: "bbcode",
                      desc: "BBCode",
                      icon: MessageSquare,
                    },
                  ].map(({ label, format, desc, icon: Icon }) => (
                    <button
                      key={format}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(img, format, label);
                      }}
                      className="group relative py-2 px-2 flex items-center justify-center rounded-md bg-gradient-to-br from-blue-600/90 to-indigo-600/90 hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 text-white border border-blue-400/30 hover:border-blue-300/50 shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                      title={desc}
                    >
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </Masonry>

      {/* 图片预览模态框 */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        size="xl"
        showCloseButton
      >
        {selectedImage && (
          <div className="space-y-6">
            <div className="relative rounded-xl overflow-hidden bg-black/10 flex items-center justify-center min-h-[300px]">
              <img
                src={selectedImage.src}
                alt={selectedImage.alt}
                className="max-w-full h-auto object-contain"
              />
            </div>

            <ImageBadge
              url={selectedImage.src}
              filename={selectedImage.filename || `图片 ${selectedImage.id}`}
              size={selectedImage.size || 0}
              uploadedAt={selectedImage.uploadDate || new Date().toISOString()}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(selectedImage, "url", "链接")}
              >
                <Copy className="w-4 h-4 mr-2" /> 复制链接
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = selectedImage.src;
                  a.download = selectedImage.filename || "image";
                  a.click();
                }}
              >
                <Download className="w-4 h-4 mr-2" /> 下载
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigator.share
                    ? navigator.share({
                        title: "分享图片",
                        url: selectedImage.src,
                      })
                    : handleCopy(selectedImage, "url", "链接")
                }
              >
                <Share2 className="w-4 h-4 mr-2" /> 分享
              </Button>
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onDelete(selectedImage.id);
                    closeModal();
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> 删除
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
