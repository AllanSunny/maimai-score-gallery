import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

interface OverflowMarqueeProps {
  children: string;
  className?: string;
  centerWhenFit?: boolean;
}

interface MarqueeStyle extends CSSProperties {
  "--marquee-distance": string;
  "--marquee-duration": string;
}

export function OverflowMarquee({
  children,
  className = "",
  centerWhenFit = false,
}: OverflowMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const observer = new ResizeObserver(() => {
      setOverflow(Math.max(0, text.scrollWidth - container.clientWidth));
    });

    observer.observe(container);
    observer.observe(text);
    return () => observer.disconnect();
  }, [children]);

  const style: MarqueeStyle = {
    "--marquee-distance": `${-overflow}px`,
    "--marquee-duration": `${Math.max(8, 6 + overflow / 28)}s`,
  };

  return (
    <div
      ref={containerRef}
      className={`overflow-marquee ${className}`.trim()}
      data-center-when-fit={centerWhenFit}
      data-overflowing={overflow > 0}
      style={style}
      title={children}
    >
      <span ref={textRef} className="overflow-marquee__text">{children}</span>
    </div>
  );
}
