import type { SVGAttributes } from "react";
import { classNames } from "../../utils/class-names";

export type ChevronDirection = "up" | "right" | "down" | "left";

const directionClassNames: Record<ChevronDirection, string> = {
  up: "-rotate-90",
  right: "rotate-0",
  down: "rotate-90",
  left: "rotate-180",
};

interface ChevronIconProps extends SVGAttributes<SVGSVGElement> {
  direction?: ChevronDirection;
}

export function ChevronIcon({ direction = "right", className, ...props }: ChevronIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={classNames("size-3 transition-transform", directionClassNames[direction], className)}
      {...props}
    >
      <path d="m6 3 5 5-5 5" />
    </svg>
  );
}
