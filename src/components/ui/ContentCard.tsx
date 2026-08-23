import type {ReactNode} from "react";

interface ContentCardProps {
  children: ReactNode;
  accentColor: string;
}

export function ContentCard({ children, accentColor }: ContentCardProps) {
  return (
    <div className={"min-w-0 border-2 rounded-3xl p-8 bg-light/90 shadow-[0_0px_10px_var(--color-darkest)]"} style={{ borderColor: `var(--color-${accentColor})` }}>
      {children}
    </div>
  );
}
