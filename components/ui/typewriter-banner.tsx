"use client";

import { useState, useEffect } from "react";

interface TypewriterBannerProps {
  username: string;
  className?: string;
}

export function TypewriterBanner({
  username,
  className = "",
}: TypewriterBannerProps) {
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const messages = [
      `Welcome back, Sir ${username}. Your dashboard is online and ready.`,
    ];

    const currentMessage = messages[index];
    const typingSpeed = isDeleting ? 25 : 40; // 打字/删除速度
    const pauseTime = 1800; // 每次循环停顿时间(ms)

    const timer = setTimeout(() => {
      if (!isDeleting && charIndex < currentMessage.length) {
        setText(currentMessage.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      } else if (isDeleting && charIndex > 0) {
        setText(currentMessage.slice(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      } else if (!isDeleting && charIndex === currentMessage.length) {
        setTimeout(() => setIsDeleting(true), pauseTime);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setIndex((index + 1) % messages.length); // 若未来有多条消息，可循环播放
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, index, username]);

  return (
    <div className={`w-full ${className}`}>
      <h1 className="text-sm sm:text-base md:text-lg font-medium text-muted-foreground leading-tight text-center break-words">
        {text}
        <span className="animate-pulse text-gray-400 ml-1">|</span>
      </h1>
    </div>
  );
}
