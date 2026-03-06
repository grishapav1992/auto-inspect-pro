import { useState, useEffect } from 'react';
import { getImages } from '@/lib/mediaDB';

/**
 * Hook to load image dataUrls from IndexedDB for a list of media IDs.
 * Returns a record of id -> dataUrl.
 */
export function useMediaImages(mediaIds: string[]): Record<string, string> {
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mediaIds.length === 0) {
      setImages({});
      return;
    }
    let cancelled = false;
    getImages(mediaIds).then(result => {
      if (!cancelled) setImages(result);
    });
    return () => { cancelled = true; };
  }, [mediaIds.join(',')]);

  return images;
}
