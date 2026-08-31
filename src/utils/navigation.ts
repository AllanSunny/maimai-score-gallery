const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function appHref(route: string) {
  return `${basePath}${route}`;
}

export function currentAppRoute() {
  const pathname = window.location.pathname;
  const route = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname;

  return route || "/";
}

export function navigate(route: string, { replace = false } = {}) {
  window.history[replace ? "replaceState" : "pushState"](window.history.state, "", appHref(route));
  window.dispatchEvent(new PopStateEvent("popstate"));
}
