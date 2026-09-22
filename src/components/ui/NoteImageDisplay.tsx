import breakNote from "../../assets/notes/break.png";
import holdNote from "../../assets/notes/hold.png";
import slideNote from "../../assets/notes/slide.png";
import tapNote from "../../assets/notes/tap.png";
import touchNote from "../../assets/notes/touch.png";
import { classNames } from "../../utils/class-names";
import type { NoteType } from "../../utils/types";

interface NoteImageDisplayProps {
  noteType: NoteType;
  className?: string;
  decorative?: boolean;
}

const noteImages: Record<NoteType, string> = {
  tap: tapNote,
  hold: holdNote,
  slide: slideNote,
  touch: touchNote,
  break: breakNote,
};

const noteLabels: Record<NoteType, string> = {
  tap: "Tap",
  hold: "Hold",
  slide: "Slide",
  touch: "Touch",
  break: "Break",
};

export function NoteImageDisplay({
  noteType,
  className,
  decorative = false,
}: NoteImageDisplayProps) {
  const alt = decorative ? "" : noteLabels[noteType];

  return <img src={noteImages[noteType]} alt={alt} title={alt} className={classNames("object-contain", className)} />;
}
