import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useResponsiveGridColumns } from "./useResponsiveGridColumns";

const transitionDuration = 480;
const transitionEasing = "ease-in-out";

function visibleCardRects() {
  return new Map([...document.querySelectorAll<HTMLElement>("[data-song-key]")]
    .filter((card) => {
      const rect = card.getBoundingClientRect();
      return rect.bottom >= 0 && rect.top <= window.innerHeight;
    })
    .map((card) => [card.dataset.songKey!, {
      element: card,
      rect: card.getBoundingClientRect(),
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

async function runCardTransition(update: () => void, changingSongKeys: string[]) {
  const before = visibleCardRects();
  const oldCopies = new Map(changingSongKeys.flatMap((songKey) => {
    const card = before.get(songKey)?.element;
    return card?.dataset.songExpanded === "true"
      ? [[songKey, card.cloneNode(true) as HTMLElement] as const]
      : [];
  }));

  flushSync(update);

  const after = visibleCardRects();
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
  const { gridRef, gridColumnCount } = useResponsiveGridColumns(2);
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
    } finally {
      isChangingSelection.current = false;
    }
  }

  return {
    expandedSongKey,
    gridRef,
    gridColumnCount,
    selectSong,
    collapseSong: () => setExpandedSongKey(null),
  };
}
