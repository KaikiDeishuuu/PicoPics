"use client";

import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  className,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-2", className)}
    >
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          {showPercentage && <span className="font-medium">{Math.round(percentage)}%</span>}
        </div>
      )}

      <Progress value={percentage} className="h-2" />

      {!label && showPercentage && (
        <div className="text-right text-sm text-muted-foreground">{Math.round(percentage)}%</div>
      )}
    </motion.div>
  );
}
