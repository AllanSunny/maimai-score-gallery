import { lockPageInteraction } from "./interaction-lock";
import { isLargeViewport } from "./responsive";

const smoothScrollDuration = 400;
const largeViewportExpandableItemTop = 0.25;
let activeScrollFrame = 0;
let unlockScrollInteraction: (() => void) | null = null;

interface ScrollToElementOptions {
  viewportTop?: number;
}

export function scrollToElement(element: HTMLElement, { viewportTop = 0 }: ScrollToElementOptions = {}) {
  window.cancelAnimationFrame(activeScrollFrame);
  activeScrollFrame = 0;
  unlockScrollInteraction?.();
  unlockScrollInteraction = null;

  const start = window.scrollY;
  const scrollMarginTop = viewportTop === 0
    ? Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0
    : 0;
  const target = start + element.getBoundingClientRect().top
    - window.innerHeight * viewportTop
    - scrollMarginTop;
  const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const destination = Math.min(maximum, Math.max(0, target));
  const distance = destination - start;
  if (Math.abs(distance) < 0.5) return;

  let startedAt: number | undefined;
  unlockScrollInteraction = lockPageInteraction();

  function scrollFrame(timestamp: number) {
    startedAt ??= timestamp;
    const progress = Math.min(1, (timestamp - startedAt) / smoothScrollDuration);
    const easedProgress = 1 - (1 - progress) ** 3;
    window.scrollTo(0, start + distance * easedProgress);
    if (progress < 1) {
      activeScrollFrame = window.requestAnimationFrame(scrollFrame);
      return;
    }

    activeScrollFrame = 0;
    unlockScrollInteraction?.();
    unlockScrollInteraction = null;
  }

  activeScrollFrame = window.requestAnimationFrame(scrollFrame);
}

export function scrollToExpandableItem(element: HTMLElement) {
  scrollToElement(element, {
    viewportTop: isLargeViewport() ? largeViewportExpandableItemTop : 0,
  });
}
