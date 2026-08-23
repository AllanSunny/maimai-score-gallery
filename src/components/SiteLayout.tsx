import type { ReactNode } from "react";
import favicon from "../assets/favicon.png";

interface SiteLayoutProps {
  children: ReactNode;
  route: string;
}

const links = [
  { href: "#/profile", label: "Profile", route: "/profile" },
  { href: "#/top-50", label: "Top 50", route: "/top-50" },
  { href: "#/scores", label: "Scores", route: "/scores" },
];

export function SiteLayout({ children, route }: SiteLayoutProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 sm:px-8">
      <header className="flex h-20 items-center justify-between border-b border-light">
        <a
          href="#/"
          aria-label="Home"
          aria-current={route === "/" ? "page" : undefined}
          className="shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light"
        >
          <img className="h-14" src={favicon} alt="favicon" />
        </a>

        <nav aria-label="Main navigation" className="ml-auto flex gap-2 text-sm sm:gap-5">
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

      <main className="flex-1 py-8 sm:py-12">{children}</main>

      <footer className="flex flex-col gap-2 border-t border-light py-8 text-xs sm:flex-row sm:justify-between">
        <span>Unofficial fan project—not affiliated with SEGA.</span>
        <a className="hover:text-ink" href="https://github.com/AllanSunny/maimai-score-gallery">
          View source on GitHub ↗
        </a>
      </footer>
    </div>
  );
}
