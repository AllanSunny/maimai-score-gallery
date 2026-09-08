import { useEffect, useRef, useState, type ReactNode } from "react";
import favicon from "./assets/favicon.png";
import { appHref } from "./utils/navigation";
import { classNames } from "./utils/class-names";

interface SiteLayoutProps {
  children: ReactNode;
  route: string;
}

const links = [
  { href: appHref("/about"), label: "About", route: "/about" },
  { href: appHref("/top-50"), label: "Top 50", route: "/top-50" },
  { href: appHref("/scores"), label: "Songs", route: "/scores" },
];

export function SiteLayout({ children, route }: SiteLayoutProps) {
  const headerRef = useRef<HTMLElement>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsedNavigationMounted, setIsCollapsedNavigationMounted] = useState(false);
  const [isCollapsedNavigationVisible, setIsCollapsedNavigationVisible] = useState(false);
  const showCollapsedNavigation = !isHeaderVisible && !isMenuOpen;

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsHeaderVisible(entry.isIntersecting);
      if (entry.isIntersecting) setIsMenuOpen(false);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  useEffect(() => {
    let visibilityFrame: number | undefined;
    const mountFrame = requestAnimationFrame(() => {
      if (!showCollapsedNavigation) {
        setIsCollapsedNavigationVisible(false);
        return;
      }

      setIsCollapsedNavigationMounted(true);
      visibilityFrame = requestAnimationFrame(() => setIsCollapsedNavigationVisible(true));
    });

    return () => {
      cancelAnimationFrame(mountFrame);
      if (visibilityFrame !== undefined) cancelAnimationFrame(visibilityFrame);
    };
  }, [showCollapsedNavigation]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 sm:px-8">
      <header ref={headerRef} className="flex h-20 items-center justify-between border-b border-lightest">
        <a
          href={appHref("/")}
          aria-label="Home"
          aria-current={route === "/" ? "page" : undefined}
          className="shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light"
        >
          <img className="h-14" src={favicon} alt="favicon" />
        </a>

        <nav aria-label="Main navigation" className="ml-auto text-sm flex gap-2 sm:gap-3 md:gap-5">
          {links.map((link) => (
            <a
              key={link.route}
              href={link.href}
              aria-current={route === link.route || (link.route === "/scores" && route.startsWith("/charts/")) ? "page" : undefined}
              className="btn btn-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      {isCollapsedNavigationMounted && (
        <div
          className={classNames(
            "pointer-events-none fixed inset-x-0 top-4 z-[1100] mx-auto w-full max-w-5xl px-5 transition-opacity duration-150 sm:px-8",
            { when: isCollapsedNavigationVisible, then: "opacity-100", else: "opacity-0" },
          )}
          aria-hidden={!showCollapsedNavigation}
          onTransitionEnd={(event) => {
            if (event.propertyName === "opacity" && !showCollapsedNavigation) {
              setIsCollapsedNavigationMounted(false);
            }
          }}
        >
          <button
            type="button"
            className={classNames(
              "btn btn-primary size-10 !rounded-2xl border !border-dark !p-0",
              { when: showCollapsedNavigation, then: "pointer-events-auto", else: "pointer-events-none" },
            )}
            aria-label="Open navigation"
            aria-expanded={isMenuOpen}
            aria-controls="collapsed-navigation"
            onClick={() => setIsMenuOpen(true)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      <div
        id="collapsed-navigation"
        className={classNames(
          "fixed inset-x-0 top-0 z-[1200] border-b border-lightest bg-darkest/95 shadow-lg backdrop-blur-md transition-transform duration-200 ease-out",
          { when: isMenuOpen, then: "translate-y-0", else: "-translate-y-full" },
        )}
        aria-hidden={!isMenuOpen}
        inert={!isMenuOpen}
      >
        <div className="mx-auto flex h-20 w-full max-w-5xl items-center gap-2 px-5 sm:gap-3 sm:px-8">
          <nav aria-label="Collapsed navigation" className="flex flex-1 justify-center gap-2 sm:gap-3 md:gap-5">
            {links.map((link) => (
              <a
                key={link.route}
                href={link.href}
                aria-current={route === link.route || (link.route === "/scores" && route.startsWith("/charts/")) ? "page" : undefined}
                className="btn btn-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <button
            type="button"
            className="btn btn-tertiary size-10 shrink-0 !rounded-2xl !p-0"
            aria-label="Close navigation"
            onClick={() => setIsMenuOpen(false)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </div>

      <main className="flex-1 py-6 sm:py-12">{children}</main>

      <footer className="flex flex-col gap-2 border-t border-lightest py-8 text-xs sm:flex-row sm:justify-between">
        <span>Unofficial fan project—not affiliated with SEGA.</span>
        <a className="underline" href="https://github.com/AllanSunny/maimai-score-gallery">
          View source on GitHub
        </a>
      </footer>
    </div>
  );
}
