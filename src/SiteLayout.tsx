import type { ReactNode } from "react";
import { SiteNavigation } from "./components/ui/SiteNavigation";

interface SiteLayoutProps {
  children: ReactNode;
  route: string;
}

export function SiteLayout({ children, route }: SiteLayoutProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 sm:px-8">
      <SiteNavigation route={route} />

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
