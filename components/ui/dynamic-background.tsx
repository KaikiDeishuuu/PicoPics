"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [time, setTime] = useState(0);

  // 统一的纯色渐变背景
  const backgroundGradient = {
    rainbow: "from-orange-500 via-pink-500 via-purple-600 to-blue-600",
    aurora: "from-cyan-400 via-blue-500 to-purple-600",
    cosmic: "from-purple-600 via-pink-500 to-orange-500",
    sunset: "from-orange-500 via-red-500 to-pink-600",
    ocean: "from-blue-500 via-cyan-400 to-teal-500",
    forest: "from-green-500 via-emerald-500 to-teal-500",
  };

  const gradientClasses = backgroundGradient[variant];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const variants = {
      rainbow: {
        colors: [
          "#ff6a00", // 橙红色
          "#ff2d95", // 粉红色
          "#7c3aed", // 紫色
          "#2563eb", // 蓝色
          "#06b6d4", // 青色
          "#10b981", // 绿色
          "#f59e0b", // 黄色
          "#ef4444", // 红色
        ],
        pattern: "flowing",
      },
      aurora: {
        colors: [
          "#06b6d4", // 青色
          "#3b82f6", // 蓝色
          "#8b5cf6", // 紫色
          "#ec4899", // 粉色
          "#10b981", // 绿色
          "#f59e0b", // 黄色
        ],
        pattern: "waves",
      },
      cosmic: {
        colors: [
          "#7c3aed", // 紫色
          "#ec4899", // 粉色
          "#f97316", // 橙色
          "#eab308", // 黄色
          "#22c55e", // 绿色
          "#3b82f6", // 蓝色
        ],
        pattern: "spiral",
      },
      sunset: {
        colors: [
          "#ff6a00", // 橙红色
          "#ff2d95", // 粉红色
          "#f97316", // 橙色
          "#fbbf24", // 黄色
          "#f59e0b", // 琥珀色
          "#ef4444", // 红色
        ],
        pattern: "radial",
      },
      ocean: {
        colors: [
          "#3b82f6", // 蓝色
          "#06b6d4", // 青色
          "#8b5cf6", // 紫色
          "#ec4899", // 粉色
          "#10b981", // 绿色
          "#0ea5e9", // 天蓝色
        ],
        pattern: "flowing",
      },
      forest: {
        colors: [
          "#10b981", // 绿色
          "#22c55e", // 翠绿色
          "#06b6d4", // 青色
          "#3b82f6", // 蓝色
          "#8b5cf6", // 紫色
          "#f59e0b", // 黄色
        ],
        pattern: "waves",
      },
    };

    const intensities = {
      low: { particles: 20, speed: 0.5 }, // 减少粒子数量
      medium: { particles: 40, speed: 1 }, // 减少粒子数量
      high: { particles: 60, speed: 1.5 }, // 减少粒子数量
    };

    const speeds = {
      slow: 0.1, // 更慢
      normal: 0.3, // 更慢
      fast: 0.5, // 更慢
    };

    let animationTime = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createGradient = (time: number) => {
      const currentVariant = variants[variant];
      const colors = currentVariant.colors;

      // 创建统一的全屏渐变 - 避免左中右分割
      const gradient = ctx.createRadialGradient(
        canvas.width / 2 + Math.sin(time * 0.0002) * 100,
        canvas.height / 2 + Math.cos(time * 0.0002) * 100,
        0,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height) * 0.8
      );

      // 使用更平滑的颜色过渡，避免明显分割
      colors.forEach((color, index) => {
        const basePosition = index / (colors.length - 1);
        const smoothPosition = Math.max(0, Math.min(1, basePosition));
        gradient.addColorStop(smoothPosition, color);
      });

      return gradient;
    };

    const createRadialGradient = (time: number) => {
      const currentVariant = variants[variant];
      const colors = currentVariant.colors;

      // 更慢的中心点移动 - 参考CSS动画效果
      const centerX = canvas.width / 2 + Math.sin(time * 0.0002) * 80;
      const centerY = canvas.height / 2 + Math.cos(time * 0.0002) * 80;

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        Math.max(canvas.width, canvas.height) / 2
      );

      // 更平滑的颜色分布
      colors.forEach((color, index) => {
        const basePosition = index / (colors.length - 1);
        const waveOffset = Math.sin(time * 0.0001 + index * 0.2) * 0.02;
        const position = Math.max(0, Math.min(1, basePosition + waveOffset));
        gradient.addColorStop(position, color);
      });

      return gradient;
    };

    const drawBackground = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const currentVariant = variants[variant];
      let gradient;

      if (currentVariant.pattern === "radial") {
        gradient = createRadialGradient(animationTime);
      } else {
        gradient = createGradient(animationTime);
      }

      // 绘制主渐变背景
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 添加流动效果
      const currentIntensity = intensities[intensity];
      const particleCount = currentIntensity.particles;

      for (let i = 0; i < particleCount; i++) {
        // 更慢更微妙的粒子移动
        const x = (Math.sin(animationTime * 0.0003 + i * 0.2) * 0.2 + 0.5) * canvas.width;
        const y = (Math.cos(animationTime * 0.0003 + i * 0.15) * 0.2 + 0.5) * canvas.height;
        // 更小的粒子大小
        const size = Math.sin(animationTime * 0.0008 + i) * 3 + 6;
        // 更低的透明度，让粒子更柔和
        const opacity = Math.sin(animationTime * 0.0003 + i * 0.3) * 0.15 + 0.1;

        const colorIndex = Math.floor((i + animationTime * 0.003) % currentVariant.colors.length);
        const color = currentVariant.colors[colorIndex];

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 添加波浪效果
      if (currentVariant.pattern === "waves" || currentVariant.pattern === "flowing") {
        ctx.save();
        ctx.globalAlpha = 0.08; // 更低的透明度
        for (let i = 0; i < 2; i++) {
          // 进一步减少波浪数量
          const waveY = (canvas.height / 3) * (i + 1) + Math.sin(animationTime * 0.0008 + i) * 20; // 更慢的波浪移动
          const waveGradient = ctx.createLinearGradient(0, waveY - 20, 0, waveY + 20);

          const color1 = currentVariant.colors[i % currentVariant.colors.length];
          const color2 = currentVariant.colors[(i + 1) % currentVariant.colors.length];

          waveGradient.addColorStop(0, color1 + "00");
          waveGradient.addColorStop(0.5, color2 + "15"); // 更低的透明度
          waveGradient.addColorStop(1, color1 + "00");

          ctx.fillStyle = waveGradient;
          ctx.fillRect(0, waveY - 20, canvas.width, 40);
        }
        ctx.restore();
      }
    };

    const animate = () => {
      animationTime += speeds[speed] * 4; // 更慢的动画速度，接近CSS的20秒循环
      setTime(animationTime);
      drawBackground();
      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [variant, intensity, speed]);

  return (
    <div className={`relative overflow-hidden min-h-screen ${className}`}>
      {/* 纯色渐变背景 */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradientClasses} animate-gradient-shift`}
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
    <DynamicBackground variant="rainbow" intensity="medium" speed="slow" className={className}>
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
    <DynamicBackground variant="aurora" intensity="medium" speed="slow" className={className}>
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
    <DynamicBackground variant="cosmic" intensity="low" speed="slow" className={className}>
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
    <DynamicBackground variant="sunset" intensity="medium" speed="normal" className={className}>
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
    <DynamicBackground variant="ocean" intensity="medium" speed="slow" className={className}>
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
    <DynamicBackground variant="forest" intensity="medium" speed="slow" className={className}>
      {children}
    </DynamicBackground>
  );
}
