import { useEffect, useRef } from "react";

interface DismissibleElement {
  dismiss: () => void;
  element: HTMLElement;
}

const dismissibleElements = new Set<DismissibleElement>();
let listening = false;

function handlePointerDown(event: PointerEvent) {
  dismissibleElements.forEach(({ dismiss, element }) => {
    if (!element.contains(event.target as Node)) dismiss();
  });
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape") dismissibleElements.forEach(({ dismiss }) => dismiss());
}

function startListening() {
  if (listening) return;
  document.addEventListener("pointerdown", handlePointerDown);
  document.addEventListener("keydown", handleKeyDown);
  listening = true;
}

function stopListening() {
  if (!listening || dismissibleElements.size > 0) return;
  document.removeEventListener("pointerdown", handlePointerDown);
  document.removeEventListener("keydown", handleKeyDown);
  listening = false;
}

export function useOutsideDismissal<T extends HTMLElement>(onDismiss: (element: T) => void) {
  const elementRef = useRef<T>(null);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const dismissible = {
      element,
      dismiss: () => onDismissRef.current(element),
    };
    dismissibleElements.add(dismissible);
    startListening();
    return () => {
      dismissibleElements.delete(dismissible);
      stopListening();
    };
  }, []);

  return elementRef;
}
