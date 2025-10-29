"use client";

import { motion } from "framer-motion";
import { Image as ImageIcon, Loader2 } from "lucide-react";

interface ModernLoadingProps {
  message?: string;
  variant?: "spinner" | "pulse" | "dots" | "skeleton";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ModernLoading({
  message = "Loading...",
  variant = "spinner",
  size = "md",
  className = "",
}: ModernLoadingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  if (variant === "spinner") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={`flex flex-col items-center justify-center space-y-4 ${className}`}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className={`${sizeClasses[size]} text-foreground`}
        >
          <Loader2 className="w-full h-full" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`${textSizeClasses[size]} text-foreground/80 text-center`}
        >
          {message}
        </motion.p>
      </motion.div>
    );
  }

  if (variant === "pulse") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`flex flex-col items-center justify-center space-y-4 ${className}`}
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className={`${sizeClasses[size]} bg-muted/50 rounded-full flex items-center justify-center`}
        >
          <ImageIcon className="w-1/2 h-1/2 text-foreground" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`${textSizeClasses[size]} text-foreground/80 text-center`}
        >
          {message}
        </motion.p>
      </motion.div>
    );
  }

  if (variant === "dots") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`flex flex-col items-center justify-center space-y-4 ${className}`}
      >
        <div className="flex space-x-2">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: index * 0.2,
              }}
              className="w-3 h-3 bg-foreground/60 rounded-full"
            />
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`${textSizeClasses[size]} text-foreground/80 text-center`}
        >
          {message}
        </motion.p>
      </motion.div>
    );
  }

  if (variant === "skeleton") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`space-y-4 ${className}`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <motion.div
              key={index}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.1,
              }}
              className="bg-muted/30 rounded-lg p-4 space-y-3"
            >
              <div className="bg-muted/50 rounded-lg h-48 w-full" />
              <div className="space-y-2">
                <div className="bg-muted/50 rounded h-4 w-3/4" />
                <div className="bg-muted/50 rounded h-3 w-1/2" />
              </div>
            </motion.div>
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`${textSizeClasses[size]} text-foreground/80 text-center`}
        >
          {message}
        </motion.p>
      </motion.div>
    );
  }

  return null;
}

// 图片卡片加载骨架
export function ImageCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/30 rounded-lg overflow-hidden"
    >
      <div className="aspect-square bg-muted/50 animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="bg-muted/50 rounded h-4 w-3/4 animate-pulse" />
        <div className="bg-muted/50 rounded h-3 w-1/2 animate-pulse" />
        <div className="flex justify-between items-center">
          <div className="bg-muted/50 rounded h-3 w-1/4 animate-pulse" />
          <div className="bg-muted/50 rounded h-6 w-6 animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}

// 图片网格加载骨架
export function ImageGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <ImageCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}
