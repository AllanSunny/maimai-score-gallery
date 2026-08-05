import type { ReactNode } from "react";

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
      <header className="flex h-20 items-center justify-between border-b border-line">
        <a href="#/" className="text-sm font-semibold tracking-tight">
          maimai score gallery
        </a>

        <nav aria-label="Main navigation" className="flex gap-5 text-sm text-muted">
          {links.map((link) => (
            <a
              key={link.route}
              href={link.href}
              aria-current={route === link.route || (link.route === "/scores" && route.startsWith("/songs/")) ? "page" : undefined}
              className="transition-colors hover:text-ink aria-[current=page]:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="flex-1 py-16 sm:py-24">{children}</main>

      <footer className="flex flex-col gap-2 border-t border-line py-8 text-xs text-muted sm:flex-row sm:justify-between">
        <span>Unofficial fan project—not affiliated with SEGA.</span>
        <a className="hover:text-ink" href="https://github.com/AllanSunny/maimai-score-gallery">
          View source on GitHub ↗
        </a>
      </footer>
    </div>
  );
}
