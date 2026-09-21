import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { navigate } from "../utils/navigation";
import { scrollToExpandableItem } from "../utils/scroll";
import { lockPageInteraction } from "../utils/interaction-lock";

const scoreHistoryTransitionDuration = 360;
const scoreHistoryTransitionEasing = "ease-in-out";
const transitionFallbackBuffer = 50;

export interface ScoreHistoryTransitionTiming {
  duration: number;
  easing: string;
}

const scoreHistoryTransitionTiming: ScoreHistoryTransitionTiming = {
  duration: scoreHistoryTransitionDuration,
  easing: scoreHistoryTransitionEasing,
};

function findScoreEntry(scoreId: string) {
  return document.querySelector<HTMLElement>(
    `[data-score-id="${CSS.escape(scoreId)}"]`,
  );
}

function waitForScoreTransition(scoreId: string) {
  const detailsElement = findScoreEntry(scoreId)?.querySelector<HTMLElement>(
    "[data-score-details]",
  );
  if (!detailsElement) return Promise.resolve();
  const transitionElement = detailsElement;

  return new Promise<void>((resolve) => {
    const fallback = window.setTimeout(
      finish,
      scoreHistoryTransitionDuration + transitionFallbackBuffer,
    );

    function finish(event?: TransitionEvent) {
      if (
        event &&
        (event.target !== transitionElement || event.propertyName !== "grid-template-rows")
      ) {
        return;
      }
      window.clearTimeout(fallback);
      transitionElement.removeEventListener("transitionend", finish);
      resolve();
    }

    transitionElement.addEventListener("transitionend", finish);
  });
}

async function runScoreTransition(update: () => void, scoreId: string) {
  const unlockPageInteraction = lockPageInteraction();

  try {
    flushSync(update);
    await waitForScoreTransition(scoreId);
  } finally {
    unlockPageInteraction();
  }
}

export function useExpandableScoreHistory(
  chartRoute: string,
  activeScoreId?: string,
) {
  const isChangingSelection = useRef(false);

  useEffect(() => {
    if (!activeScoreId || isChangingSelection.current) return;

    const animationFrame = window.requestAnimationFrame(() => {
      const activeEntry = findScoreEntry(activeScoreId);
      if (activeEntry) scrollToExpandableItem(activeEntry);
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeScoreId]);

  async function selectScore(scoreId: string) {
    if (isChangingSelection.current) return;
    isChangingSelection.current = true;

    try {
      if (activeScoreId) {
        await runScoreTransition(
          () => navigate(chartRoute, { replace: true }),
          activeScoreId,
        );
        if (activeScoreId === scoreId) return;
      }

      await runScoreTransition(() => {
        navigate(`${chartRoute}#${encodeURIComponent(scoreId)}`, { replace: true });
      }, scoreId);
      const selectedEntry = findScoreEntry(scoreId);
      if (selectedEntry) scrollToExpandableItem(selectedEntry);
    } finally {
      isChangingSelection.current = false;
    }
  }

  return {
    selectScore,
    transitionTiming: scoreHistoryTransitionTiming,
  };
}
