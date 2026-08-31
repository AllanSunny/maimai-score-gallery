import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SiteLayout } from "./components/SiteLayout";
import { HomePage } from "./pages/HomePage";
import { ChartDetailPage } from "./pages/ChartDetailPage";
import { AboutPage } from "./pages/AboutPage";
import { ScoreListPage } from "./pages/ScoreListPage";
import { Top50Page } from "./pages/Top50Page";
import { currentAppRoute } from "./utils/navigation";
type Route = "/" | "/about" | "/top-50" | "/scores" | `/charts/${string}`;

function currentRoute(): Route {
  const route = currentAppRoute();

  if (route === "/about" || route === "/top-50" || route === "/scores") {
    return route;
  }

  if (route.startsWith("/charts/")) return route as `/charts/${string}`;

  return "/";
}

function App() {
  const [, setLocationKey] = useState(() => `${window.location.pathname}${window.location.hash}`);
  const previousPathname = useRef(window.location.pathname);
  const pendingScrollY = useRef<number | null>(null);
  const route = currentRoute();
  const pathname = window.location.pathname;

  useLayoutEffect(() => {
    const pathnameChanged = previousPathname.current !== pathname;
    previousPathname.current = pathname;
    if (!pathnameChanged) return;

    if (pendingScrollY.current != null) {
      document.documentElement.scrollTop = pendingScrollY.current;
      document.body.scrollTop = pendingScrollY.current;
      pendingScrollY.current = null;
      return;
    }

    if (route === "/scores") return;

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, route]);

  useEffect(() => {
    let scrollFrame: number | undefined;
    const storeScrollPosition = () => {
      window.history.replaceState({
        ...window.history.state,
        scrollY: window.scrollY,
      }, "");
    };
    const handleScroll = () => {
      if (scrollFrame != null) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = undefined;
        storeScrollPosition();
      });
    };
    const handleRouteChange = (event?: PopStateEvent) => {
      if (event?.isTrusted && typeof event.state?.scrollY === "number") {
        pendingScrollY.current = event.state.scrollY;
      }
      setLocationKey(`${window.location.pathname}${window.location.hash}`);
    };
    const handleNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
      if (destination.origin !== window.location.origin || !destination.pathname.startsWith(baseUrl.pathname)) return;

      event.preventDefault();
      storeScrollPosition();
      window.history.pushState({ scrollY: 0 }, "", destination);
      handleRouteChange();
    };

    window.history.scrollRestoration = "manual";
    storeScrollPosition();
    window.addEventListener("popstate", handleRouteChange);
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("click", handleNavigation);
    return () => {
      if (scrollFrame != null) cancelAnimationFrame(scrollFrame);
      window.removeEventListener("popstate", handleRouteChange);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleNavigation);
    };
  }, []);

  const chartMatch = route.match(/^\/charts\/([^/]+)$/);
  const chartRoute = chartMatch ? {
    chartId: decodeURIComponent(chartMatch[1]),
    scoreId: window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : undefined,
  } : null;

  return (
    <SiteLayout route={route}>
      {route === "/" && <HomePage />}
      {route === "/about" && <AboutPage />}
      {route === "/top-50" && <Top50Page />}
      {route === "/scores" && <ScoreListPage />}
      {chartRoute && <ChartDetailPage {...chartRoute} />}
    </SiteLayout>
  );
}

export default App;
