"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PRRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const prUrl = searchParams.get("url");
    const target = prUrl ? `/?url=${encodeURIComponent(prUrl)}` : "/";
    router.replace(target);
  }, [router, searchParams]);

  return null;
}
