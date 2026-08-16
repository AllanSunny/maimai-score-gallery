const judgmentHeaders = {
  "Critical Perfect": "criticalPerfect",
  Perfect: "perfect",
  Great: "great",
  Good: "good",
  Miss: "miss",
};

const noteTypeHeaders = {
  Breaks: "break",
  Taps: "tap",
  Holds: "hold",
  Slides: "slide",
  Touches: "touch",
};

function correctedCount(value, header) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${header} must be a non-negative integer.`);
  }
  return parsed;
}

export function applyReviewCorrections(score, review) {
  if (!review) return score;
  const corrected = structuredClone(score);
  if (review.correctedTitle) {
    corrected.visibleTitle = review.correctedTitle;
    corrected.titleTruncated = false;
  }
  if (review.correctedArtist) corrected.visibleArtist = review.correctedArtist;
  if (review.correctedRatingChange !== ""
    && review.correctedRatingChange !== null
    && review.correctedRatingChange !== undefined) {
    const ratingChange = Number(review.correctedRatingChange);
    if (!Number.isInteger(ratingChange)) throw new Error("Corrected Rating Change must be an integer.");
    corrected.ratingChange = ratingChange;
  }

  Object.entries(judgmentHeaders).forEach(([label, judgment]) => {
    const header = `Corrected ${label}`;
    const count = correctedCount(review.correctedJudgments?.[header], header);
    if (count !== null) corrected.judgments[judgment] = count;
  });
  Object.entries(noteTypeHeaders).forEach(([noteTypeLabel, noteType]) => {
    Object.entries(judgmentHeaders).forEach(([judgmentLabel, judgment]) => {
      const header = `Corrected ${judgmentLabel} ${noteTypeLabel}`;
      const count = correctedCount(review.correctedJudgments?.[header], header);
      if (count !== null) {
        corrected.judgmentsByType ??= {};
        corrected.judgmentsByType[noteType] ??= {
          criticalPerfect: null,
          perfect: null,
          great: null,
          good: null,
          miss: null,
        };
        corrected.judgmentsByType[noteType][judgment] = count;
      }
    });
  });
  return corrected;
}
