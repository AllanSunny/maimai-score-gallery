import type { ImgHTMLAttributes } from "react";
import { fallbackImage, handleImageError } from "../../utils/fallback-image";
import { jacketUrl } from "../../utils/jackets";
import type { Song } from "../../utils/types";

interface SongJacketImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "src"> {
  song?: Song;
}

export function SongJacketImage({ song, ...imageProps }: SongJacketImageProps) {
  return <img {...imageProps} src={jacketUrl(song) ?? fallbackImage} alt="" onError={handleImageError} />;
}
