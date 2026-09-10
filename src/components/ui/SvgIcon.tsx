import { classNames } from "../../utils/class-names";

interface SvgIconProps {
  className?: string;
  icon: string;
}

export function SvgIcon({ className, icon }: SvgIconProps) {
  const maskImage = `url("${icon}")`;

  return (
    <span
      aria-hidden="true"
      className={classNames("inline-block shrink-0 bg-current", className)}
      style={{
        maskImage,
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskImage: maskImage,
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
      }}
    />
  );
}
