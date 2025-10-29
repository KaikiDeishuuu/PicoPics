"use client";

import { motion } from "framer-motion";
import { AlertTriangle, HardDrive } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

interface QuotaBadgeProps {
  used: number;
  limit: number;
  className?: string;
}

export function QuotaBadge({ used, limit, className }: QuotaBadgeProps) {
  const percentage = (used / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isOverLimit = percentage >= 100;

  const getStatusColor = () => {
    if (isOverLimit) return "text-red-600 bg-red-50 border-red-200";
    if (isNearLimit) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  const getIcon = () => {
    if (isOverLimit) return <AlertTriangle className="h-4 w-4" />;
    return <HardDrive className="h-4 w-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium",
        getStatusColor(),
        className
      )}
    >
      {getIcon()}
      <span>
        已使用 {used}/{limit} ({Math.round(percentage)}%)
      </span>
    </motion.div>
  );
}
