const judgmentNames = ["criticalPerfect", "perfect", "great", "good", "miss"];
const noteTypes = ["break", "tap", "hold", "slide", "touch"];

class ScoreValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ScoreValidationError";
    this.code = code;
    Object.assign(this, details);
  }
}

function finiteNumber(value, path, { integer = false, minimum, maximum } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ScoreValidationError("UNREADABLE_VALUE", `${path} is unreadable.`);
  }
  if (integer && !Number.isInteger(value)) {
    throw new ScoreValidationError("INVALID_VALUE", `${path} must be an integer.`);
  }
  if (minimum !== undefined && value < minimum) {
    throw new ScoreValidationError("INVALID_VALUE", `${path} must be at least ${minimum}.`);
  }
  if (maximum !== undefined && value > maximum) {
    throw new ScoreValidationError("INVALID_VALUE", `${path} must be at most ${maximum}.`);
  }
  return value;
}

function roundedAchievement(value) {
  return Number(value.toFixed(4));
}

function judgmentSet(values, path) {
  if (!values || typeof values !== "object") {
    throw new ScoreValidationError("UNREADABLE_VALUE", `${path} is unreadable.`);
  }
  const perfect = finiteNumber(values.perfect, `${path}.perfect`, { integer: true, minimum: 0 });
  return {
    criticalPerfect: values.criticalPerfect === null
      ? perfect
      : finiteNumber(values.criticalPerfect, `${path}.criticalPerfect`, { integer: true, minimum: 0 }),
    perfect,
    great: finiteNumber(values.great, `${path}.great`, { integer: true, minimum: 0 }),
    good: finiteNumber(values.good, `${path}.good`, { integer: true, minimum: 0 }),
    miss: finiteNumber(values.miss, `${path}.miss`, { integer: true, minimum: 0 }),
  };
}

function legacyCriticalPerfectLayout(rawBreakdown) {
  if (!rawBreakdown) return false;
  return ["tap", "hold", "slide", "touch"]
    .every((noteType) => rawBreakdown[noteType].criticalPerfect === null)
    && rawBreakdown.break.criticalPerfect !== null;
}

function derivedOverallJudgment(judgment, rawBreakdown, normalizedBreakdown) {
  if (!rawBreakdown || !normalizedBreakdown) {
    throw new ScoreValidationError(
      "UNREADABLE_VALUE",
      `judgments.${judgment} is unreadable and cannot be derived without a note-type breakdown.`,
    );
  }
  if (judgment === "criticalPerfect" && legacyCriticalPerfectLayout(rawBreakdown)) {
    return null;
  }
  const total = noteTypes.reduce((sum, noteType) => sum + normalizedBreakdown[noteType][judgment], 0);
  return total + (judgment === "perfect" && legacyCriticalPerfectLayout(rawBreakdown)
    ? normalizedBreakdown.break.criticalPerfect
    : 0);
}

function overallJudgmentSet(values, rawBreakdown, normalizedBreakdown) {
  if (!values || typeof values !== "object") {
    throw new ScoreValidationError("UNREADABLE_VALUE", "judgments is unreadable.");
  }
  const resolved = {};
  ["perfect", "great", "good", "miss"].forEach((judgment) => {
    resolved[judgment] = values[judgment] === null
      ? derivedOverallJudgment(judgment, rawBreakdown, normalizedBreakdown)
      : finiteNumber(values[judgment], `judgments.${judgment}`, { integer: true, minimum: 0 });
  });
  resolved.criticalPerfect = values.criticalPerfect === null
    ? rawBreakdown
      ? derivedOverallJudgment("criticalPerfect", rawBreakdown, normalizedBreakdown)
        ?? resolved.perfect
      : resolved.perfect
    : finiteNumber(values.criticalPerfect, "judgments.criticalPerfect", {
      integer: true,
      minimum: 0,
    });
  return {
    criticalPerfect: resolved.criticalPerfect,
    perfect: resolved.perfect,
    great: resolved.great,
    good: resolved.good,
    miss: resolved.miss,
  };
}

function validateJudgmentSums(raw, normalized) {
  if (!raw.judgmentsByType || !normalized.judgmentsByType) return;
  const legacyLayout = legacyCriticalPerfectLayout(raw.judgmentsByType);

  judgmentNames.forEach((judgment) => {
    const values = noteTypes.map((noteType) => raw.judgmentsByType[noteType][judgment]);
    if (raw.judgments[judgment] === null || values.some((value) => value === null)) return;
    const sum = values.reduce((total, value) => total + value, 0)
      + (legacyLayout && judgment === "perfect"
        ? raw.judgmentsByType.break.criticalPerfect
        : 0);
    if (sum !== normalized.judgments[judgment]) {
      throw new ScoreValidationError(
        "JUDGMENT_MISMATCH",
        `${judgment} note-type counts total ${sum}, but the overall count is ${normalized.judgments[judgment]}.`,
        { judgment, noteTypeTotal: sum, overallTotal: normalized.judgments[judgment] },
      );
    }
  });
}

export function proposedScoreRecord({ ocr, resolution, capturedAt }) {
  const judgmentsByType = ocr.judgmentsByType === null
    ? null
    : Object.fromEntries(noteTypes.map((noteType) => [
      noteType,
      judgmentSet(ocr.judgmentsByType?.[noteType], `judgmentsByType.${noteType}`),
    ]));
  const record = {
    playedAt: capturedAt,
    songTitle: resolution.canonicalTitle,
    chartType: resolution.chart.chartType,
    difficulty: resolution.chart.difficulty,
    level: resolution.chart.level,
    achievement: roundedAchievement(
      finiteNumber(ocr.achievement, "achievement", { minimum: 0, maximum: 101 }),
    ),
    combo: ocr.combo,
    sync: ocr.sync,
    rating: finiteNumber(ocr.rating, "rating", { integer: true, minimum: 0 }),
    // An absent or unreadable change means no recorded change.
    ratingChange: ocr.ratingChange === null
      ? 0
      : finiteNumber(ocr.ratingChange, "ratingChange", { integer: true }),
    judgments: overallJudgmentSet(ocr.judgments, ocr.judgmentsByType, judgmentsByType),
    judgmentsByType,
    fast: ocr.fast === null ? 0 : finiteNumber(ocr.fast, "fast", { integer: true, minimum: 0 }),
    slow: ocr.slow === null ? 0 : finiteNumber(ocr.slow, "slow", { integer: true, minimum: 0 }),
  };
  validateJudgmentSums(ocr, record);
  return record;
}
