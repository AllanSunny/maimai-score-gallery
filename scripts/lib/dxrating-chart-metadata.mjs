const chartTypes = new Map([
  ["dx", "DX"],
  ["std", "STD"],
]);

const difficulties = new Map([
  ["basic", "BASIC"],
  ["advanced", "ADVANCED"],
  ["expert", "EXPERT"],
  ["master", "MASTER"],
  ["remaster", "Re:MASTER"],
]);

function normalize(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function chartKey(title, artist, chartType, difficulty) {
  return `${normalize(title)}|${normalize(artist)}|${chartType}|${difficulty}`;
}

function titleChartKey(title, chartType, difficulty) {
  return `${normalize(title)}|${chartType}|${difficulty}`;
}

function exactConstant(value, context) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value >= 20) {
    throw new Error(`DXRating chart metadata schema changed: ${context}.internalLevelValue must be a finite number between 0 and 20.`);
  }
  return value;
}

function displayLevel(value, context) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`DXRating chart metadata schema changed: ${context}.level must be a non-empty string.`);
  }
  return value.trim();
}

export function indexDxRatingChartMetadata(payload, { minimumSongs = 1_000, minimumCharts = 4_000 } = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("DXRating chart metadata schema changed: expected a JSON object.");
  }
  if (!Array.isArray(payload.songs)) {
    throw new Error("DXRating chart metadata schema changed: songs must be an array.");
  }
  if (payload.songs.length < minimumSongs) {
    throw new Error(`DXRating chart metadata coverage regressed: expected at least ${minimumSongs} songs, received ${payload.songs.length}.`);
  }

  const charts = new Map();
  const chartsByTitle = new Map();
  let supportedCharts = 0;

  payload.songs.forEach((song, songIndex) => {
    const context = `songs[${songIndex}]`;
    if (!song || typeof song !== "object" || typeof song.title !== "string" || song.title.length === 0
      || !Array.isArray(song.sheets)) {
      throw new Error(`DXRating chart metadata schema changed: ${context} requires a title and sheets.`);
    }
    const artist = String(song.artist ?? "");

    song.sheets.forEach((sheet, sheetIndex) => {
      const sheetContext = `${context}.sheets[${sheetIndex}]`;
      if (!sheet || typeof sheet !== "object" || typeof sheet.type !== "string") {
        throw new Error(`DXRating chart metadata schema changed: ${sheetContext}.type must be a string.`);
      }
      if (sheet.type.startsWith("utage") || sheet.isSpecial === true || sheet.regions?.intl === false) return;
      const chartType = chartTypes.get(sheet.type);
      const difficulty = difficulties.get(sheet.difficulty);
      if (!chartType || !difficulty) {
        throw new Error(`DXRating chart metadata schema changed: unsupported chart type or difficulty at ${sheetContext}.`);
      }

      const rawCharter = String(sheet.noteDesigner ?? "").trim();
      const metadata = {
        level: displayLevel(sheet.level, sheetContext),
        chartConstant: exactConstant(sheet.internalLevelValue, sheetContext),
        charter: rawCharter && rawCharter !== "-" ? rawCharter : null,
      };
      const key = chartKey(song.title, artist, chartType, difficulty);
      if (charts.has(key)) {
        throw new Error(`DXRating chart metadata is ambiguous: duplicate chart for ${song.title} by ${artist} (${chartType} ${difficulty}).`);
      }
      charts.set(key, metadata);
      const titleKey = titleChartKey(song.title, chartType, difficulty);
      const titleMatches = chartsByTitle.get(titleKey) ?? [];
      titleMatches.push(metadata);
      chartsByTitle.set(titleKey, titleMatches);
      supportedCharts += 1;
    });
  });

  if (supportedCharts < minimumCharts) {
    throw new Error(`DXRating chart metadata coverage regressed: expected at least ${minimumCharts} International charts, received ${supportedCharts}.`);
  }

  return {
    metadata(title, artist, chartType, difficulty) {
      const exact = charts.get(chartKey(title, artist, chartType, difficulty));
      if (exact) return exact;
      const matches = chartsByTitle.get(titleChartKey(title, chartType, difficulty)) ?? [];
      if (matches.length === 1) return matches[0];
      if (matches.length > 1) {
        throw new Error(`DXRating chart metadata is ambiguous for ${title} (${chartType} ${difficulty}); artist did not resolve the match.`);
      }
      return {};
    },
  };
}
