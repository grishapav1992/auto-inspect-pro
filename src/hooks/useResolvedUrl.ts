import { useState, useEffect } from "react";
import { isIdbUrl, resolveMediaUrl } from "@/lib/media/mediaStore";

/**
 * Hook that resolves an idb:// URL to a displayable object URL.
 * For regular URLs (data:, http:, blob:), returns them as-is.
 */
export function useResolvedUrl(url: string | undefined): string {
  const [resolved, setResolved] = useState<string>(() => {
    if (!url) return "";
    if (!isIdbUrl(url)) return url;
    return "";
  });

  useEffect(() => {
    if (!url) {
      setResolved("");
      return;
    }
    if (!isIdbUrl(url)) {
      setResolved(url);
      return;
    }
    let cancelled = false;
    resolveMediaUrl(url).then((r) => {
      if (!cancelled) setResolved(r);
    });
    return () => { cancelled = true; };
  }, [url]);

  return resolved;
}

/**
 * Hook that resolves an array of potentially idb:// URLs.
 */
export function useResolvedUrls(urls: string[]): string[] {
  const [resolved, setResolved] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(urls.map((u) => isIdbUrl(u) ? resolveMediaUrl(u) : Promise.resolve(u)))
      .then((r) => { if (!cancelled) setResolved(r); });
    return () => { cancelled = true; };
  }, [urls]);

  return resolved;
}
