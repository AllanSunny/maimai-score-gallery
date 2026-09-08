import { useEffect, useState } from "react";
import { classNames } from "../../utils/class-names";
import type { NavigationLink } from "./SiteNavigation";

interface CollapsedNavigationProps {
  isHeaderVisible: boolean;
  links: NavigationLink[];
  route: string;
}

function isCurrentRoute(route: string, linkRoute: string) {
  return route === linkRoute || (linkRoute === "/scores" && route.startsWith("/charts/"));
}

export function CollapsedNavigation({ isHeaderVisible, links, route }: CollapsedNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHamburgerMounted, setIsHamburgerMounted] = useState(false);
  const [isHamburgerVisible, setIsHamburgerVisible] = useState(false);
  const showHamburger = !isHeaderVisible && !isMenuOpen;

  useEffect(() => {
    if (!isHeaderVisible) return;

    const frame = requestAnimationFrame(() => setIsMenuOpen(false));
    return () => cancelAnimationFrame(frame);
  }, [isHeaderVisible]);

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
      if (!showHamburger) {
        setIsHamburgerVisible(false);
        return;
      }

      setIsHamburgerMounted(true);
      visibilityFrame = requestAnimationFrame(() => setIsHamburgerVisible(true));
    });

    return () => {
      cancelAnimationFrame(mountFrame);
      if (visibilityFrame !== undefined) cancelAnimationFrame(visibilityFrame);
    };
  }, [showHamburger]);

  return (
    <>
      {isHamburgerMounted && (
        <div
          className={classNames(
            "pointer-events-none fixed inset-x-0 top-4 z-[1100] mx-auto w-full max-w-5xl px-5 transition-opacity duration-150 sm:px-8",
            { when: isHamburgerVisible, then: "opacity-100", else: "opacity-0" },
          )}
          aria-hidden={!showHamburger}
          onTransitionEnd={(event) => {
            if (event.propertyName === "opacity" && !showHamburger) setIsHamburgerMounted(false);
          }}
        >
          <button
            type="button"
            className={classNames(
              "btn btn-primary size-10 !rounded-2xl border !border-dark !p-0",
              { when: showHamburger, then: "pointer-events-auto", else: "pointer-events-none" },
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
                aria-current={isCurrentRoute(route, link.route) ? "page" : undefined}
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
    </>
  );
}
