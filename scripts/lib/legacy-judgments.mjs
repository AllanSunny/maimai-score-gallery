const combinedPerfectNoteTypes = ["tap", "hold", "slide", "touch"];

export function normalizeLegacyCopiedCriticalPerfects(score) {
  const breakdown = score?.judgmentsByType;
  if (!breakdown || !combinedPerfectNoteTypes.every((noteType) => {
    const values = breakdown[noteType];
    return values
      && values.criticalPerfect !== null
      && values.criticalPerfect === values.perfect;
  })) {
    return false;
  }

  combinedPerfectNoteTypes.forEach((noteType) => {
    breakdown[noteType].criticalPerfect = null;
  });
  if (score.judgments?.criticalPerfect === score.judgments?.perfect) {
    score.judgments.criticalPerfect = null;
  }
  return true;
}
