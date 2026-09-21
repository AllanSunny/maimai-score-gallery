export function isMediumViewport() {
  return getComputedStyle(document.documentElement).getPropertyValue("--medium-viewport").trim() === "1";
}

export function isLargeViewport() {
  return getComputedStyle(document.documentElement).getPropertyValue("--large-viewport").trim() === "1";
}
