import { useEffect, useRef, useState } from "react";
import favicon from "../../assets/favicon.png";
import { appHref } from "../../utils/navigation";
import { CollapsedNavigation } from "./CollapsedNavigation";

interface SiteNavigationProps {
  route: string;
}

export interface NavigationLink {
  href: string;
  label: string;
  route: string;
}

const links = [
  { href: appHref("/about"), label: "About", route: "/about" },
  { href: appHref("/top-50"), label: "Top 50", route: "/top-50" },
  { href: appHref("/scores"), label: "Songs", route: "/scores" },
];

function isCurrentRoute(route: string, linkRoute: string) {
  return route === linkRoute || (linkRoute === "/scores" && route.startsWith("/charts/"));
}

export function SiteNavigation({ route }: SiteNavigationProps) {
  const headerRef = useRef<HTMLElement>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const observer = new IntersectionObserver(([entry]) => setIsHeaderVisible(entry.isIntersecting));
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header ref={headerRef} className="flex h-20 items-center justify-between border-b border-lightest">
        <a
          href={appHref("/")}
          aria-label="Home"
          aria-current={route === "/" ? "page" : undefined}
          className="shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light"
        >
          <img className="h-14" src={favicon} alt="favicon" />
        </a>

        <nav aria-label="Main navigation" className="ml-auto flex gap-2 text-sm sm:gap-3 md:gap-5">
          {links.map((link) => (
            <a
              key={link.route}
              href={link.href}
              aria-current={isCurrentRoute(route, link.route) ? "page" : undefined}
              className="btn btn-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      <CollapsedNavigation isHeaderVisible={isHeaderVisible} links={links} route={route} />
    </>
  );
}
