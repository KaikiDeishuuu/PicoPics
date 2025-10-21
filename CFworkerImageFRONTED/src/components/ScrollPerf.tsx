"use client";

import { useEffect } from "react";

// This small component adds an `is-scrolling` class to body when user scrolls,
// and removes heavy visual effects temporarily to improve scroll performance.
export default function ScrollPerf() {
  useEffect(() => {
    let timer: number | undefined;

    const onScroll = () => {
      if (timer) window.clearTimeout(timer);
      document.body.classList.add("is-scrolling");
      timer = window.setTimeout(() => {
        document.body.classList.remove("is-scrolling");
      }, 200);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return null;
}
