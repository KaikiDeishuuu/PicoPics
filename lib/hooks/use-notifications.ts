"use client";

import { useEffect } from "react";
import { useToast } from "@/components/Toast";
import { NotificationService, Notifications } from "@/lib/notifications";

/**
 * Hook for using notifications with the NotificationService
 */
export function useNotifications() {
  const { toast } = useToast();

  // Initialize NotificationService on mount
  useEffect(() => {
    NotificationService.setToastHandler((notification) => {
      toast[notification.type](notification.title, notification.description, notification.duration);
    });
  }, [toast]);

  return {
    // Quick notification methods
    success: (title: string, description?: string) =>
      NotificationService.success(title, description),
    error: (title: string, description?: string) => NotificationService.error(title, description),
    warning: (title: string, description?: string) =>
      NotificationService.warning(title, description),
    info: (title: string, description?: string) => NotificationService.info(title, description),

    // Pre-defined notifications
    notify: Notifications,
  };
}
