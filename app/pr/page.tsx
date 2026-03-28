"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PRRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const prUrl = new URLSearchParams(window.location.search).get("url");
    const target = prUrl ? `/?url=${encodeURIComponent(prUrl)}` : "/";
    router.replace(target);
  }, [router]);

  return null;
}
