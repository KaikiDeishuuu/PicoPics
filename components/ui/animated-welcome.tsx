"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface AnimatedWelcomeProps {
  username: string;
  message: string;
  className?: string;
  variant?: "typewriter" | "fade" | "slide" | "shimmer";
}

export function AnimatedWelcome({
  username,
  message,
  className = "",
  variant = "typewriter",
}: AnimatedWelcomeProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  const fullText = message.replace("{username}", username);
  const typingSpeed = 50;
  const cursorBlinkSpeed = 500;

  // 打字机效果
  useEffect(() => {
    if (variant !== "typewriter") return;

    setIsTyping(true);
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, typingSpeed);

    return () => clearInterval(interval);
  }, [fullText, typingSpeed, variant]);

  // 光标闪烁效果
  useEffect(() => {
    if (variant !== "typewriter") return;

    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, cursorBlinkSpeed);

    return () => clearInterval(cursorInterval);
  }, [cursorBlinkSpeed, variant]);

  // 根据变体渲染不同的动画
  const renderContent = () => {
    switch (variant) {
      case "typewriter":
        return (
          <motion.p
            className="text-muted-foreground text-sm sm:text-base font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-semibold">
              {displayedText}
            </span>
            {isTyping && (
              <motion.span
                className="inline-block w-0.5 h-4 bg-gradient-to-b from-blue-400 to-pink-400 ml-1"
                animate={{ opacity: showCursor ? 1 : 0 }}
                transition={{ duration: 0.1 }}
              />
            )}
          </motion.p>
        );

      case "fade":
        return (
          <motion.p
            className="text-muted-foreground text-sm sm:text-base font-medium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            {fullText}
          </motion.p>
        );

      case "slide":
        return (
          <motion.p
            className="text-muted-foreground text-sm sm:text-base font-medium"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {fullText}
          </motion.p>
        );

      case "shimmer":
        return (
          <motion.p
            className="text-muted-foreground text-sm sm:text-base font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {fullText}
          </motion.p>
        );

      default:
        return (
          <p className="text-muted-foreground text-sm sm:text-base font-medium">
            {fullText}
          </p>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className={className}
    >
      {renderContent()}
    </motion.div>
  );
}
