"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";

interface WaveChartProps {
  data: number[];
  maxDataPoints?: number;
  height?: number;
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  label?: string;
  unit?: string;
  className?: string;
}

export function WaveChart({
  data,
  maxDataPoints = 60,
  height = 120,
  color = "#3b82f6",
  gradientFrom = "#3b82f6",
  gradientTo = "#1d4ed8",
  showGrid = true,
  showLabels = true,
  label = "Value",
  unit = "",
  className = "",
}: WaveChartProps) {
  const { theme } = useTheme();
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayData, setDisplayData] = useState<number[]>([]);
  const [smoothedData, setSmoothedData] = useState<number[]>([]);

  // 平滑处理函数
  const smoothData = useCallback((rawData: number[]) => {
    if (rawData.length < 3) return rawData;
    const smoothed = [...rawData];
    for (let i = 1; i < smoothed.length - 1; i++) {
      smoothed[i] = (rawData[i - 1] + rawData[i] + rawData[i + 1]) / 3;
    }
    return smoothed;
  }, []);

  // 更新数据
  useEffect(() => {
    const newData = [...data];
    if (newData.length > maxDataPoints) {
      newData.splice(0, newData.length - maxDataPoints);
    }
    setDisplayData(newData);
    setSmoothedData(smoothData(newData));
  }, [data, maxDataPoints, smoothData]);

  // 绘制图形
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || smoothedData.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height: canvasHeight } = canvas;
    ctx.clearRect(0, 0, width, canvasHeight);

    // 折线与渐变在light下需更高对比
    const gridColor = isDark
      ? "rgba(148, 163, 184, 0.12)"
      : "rgba(0, 0, 0, 0.05)";
    const strokeColor = isDark ? color : color + "E6"; // 浅色主题略加不透明
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, gradientFrom + (isDark ? "30" : "40"));
    gradient.addColorStop(0.5, gradientFrom + (isDark ? "15" : "25"));
    gradient.addColorStop(1, gradientTo + (isDark ? "05" : "10"));

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const maxValue = Math.max(...smoothedData, 1);
    const minValue = Math.min(...smoothedData, 0);
    const range = maxValue - minValue || 1;
    const padding = range * 0.1;
    const adjustedMin = minValue - padding;
    const adjustedMax = maxValue + padding;
    const adjustedRange = adjustedMax - adjustedMin;

    // 网格
    if (showGrid) {
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 6; i++) {
        const y = (canvasHeight / 6) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      for (let i = 0; i <= 12; i++) {
        const x = (width / 12) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }
    }

    // 渐变填充
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight);
    smoothedData.forEach((value, i) => {
      const x = (width / (smoothedData.length - 1)) * i;
      const y =
        canvasHeight - ((value - adjustedMin) / adjustedRange) * canvasHeight;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(width, canvasHeight);
    ctx.closePath();
    ctx.fill();

    // 折线
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = isDark ? color : color + "55";
    ctx.shadowBlur = isDark ? 6 : 4;
    ctx.beginPath();
    smoothedData.forEach((value, i) => {
      const x = (width / (smoothedData.length - 1)) * i;
      const y =
        canvasHeight - ((value - adjustedMin) / adjustedRange) * canvasHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 最新数据点
    const latest = smoothedData[smoothedData.length - 1];
    const latestX = width;
    const latestY =
      canvasHeight - ((latest - adjustedMin) / adjustedRange) * canvasHeight;
    ctx.fillStyle = strokeColor;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(latestX, latestY, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  }, [smoothedData, color, gradientFrom, gradientTo, isDark, showGrid]);

  // 格式化显示
  const formatValue = (value: number, unit: string = "") => {
    if (unit === "B/s") {
      if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)}GB/s`;
      if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)}MB/s`;
      if (value >= 1024) return `${(value / 1024).toFixed(1)}KB/s`;
      return `${value.toFixed(0)}B/s`;
    } else {
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
      return value.toFixed(1);
    }
  };

  const currentValue = smoothedData[smoothedData.length - 1] || 0;
  const maxValue = Math.max(...smoothedData, 1);

  return (
    <div
      className={`relative rounded-2xl p-3 transition-colors duration-300 ${
        isDark
          ? "bg-slate-800/50 border border-slate-700 shadow-slate-900/30"
          : "bg-slate-50 border border-slate-200 shadow-md"
      } ${className}`}
    >
      {showLabels && (
        <div className="flex items-center justify-between mb-2">
          <span
            className={`text-xs ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            {label}
          </span>
          <div className="flex items-center space-x-2">
            <span
              className={`text-sm font-medium ${
                isDark ? "text-slate-200" : "text-slate-800"
              }`}
            >
              {formatValue(currentValue, unit)}
            </span>
            {unit && unit !== "B/s" && (
              <span
                className={`text-xs ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {unit}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={height * 2}
          className="w-full h-full"
          style={{ imageRendering: "pixelated" }}
        />
        {showLabels && (
          <div
            className={`absolute top-0 right-0 text-xs ${
              isDark ? "text-slate-500" : "text-slate-500"
            }`}
          >
            {formatValue(maxValue, unit)}
          </div>
        )}
      </div>
    </div>
  );
}

// 性能波形组
interface PerformanceWaveProps {
  cpu: number;
  memory: number;
  disk: number;
  className?: string;
}

export function PerformanceWave({
  cpu,
  memory,
  disk,
  className = "",
}: PerformanceWaveProps) {
  const [cpuData, setCpuData] = useState<number[]>([cpu]);
  const [memoryData, setMemoryData] = useState<number[]>([memory]);
  const [diskData, setDiskData] = useState<number[]>([disk]);

  useEffect(() => {
    setCpuData((p) => [...p.slice(-59), cpu]);
    setMemoryData((p) => [...p.slice(-59), memory]);
    setDiskData((p) => [...p.slice(-59), disk]);
  }, [cpu, memory, disk]);

  return (
    <motion.div
      className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <WaveChart
        data={cpuData}
        label="CPU 使用率"
        unit="%"
        color="#ef4444"
        gradientFrom="#ef4444"
        gradientTo="#dc2626"
        height={100}
      />
      <WaveChart
        data={memoryData}
        label="内存使用率"
        unit="%"
        color="#f59e0b"
        gradientFrom="#f59e0b"
        gradientTo="#d97706"
        height={100}
      />
      <WaveChart
        data={diskData}
        label="磁盘使用率"
        unit="%"
        color="#10b981"
        gradientFrom="#10b981"
        gradientTo="#059669"
        height={100}
      />
    </motion.div>
  );
}

// 网络波形组
interface NetworkWaveProps {
  inSpeed: number;
  outSpeed: number;
  className?: string;
}

export function NetworkWave({
  inSpeed,
  outSpeed,
  className = "",
}: NetworkWaveProps) {
  const [inData, setInData] = useState<number[]>([inSpeed]);
  const [outData, setOutData] = useState<number[]>([outSpeed]);

  useEffect(() => {
    setInData((p) => [...p.slice(-59), inSpeed]);
    setOutData((p) => [...p.slice(-59), outSpeed]);
  }, [inSpeed, outSpeed]);

  return (
    <motion.div
      className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <WaveChart
        data={inData}
        label="下载速度"
        unit="B/s"
        color="#3b82f6"
        gradientFrom="#3b82f6"
        gradientTo="#1d4ed8"
        height={100}
      />
      <WaveChart
        data={outData}
        label="上传速度"
        unit="B/s"
        color="#8b5cf6"
        gradientFrom="#8b5cf6"
        gradientTo="#7c3aed"
        height={100}
      />
    </motion.div>
  );
}
