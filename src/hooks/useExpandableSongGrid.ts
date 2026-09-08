import { useRef, useState } from "react";
import { flushSync } from "react-dom";

const transitionDuration = 480;
const transitionEasing = "ease-in-out";

interface CardLayout {
  element: HTMLElement;
  rect: DOMRect;
  jacketRect?: DOMRect;
  jacketContainerRect?: DOMRect;
}

function cardRects() {
  return new Map<string, CardLayout>([...document.querySelectorAll<HTMLElement>("[data-song-key]")]
    .map((card) => [card.dataset.songKey!, {
      element: card,
      rect: card.getBoundingClientRect(),
      jacketRect: card.querySelector<HTMLElement>("[data-song-jacket]")?.getBoundingClientRect(),
      jacketContainerRect: card.querySelector<HTMLElement>("[data-song-jacket-container]")?.getBoundingClientRect(),
    }]));
}

function lockPageInteraction() {
  const shield = document.createElement("div");
  Object.assign(shield.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    touchAction: "none",
  });
  shield.setAttribute("aria-hidden", "true");

  const preventInteraction = (event: Event) => event.preventDefault();
  shield.addEventListener("wheel", preventInteraction, { passive: false });
  shield.addEventListener("touchmove", preventInteraction, { passive: false });
  document.addEventListener("keydown", preventInteraction, true);
  document.body.append(shield);

  return () => {
    shield.remove();
    document.removeEventListener("keydown", preventInteraction, true);
  };
}

function animateJacketLayout(
  card: HTMLElement,
  collapsing: boolean,
  previous: CardLayout,
  next: CardLayout,
) {
  const jacketContainer = card.querySelector<HTMLElement>("[data-song-jacket-container]");
  const jacket = card.querySelector<HTMLElement>("[data-song-jacket]");
  card.querySelector<HTMLElement>("[data-song-dismiss]")?.style.setProperty("display", "none");
  if (!jacketContainer || !jacket) return [];

  const containerStyle = getComputedStyle(jacketContainer);
  const jacketStyle = getComputedStyle(jacket);
  const padding = {
    top: Number.parseFloat(containerStyle.paddingTop),
    right: Number.parseFloat(containerStyle.paddingRight),
    bottom: Number.parseFloat(containerStyle.paddingBottom),
    left: Number.parseFloat(containerStyle.paddingLeft),
  };
  const marginTop = Number.parseFloat(jacketStyle.marginTop);
  const expandedContainerRect = collapsing ? previous.jacketContainerRect : next.jacketContainerRect;
  const expandedJacketRect = collapsing ? previous.jacketRect : next.jacketRect;
  const centeredOffset = expandedContainerRect && expandedJacketRect
    ? Math.max(0, expandedJacketRect.top - expandedContainerRect.top - padding.top - marginTop)
    : 0;
  jacketContainer.style.alignContent = "start";
  const paddedLayout = {
    paddingTop: `${padding.top}px`,
    paddingRight: `${padding.right}px`,
    paddingBottom: `${padding.bottom}px`,
    paddingLeft: `${padding.left}px`,
  };
  const spacedLayout = {
    marginTop: jacketStyle.marginTop,
    marginBottom: jacketStyle.marginBottom,
  };
  const flushLayout = {
    paddingTop: "0",
    paddingRight: "0",
    paddingBottom: "0",
    paddingLeft: "0",
  };
  const flushVerticalLayout = {
    marginTop: "0",
    marginBottom: "0",
  };
  const options: KeyframeAnimationOptions = {
    duration: transitionDuration,
    easing: transitionEasing,
    fill: "forwards",
  };
  const growingHeight = collapsing
    ? previous.rect.height - next.rect.height
    : next.rect.height - previous.rect.height;
  const expandedJacketHeight = collapsing ? previous.jacketRect?.height : next.jacketRect?.height;
  const collapsedCardHeight = collapsing ? next.rect.height : previous.rect.height;
  const requiredGrowth = Math.max(0, (expandedJacketHeight ?? 0) - collapsedCardHeight);
  const spacingOffset = window.matchMedia("(min-width: 768px)").matches
    ? 0
    : growingHeight > 0
    ? Math.min(0.8, Math.max(0, requiredGrowth / growingHeight))
    : 0;
  const paddingFrames = collapsing
    ? [paddedLayout, { ...flushLayout, offset: 1 - spacingOffset }, flushLayout]
    : [flushLayout, { ...flushLayout, offset: spacingOffset }, paddedLayout];
  const spacingFrames = collapsing
    ? [spacedLayout, { ...flushVerticalLayout, offset: 1 - spacingOffset }, flushVerticalLayout]
    : [flushVerticalLayout, { ...flushVerticalLayout, offset: spacingOffset }, spacedLayout];
  const previousScale = previous.jacketRect && next.jacketRect
    ? `scale(${previous.jacketRect.width / next.jacketRect.width}, ${previous.jacketRect.height / next.jacketRect.height})`
    : "scale(1)";
  const nextScale = previous.jacketRect && next.jacketRect
    ? `scale(${next.jacketRect.width / previous.jacketRect.width}, ${next.jacketRect.height / previous.jacketRect.height})`
    : "scale(1)";
  jacket.style.transformOrigin = "top left";
  const expandedTransform = `translateY(${centeredOffset}px) scale(1)`;
  const collapsedTransform = collapsing
    ? `translateY(0) ${nextScale}`
    : `translateY(0) ${previousScale}`;

  return [
    jacketContainer.animate(paddingFrames, options),
    jacket.animate(spacingFrames, options),
    jacket.animate(collapsing
      ? [{ transform: expandedTransform }, { transform: collapsedTransform }]
      : [{ transform: collapsedTransform }, { transform: expandedTransform }], options),
  ];
}

async function runCardTransition(update: () => void, changingSongKeys: string[]) {
  const before = cardRects();
  const oldCopies = new Map(changingSongKeys.flatMap((songKey) => {
    const card = before.get(songKey)?.element;
    return card?.dataset.songExpanded === "true"
      ? [[songKey, card.cloneNode(true) as HTMLElement] as const]
      : [];
  }));

  flushSync(update);

  const after = cardRects();
  const animations: Animation[] = [];
  const hiddenCards: HTMLElement[] = [];
  const copies: HTMLElement[] = [];
  const unlockPageInteraction = lockPageInteraction();

  after.forEach(({ element, rect }, songKey) => {
    const previous = before.get(songKey);
    if (!previous || changingSongKeys.includes(songKey)) return;

    const x = previous.rect.left - rect.left;
    const y = previous.rect.top - rect.top;
    if (x === 0 && y === 0) return;

    animations.push(element.animate(
      [{ transform: `translate(${x}px, ${y}px)` }, { transform: "translate(0, 0)" }],
      { duration: transitionDuration, easing: transitionEasing },
    ));
  });

  changingSongKeys.forEach((songKey, index) => {
    const previous = before.get(songKey);
    const next = after.get(songKey);
    if (!previous || !next) return;

    const collapsing = oldCopies.has(songKey);
    const copy = oldCopies.get(songKey) ?? next.element.cloneNode(true) as HTMLElement;
    Object.assign(copy.style, {
      position: "fixed",
      top: `${previous.rect.top}px`,
      left: `${previous.rect.left}px`,
      width: `${previous.rect.width}px`,
      height: `${previous.rect.height}px`,
      margin: "0",
      pointerEvents: "none",
      zIndex: `${1000 + index}`,
    });
    copy.setAttribute("aria-hidden", "true");
    document.body.append(copy);
    copies.push(copy);
    animations.push(...animateJacketLayout(
      copy,
      collapsing,
      previous,
      next,
    ));

    next.element.style.visibility = "hidden";
    hiddenCards.push(next.element);
    animations.push(copy.animate(
      [
        {
          top: `${previous.rect.top}px`,
          left: `${previous.rect.left}px`,
          width: `${previous.rect.width}px`,
          height: `${previous.rect.height}px`,
        },
        {
          top: `${next.rect.top}px`,
          left: `${next.rect.left}px`,
          width: `${next.rect.width}px`,
          height: `${next.rect.height}px`,
        },
      ],
      { duration: transitionDuration, easing: transitionEasing, fill: "forwards" },
    ));
  });

  try {
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
  } finally {
    copies.forEach((copy) => copy.remove());
    hiddenCards.forEach((card) => card.style.removeProperty("visibility"));
    unlockPageInteraction();
  }
}

export function useExpandableSongGrid() {
  const [expandedSongKey, setExpandedSongKey] = useState<string | null>(null);
  const isChangingSelection = useRef(false);

  async function selectSong(songKey: string) {
    if (isChangingSelection.current) return;
    isChangingSelection.current = true;

    try {
      if (expandedSongKey === songKey) {
        await runCardTransition(() => setExpandedSongKey(null), [songKey]);
        return;
      }

      const changingSongKeys = expandedSongKey ? [expandedSongKey, songKey] : [songKey];
      await runCardTransition(() => setExpandedSongKey(songKey), changingSongKeys);
      if (!window.matchMedia("(min-width: 768px)").matches) {
        cardRects().get(songKey)?.element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    } finally {
      isChangingSelection.current = false;
    }
  }

  return {
    expandedSongKey,
    selectSong,
    collapseSong: () => setExpandedSongKey(null),
  };
}
