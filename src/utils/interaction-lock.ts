export function lockPageInteraction() {
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
