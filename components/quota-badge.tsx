"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "../lib/utils";

interface QuotaBadgeProps {
  used: number;
  limit: number;
  className?: string;
}

export function QuotaBadge({ used, limit, className }: QuotaBadgeProps) {
  const percentage = (used / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isOverLimit = used >= limit;

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getStatusColor = () => {
    if (isOverLimit) return "text-red-600 bg-red-50 border-red-200";
    if (isNearLimit) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getStatusIcon = () => {
    if (isOverLimit) return <AlertTriangle className="h-4 w-4" />;
    if (isNearLimit) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium",
        getStatusColor(),
        className
      )}
    >
      {getStatusIcon()}
      <span>
        {formatNumber(used)} / {formatNumber(limit)}
      </span>
      <span className="text-xs opacity-75">({percentage.toFixed(1)}%)</span>
    </motion.div>
  );
}
