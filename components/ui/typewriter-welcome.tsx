"use client";

import React, { useState, useEffect } from "react";

interface TypewriterWelcomeProps {
  username: string;
  className?: string;
}

export function TypewriterWelcome({
  username,
  className = "",
}: TypewriterWelcomeProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [showCursor, setShowCursor] = useState(true);

  const fullText = `Welcome back, Sir ${username}. Your dashboard is online and ready`;
  const typingSpeed = 50; // 打字速度（毫秒）
  const cursorBlinkSpeed = 500; // 光标闪烁速度（毫秒）

  // 打字机效果
  useEffect(() => {
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
  }, [fullText, typingSpeed]);

  // 光标闪烁效果
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, cursorBlinkSpeed);

    return () => clearInterval(cursorInterval);
  }, [cursorBlinkSpeed]);

  return (
    <div className={className}>
      <p className="text-muted-foreground text-sm sm:text-base font-medium">
        {displayedText}
        {isTyping && (
          <span className="inline-block w-0.5 h-4 bg-gray-400 ml-1 animate-pulse" />
        )}
      </p>
    </div>
  );
}
