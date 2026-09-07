import type { SyntheticEvent } from "react";
import randomSongJacket from "../assets/random-song-jacket.png";

export const fallbackImage = randomSongJacket;

export function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.getAttribute("src") !== fallbackImage) {
    event.currentTarget.src = fallbackImage;
  }
}
