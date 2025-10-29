"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuotaBadgeProps {
  used: number;
  limit: number;
  className?: string;
}

export function QuotaBadge({ used, limit, className }: QuotaBadgeProps) {
  const percentage = (used / limit) * 100;
  const isNearLimit = percentage > 80;
  const isOverLimit = percentage >= 100;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / k ** i).toFixed(2)) + " " + sizes[i];
  };

  const getStatusColor = () => {
    if (isOverLimit) return "text-red-600 bg-red-50 border-red-200";
    if (isNearLimit) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getStatusIcon = () => {
    if (isOverLimit) return <AlertTriangle className="h-4 w-4" />;
    if (isNearLimit) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (isOverLimit) return "配额已用完";
    if (isNearLimit) return "配额即将用完";
    return "配额充足";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center space-x-3 rounded-lg border p-3",
        getStatusColor(),
        className
      )}
    >
      <div className="flex items-center space-x-2">
        <HardDrive className="h-4 w-4" />
        <span className="text-sm font-medium">存储配额</span>
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between text-sm">
          <span>
            {formatBytes(used)} / {formatBytes(limit)}
          </span>
          <span>{Math.round(percentage)}%</span>
        </div>

        <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
          <motion.div
            className={cn(
              "h-2 rounded-full",
              isOverLimit ? "bg-red-500" : isNearLimit ? "bg-orange-500" : "bg-green-500"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="flex items-center space-x-1">
        {getStatusIcon()}
        <span className="text-xs font-medium">{getStatusText()}</span>
      </div>
    </motion.div>
  );
}
