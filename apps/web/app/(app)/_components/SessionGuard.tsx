"use client";

import { useEffect, useRef } from "react";

export default function SessionGuard() {
  const redirectingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (cancelled) return;
      if (redirectingRef.current) return;

      try {
        const res = await fetch("/api/backend/whoami", { cache: "no-store" });
        if (res.status === 401) {
          redirectingRef.current = true;
          window.location.href = "/api/auth/logout";
        }
      } catch {
        return;
      }
    }

    check();
    const id = window.setInterval(check, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return null;
}
