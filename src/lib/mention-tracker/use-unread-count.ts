"use client";

import { useEffect, useState } from "react";

export function useUnreadMentionsCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      fetch("/api/mentions/unread-count")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data) setCount(data.count);
        })
        .catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 60_000);
    window.addEventListener("mentions-updated", refresh);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("mentions-updated", refresh);
    };
  }, []);

  return count;
}
