import { useLayoutEffect, useRef, useState } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

const DEFAULT_SIZE: ElementSize = { width: 600, height: 400 };

export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<ElementSize>(DEFAULT_SIZE);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width || DEFAULT_SIZE.width,
          height: entry.contentRect.height || DEFAULT_SIZE.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}
