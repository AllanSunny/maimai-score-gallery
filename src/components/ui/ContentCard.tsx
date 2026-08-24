import type {ReactNode} from "react";

interface ContentCardProps {
  children: ReactNode;
  accentColor: string;
}

export function ContentCard({ children, accentColor }: ContentCardProps) {
  return (
    <div className={"min-w-0 border-2 rounded-3xl p-8 shadow-[0_0px_10px_var(--color-darkest)]"} style={{ borderColor: `var(--color-${accentColor})`, backgroundColor: `color-mix(
          in srgb,
          color-mix(
            in srgb,
            var(--color-${accentColor}) 40%,
            var(--color-light)
          ) 60%,
          transparent
        )` }}>
      {children}
    </div>
  );
}
