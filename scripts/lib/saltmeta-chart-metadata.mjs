const chartTypes = new Map([["dx", "DX"], ["sd", "STD"]]);
const difficulties = new Map([[0, "BASIC"], [1, "ADVANCED"], [2, "EXPERT"], [3, "MASTER"], [4, "Re:MASTER"]]);

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
    throw new Error(`SaltMeta chart metadata schema changed: ${context}.internalLevel must be a finite number between 0 and 20.`);
  }
  return value;
}

function level(value, context) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`SaltMeta chart metadata schema changed: ${context}.level must be a non-empty string.`);
  return value;
}

/** Indexes SaltMeta's region-aware chart data for the gallery's International catalog. */
export function indexSaltMetaChartMetadata(payload, { minimumSongs = 1_000, minimumCharts = 4_000 } = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("SaltMeta chart metadata schema changed: expected a JSON object.");
  if (!Array.isArray(payload.musics)) throw new Error("SaltMeta chart metadata schema changed: musics must be an array.");
  if (payload.musics.length < minimumSongs) throw new Error(`SaltMeta chart metadata coverage regressed: expected at least ${minimumSongs} songs, received ${payload.musics.length}.`);

  const charts = new Map();
  const chartsByTitle = new Map();
  let supportedCharts = 0;
  payload.musics.forEach((song, songIndex) => {
    const context = `musics[${songIndex}]`;
    if (!song || typeof song.title !== "string" || !song.title || typeof song.artist !== "string" || !Array.isArray(song.charts)) {
      throw new Error(`SaltMeta chart metadata schema changed: ${context} requires title, artist, and charts.`);
    }
    song.charts.forEach((sheet, sheetIndex) => {
      const sheetContext = `${context}.charts[${sheetIndex}]`;
      if (!sheet || typeof sheet.type !== "string") throw new Error(`SaltMeta chart metadata schema changed: ${sheetContext}.type must be a string.`);
      if (sheet.type === "utage") return;
      const chartType = chartTypes.get(sheet.type);
      const difficulty = difficulties.get(sheet.difficulty);
      if (!chartType || !difficulty) throw new Error(`SaltMeta chart metadata schema changed: unsupported chart type or difficulty at ${sheetContext}.`);
      const intl = sheet.regions?.intl;
      if (!intl || typeof intl !== "object") return;
      const metadata = {
        level: level(intl.level, `${sheetContext}.regions.intl`),
        chartConstant: exactConstant(intl.internalLevel, `${sheetContext}.regions.intl`),
        charter: typeof sheet.noteDesigner === "string" && sheet.noteDesigner !== "-" ? sheet.noteDesigner : null,
      };
      const key = chartKey(song.title, song.artist, chartType, difficulty);
      if (charts.has(key)) throw new Error(`SaltMeta chart metadata is ambiguous: duplicate chart for ${song.title} by ${song.artist} (${chartType} ${difficulty}).`);
      charts.set(key, metadata);
      const titleKey = titleChartKey(song.title, chartType, difficulty);
      const titleMatches = chartsByTitle.get(titleKey) ?? [];
      titleMatches.push(metadata);
      chartsByTitle.set(titleKey, titleMatches);
      supportedCharts += 1;
    });
  });
  if (supportedCharts < minimumCharts) throw new Error(`SaltMeta chart metadata coverage regressed: expected at least ${minimumCharts} International charts, received ${supportedCharts}.`);
  return {
    metadata(title, artist, chartType, difficulty) {
      const exact = charts.get(chartKey(title, artist, chartType, difficulty));
      if (exact) return exact;
      const matches = chartsByTitle.get(titleChartKey(title, chartType, difficulty)) ?? [];
      if (matches.length === 1) return matches[0];
      if (matches.length > 1) throw new Error(`SaltMeta chart metadata is ambiguous for ${title} (${chartType} ${difficulty}); artist did not resolve the match.`);
      return {};
    },
  };
}
