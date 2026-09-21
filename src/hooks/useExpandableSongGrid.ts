import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  animateLayoutBounds,
  animateLayoutMovement,
  finishLayoutAnimations,
  layoutTransitionTiming,
} from "../utils/layout-transitions";
import { lockPageInteraction } from "../utils/interaction-lock";
import { scrollToExpandableItem } from "../utils/scroll";
import { isLargeViewport, isMediumViewport } from "../utils/responsive";
const upwardExpansionViewportThreshold = 0.6;

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
    ...layoutTransitionTiming,
    fill: "forwards",
  };
  const growingHeight = collapsing
    ? previous.rect.height - next.rect.height
    : next.rect.height - previous.rect.height;
  const expandedJacketHeight = collapsing ? previous.jacketRect?.height : next.jacketRect?.height;
  const collapsedCardHeight = collapsing ? next.rect.height : previous.rect.height;
  const requiredGrowth = Math.max(0, (expandedJacketHeight ?? 0) - collapsedCardHeight);
  const spacingOffset = isMediumViewport()
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

async function runCardTransition(
  update: () => void,
  changingSongKeys: string[],
  upwardExpansionSongKey?: string,
) {
  const before = cardRects();
  const oldCopies = new Map(changingSongKeys.flatMap((songKey) => {
    const card = before.get(songKey)?.element;
    return card?.dataset.songExpanded === "true"
      ? [[songKey, card.cloneNode(true) as HTMLElement] as const]
      : [];
  }));

  const previousOverflowAnchor = document.documentElement.style.overflowAnchor;
  document.documentElement.style.overflowAnchor = "none";

  try {
    flushSync(update);
  } catch (error) {
    document.documentElement.style.overflowAnchor = previousOverflowAnchor;
    throw error;
  }

  if (upwardExpansionSongKey) {
    const previous = before.get(upwardExpansionSongKey);
    const placeholder = document.querySelector<HTMLElement>(
      `[data-song-placeholder-key="${CSS.escape(upwardExpansionSongKey)}"]`,
    );
    if (previous && placeholder) {
      window.scrollBy(0, placeholder.getBoundingClientRect().top - previous.rect.top);
    }
  }

  const after = cardRects();
  const animations: Animation[] = [];
  const hiddenCards: HTMLElement[] = [];
  const copies: HTMLElement[] = [];
  const unlockPageInteraction = lockPageInteraction();

  after.forEach(({ element, rect }, songKey) => {
    const previous = before.get(songKey);
    if (!previous || changingSongKeys.includes(songKey)) return;

    const animation = animateLayoutMovement(element, previous.rect, rect);
    if (animation) animations.push(animation);
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
    animations.push(animateLayoutBounds(copy, previous.rect, next.rect));
  });

  try {
    await finishLayoutAnimations(animations);
  } finally {
    copies.forEach((copy) => copy.remove());
    hiddenCards.forEach((card) => card.style.removeProperty("visibility"));
    document.documentElement.style.overflowAnchor = previousOverflowAnchor;
    unlockPageInteraction();
  }
}

export function useExpandableSongGrid() {
  const [expandedSongKey, setExpandedSongKey] = useState<string | null>(null);
  const [expansionDirection, setExpansionDirection] = useState<"up" | "down">("down");
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
      const selectedCardRect = cardRects().get(songKey)?.rect;
      const nextExpansionDirection = isLargeViewport() && selectedCardRect
        && selectedCardRect.top + selectedCardRect.height / 2
          > window.innerHeight * upwardExpansionViewportThreshold
        ? "up"
        : "down";
      await runCardTransition(() => {
        setExpansionDirection(nextExpansionDirection);
        setExpandedSongKey(songKey);
      }, changingSongKeys, !expandedSongKey && nextExpansionDirection === "up" ? songKey : undefined);
      const selectedCard = cardRects().get(songKey)?.element;
      if (selectedCard) scrollToExpandableItem(selectedCard);
    } finally {
      isChangingSelection.current = false;
    }
  }

  return {
    expandedSongKey,
    expansionDirection,
    selectSong,
    collapseSong: () => setExpandedSongKey(null),
  };
}
