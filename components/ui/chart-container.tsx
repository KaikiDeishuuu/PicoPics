"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface ChartContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const ChartContainer = ({
  children,
  className,
}: ChartContainerProps) => {
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // 初始化系统主题检测
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const systemPrefersDark = mediaQuery.matches;

    if (theme === "system") {
      setIsDark(systemPrefersDark);
      const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      setIsDark(theme === "dark");
    }
  }, [theme]);

  return (
    <div
      className={cn(
        "p-4 rounded-xl transition-all duration-300 relative overflow-hidden",
        isDark
          ? "bg-neutral-900 border border-neutral-700 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
          : "bg-neutral-50 border border-neutral-200 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]",
        className
      )}
    >
      {/* 反色描边层 */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none rounded-xl transition-colors duration-300",
          isDark
            ? "ring-1 ring-white/10"
            : "ring-1 ring-black/5"
        )}
      />
      {children}
    </div>
  );
};
