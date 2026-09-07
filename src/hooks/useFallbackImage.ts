import { useCallback } from "react";
import type { SyntheticEvent } from "react";

export function useFallbackImage(fallbackSrc: string) {
  return useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.getAttribute("src") !== fallbackSrc) {
      event.currentTarget.src = fallbackSrc;
    }
  }, [fallbackSrc]);
}
