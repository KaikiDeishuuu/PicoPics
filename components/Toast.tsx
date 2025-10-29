"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const toastVariants = {
  success: {
    icon: CheckCircle,
    className: "border-green-200 bg-green-50 text-green-800",
    iconClassName: "text-green-600",
  },
  error: {
    icon: AlertCircle,
    className: "border-red-200 bg-red-50 text-red-800",
    iconClassName: "text-red-600",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-orange-200 bg-orange-50 text-orange-800",
    iconClassName: "text-orange-600",
  },
  info: {
    icon: Info,
    className: "border-blue-200 bg-blue-50 text-blue-800",
    iconClassName: "text-blue-600",
  },
};

export function Toast({ id, type, title, description, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 300); // 等待动画完成
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  const variant = toastVariants[type];
  const Icon = variant.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            "relative flex items-start space-x-3 rounded-lg border p-4 shadow-lg",
            variant.className
          )}
        >
          <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", variant.iconClassName)} />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{title}</p>
            {description && <p className="mt-1 text-sm opacity-90">{description}</p>}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-6 w-6 p-0 flex-shrink-0 hover:bg-black/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Toast 管理器
export interface ToastManagerProps {
  toasts: ToastProps[];
  onClose: (id: string) => void;
}

export function ToastManager({ toasts, onClose }: ToastManagerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (toast: Omit<ToastProps, "id" | "onClose">) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id, onClose: removeToast }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const toast = {
    success: (title: string, description?: string, duration?: number) =>
      addToast({ type: "success", title, description, duration }),
    error: (title: string, description?: string, duration?: number) =>
      addToast({ type: "error", title, description, duration }),
    warning: (title: string, description?: string, duration?: number) =>
      addToast({ type: "warning", title, description, duration }),
    info: (title: string, description?: string, duration?: number) =>
      addToast({ type: "info", title, description, duration }),
  };

  return { toasts, toast, removeToast };
}
