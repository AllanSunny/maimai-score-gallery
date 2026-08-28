export function derivedComboStatus({ achievement, judgments, fallback = null }) {
  if (achievement === 101) return "AP+";
  if (!judgments) return fallback;
  if (judgments.miss !== 0) return null;
  if (judgments.great === 0 && judgments.good === 0) return "AP";
  if (judgments.good === 0) return "FC+";
  return "FC";
}
