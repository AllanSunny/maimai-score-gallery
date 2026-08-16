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

function blank(value) {
  return value === "" || value === null || value === undefined;
}

function correctedNumber(value, header, { integer = false, minimum, maximum } = {}) {
  if (blank(value)) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)
    || (integer && !Number.isInteger(parsed))
    || (minimum !== undefined && parsed < minimum)
    || (maximum !== undefined && parsed > maximum)) {
    throw new Error(`${header} is invalid.`);
  }
  return parsed;
}

function roundedAchievement(value) {
  return Number(value.toFixed(4));
}

function correctedChoice(value, header, choices) {
  if (blank(value)) return null;
  const match = choices.find((choice) => choice.toLocaleLowerCase() === String(value).trim().toLocaleLowerCase());
  if (!match) throw new Error(`${header} must be one of: ${choices.join(", ")}.`);
  return match;
}

function correctedValue(review, header) {
  return review?.correctedScoreFields?.[header];
}

function correctedBreakdown(review) {
  const values = review?.correctedJudgments ?? {};
  const noteHeaders = Object.keys(noteTypeHeaders).flatMap((noteType) =>
    Object.keys(judgmentHeaders).map((judgment) => `Corrected ${judgment} ${noteType}`));
  if (noteHeaders.every((header) => blank(values[header]))) return null;
  const requiredHeaders = Object.keys(noteTypeHeaders).flatMap((noteType) =>
    ["Perfect", "Great", "Good", "Miss"].map((judgment) => `Corrected ${judgment} ${noteType}`));
  if (requiredHeaders.some((header) => blank(values[header]))) return undefined;
  return Object.fromEntries(Object.entries(noteTypeHeaders).map(([noteTypeLabel, noteType]) => [
    noteType,
    Object.fromEntries(Object.entries(judgmentHeaders).map(([judgmentLabel, judgment]) => {
      const header = `Corrected ${judgmentLabel} ${noteTypeLabel}`;
      return [judgment, correctedCount(values[header], header)];
    })),
  ]));
}

export function manualScoreFromReview(review) {
  if (!review?.correctedTitle) return null;
  const fields = review.correctedScoreFields ?? {};
  const requiredHeaders = [
    "Corrected Chart Type",
    "Corrected Difficulty",
    "Corrected Achievement %",
    "Corrected Combo Status",
    "Corrected Sync Status",
    "Corrected Rating",
  ];
  const requiredJudgments = ["Perfect", "Great", "Good", "Miss"]
    .map((judgment) => `Corrected ${judgment}`);
  if (requiredHeaders.some((header) => blank(fields[header]))
    || requiredJudgments.some((header) => blank(review.correctedJudgments?.[header]))) return null;
  const judgmentsByType = correctedBreakdown(review);
  if (judgmentsByType === undefined) return null;
  const perfect = correctedCount(review.correctedJudgments["Corrected Perfect"], "Corrected Perfect");
  return {
    visibleTitle: review.correctedTitle,
    visibleArtist: review.correctedArtist || null,
    titleTruncated: false,
    chartType: correctedChoice(fields["Corrected Chart Type"], "Corrected Chart Type", ["DX", "STD", "UTAGE"]),
    difficulty: correctedChoice(fields["Corrected Difficulty"], "Corrected Difficulty", [
      "BASIC", "ADVANCED", "EXPERT", "MASTER", "Re:MASTER",
    ]),
    level: String(fields["Corrected Chart Level"] ?? "").trim(),
    achievement: roundedAchievement(
      correctedNumber(fields["Corrected Achievement %"], "Corrected Achievement %", {
        minimum: 0,
        maximum: 101,
      }),
    ),
    combo: correctedChoice(fields["Corrected Combo Status"], "Corrected Combo Status", [
      "AP+", "AP", "FC+", "FC", "Clear",
    ]),
    sync: correctedChoice(fields["Corrected Sync Status"], "Corrected Sync Status", [
      "None", "FS", "FS+", "FDX", "FDX+",
    ]),
    rating: correctedNumber(fields["Corrected Rating"], "Corrected Rating", { integer: true, minimum: 0 }),
    ratingChange: correctedNumber(fields["Corrected Rating Change"], "Corrected Rating Change", { integer: true }) ?? 0,
    judgments: Object.fromEntries(Object.entries(judgmentHeaders).map(([label, judgment]) => {
      const header = `Corrected ${label}`;
      const count = correctedCount(review.correctedJudgments?.[header], header);
      return [judgment, count ?? perfect];
    })),
    judgmentsByType,
    fast: correctedNumber(fields["Corrected Fast"], "Corrected Fast", { integer: true, minimum: 0 }) ?? 0,
    slow: correctedNumber(fields["Corrected Slow"], "Corrected Slow", { integer: true, minimum: 0 }) ?? 0,
  };
}

export function applyReviewCorrections(score, review) {
  if (!review) return score;
  const corrected = structuredClone(score);
  if (review.correctedTitle) {
    corrected.visibleTitle = review.correctedTitle;
    corrected.titleTruncated = false;
  }
  if (review.correctedArtist) corrected.visibleArtist = review.correctedArtist;
  const fields = review.correctedScoreFields ?? {};
  const chartType = correctedChoice(fields["Corrected Chart Type"], "Corrected Chart Type", ["DX", "STD", "UTAGE"]);
  const difficulty = correctedChoice(fields["Corrected Difficulty"], "Corrected Difficulty", [
    "BASIC", "ADVANCED", "EXPERT", "MASTER", "Re:MASTER",
  ]);
  const combo = correctedChoice(fields["Corrected Combo Status"], "Corrected Combo Status", [
    "AP+", "AP", "FC+", "FC", "Clear",
  ]);
  const sync = correctedChoice(fields["Corrected Sync Status"], "Corrected Sync Status", [
    "None", "FS", "FS+", "FDX", "FDX+",
  ]);
  if (chartType) corrected.chartType = chartType;
  if (difficulty) corrected.difficulty = difficulty;
  if (!blank(fields["Corrected Chart Level"])) corrected.level = String(fields["Corrected Chart Level"]).trim();
  if (combo) corrected.combo = combo;
  if (sync) corrected.sync = sync;
  const numericCorrections = [
    ["Corrected Achievement %", "achievement", { minimum: 0, maximum: 101 }],
    ["Corrected Rating", "rating", { integer: true, minimum: 0 }],
    ["Corrected Rating Change", "ratingChange", { integer: true }],
    ["Corrected Fast", "fast", { integer: true, minimum: 0 }],
    ["Corrected Slow", "slow", { integer: true, minimum: 0 }],
  ];
  numericCorrections.forEach(([header, field, options]) => {
    const value = correctedNumber(fields[header], header, options);
    if (value !== null) corrected[field] = field === "achievement" ? roundedAchievement(value) : value;
  });

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
