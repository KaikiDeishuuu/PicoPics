"use client";

import { useTheme } from "@/components/ThemeProvider";

interface DynamicBackgroundProps {
  children: React.ReactNode;
  className?: string;
  variant?: "rainbow" | "aurora" | "cosmic" | "sunset" | "ocean" | "forest";
  intensity?: "low" | "medium" | "high";
  speed?: "slow" | "normal" | "fast";
}

export function DynamicBackground({
  children,
  className = "",
  variant = "rainbow",
  intensity = "medium",
  speed = "normal",
}: DynamicBackgroundProps) {
  const { theme } = useTheme();

  // 检测是否为暗色主题
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // 根据主题调整背景渐变
  const backgroundGradient = {
    rainbow: isDark
      ? "from-orange-500 via-pink-500 via-purple-600 to-blue-600"
      : "from-orange-200 via-pink-200 via-purple-200 to-blue-200",
    aurora: isDark
      ? "from-cyan-400 via-blue-500 to-purple-600"
      : "from-cyan-200 via-blue-200 to-purple-200",
    cosmic: isDark
      ? "from-purple-600 via-pink-500 to-orange-500"
      : "from-purple-200 via-pink-200 to-orange-200",
    sunset: isDark
      ? "from-orange-500 via-red-500 to-pink-600"
      : "from-orange-200 via-red-200 to-pink-200",
    ocean: isDark
      ? "from-blue-500 via-cyan-400 to-teal-500"
      : "from-blue-200 via-cyan-200 to-teal-200",
    forest: isDark
      ? "from-green-500 via-emerald-500 to-teal-500"
      : "from-green-200 via-emerald-200 to-teal-200",
  };

  const gradientClasses = backgroundGradient[variant];

  // 保留参数以保持 API 兼容性（已移除 Canvas 动画以提高性能）
  // 参数不再使用但仍保留以保持向后兼容

  return (
    <div className={`relative overflow-hidden min-h-screen ${className}`}>
      {/* 纯色渐变背景 */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradientClasses}`}
        style={{ zIndex: -1 }}
      />

      {/* 内容 */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// 预设背景组件
export function RainbowBackground({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DynamicBackground
      variant="rainbow"
      intensity="medium"
      speed="slow"
      className={className}
    >
      {children}
    </DynamicBackground>
  );
}

export function AuroraBackground({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DynamicBackground
      variant="aurora"
      intensity="medium"
      speed="slow"
      className={className}
    >
      {children}
    </DynamicBackground>
  );
}

export function CosmicBackground({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DynamicBackground
      variant="cosmic"
      intensity="low"
      speed="slow"
      className={className}
    >
      {children}
    </DynamicBackground>
  );
}

export function SunsetBackground({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DynamicBackground
      variant="sunset"
      intensity="medium"
      speed="normal"
      className={className}
    >
      {children}
    </DynamicBackground>
  );
}

export function OceanBackground({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DynamicBackground
      variant="ocean"
      intensity="medium"
      speed="slow"
      className={className}
    >
      {children}
    </DynamicBackground>
  );
}

export function ForestBackground({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DynamicBackground
      variant="forest"
      intensity="medium"
      speed="slow"
      className={className}
    >
      {children}
    </DynamicBackground>
  );
}
