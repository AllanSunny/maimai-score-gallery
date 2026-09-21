export const layoutTransitionTiming: KeyframeAnimationOptions = {
  duration: 480,
  easing: "ease-in-out",
};

export function animateLayoutMovement(
  element: HTMLElement,
  previous: DOMRect,
  next: DOMRect,
  timing: KeyframeAnimationOptions = layoutTransitionTiming,
) {
  const x = previous.left - next.left;
  const y = previous.top - next.top;
  if (x === 0 && y === 0) return null;

  return element.animate(
    [{ transform: `translate(${x}px, ${y}px)` }, { transform: "translate(0, 0)" }],
    timing,
  );
}

export function animateLayoutBounds(
  element: HTMLElement,
  previous: DOMRect,
  next: DOMRect,
  additionalFrames: [Keyframe, Keyframe] = [{}, {}],
  timing: KeyframeAnimationOptions = layoutTransitionTiming,
) {
  return element.animate(
    [
      {
        top: `${previous.top}px`,
        left: `${previous.left}px`,
        width: `${previous.width}px`,
        height: `${previous.height}px`,
        ...additionalFrames[0],
      },
      {
        top: `${next.top}px`,
        left: `${next.left}px`,
        width: `${next.width}px`,
        height: `${next.height}px`,
        ...additionalFrames[1],
      },
    ],
    { ...timing, fill: "forwards" },
  );
}

export async function finishLayoutAnimations(animations: Animation[]) {
  await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
}
