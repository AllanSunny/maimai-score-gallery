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

function songKey(title, artist) {
  return `${normalize(title)}|${normalize(artist)}`;
}

function chartKey(title, artist, chartType, difficulty) {
  return `${songKey(title, artist)}|${chartType}|${difficulty}`;
}

function titleChartKey(title, chartType, difficulty) {
  return `${normalize(title)}|${chartType}|${difficulty}`;
}

function exactConstant(value, context) {
  if (value === null) return null;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`Supplemental chart metadata schema changed: ${context}.internalLevel must be a number, numeric string, or null.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 20) {
    throw new Error(`Supplemental chart metadata schema changed: ${context}.internalLevel is invalid.`);
  }
  return parsed;
}

export function indexZetarakuChartMetadata(payload, { minimumSongs = 1_000, minimumCharts = 4_000 } = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Supplemental chart metadata schema changed: expected a JSON object.");
  }
  if (!Array.isArray(payload.songs)) {
    throw new Error("Supplemental chart metadata schema changed: songs must be an array.");
  }
  if (typeof payload.updateTime !== "string" || !Number.isFinite(Date.parse(payload.updateTime))) {
    throw new Error("Supplemental chart metadata schema changed: updateTime must be an ISO timestamp.");
  }
  if (payload.songs.length < minimumSongs) {
    throw new Error(`Supplemental chart metadata coverage regressed: expected at least ${minimumSongs} songs, received ${payload.songs.length}.`);
  }

  const charts = new Map();
  const chartsByTitle = new Map();
  let supportedChartCount = 0;
  payload.songs.forEach((song, songIndex) => {
    const context = `songs[${songIndex}]`;
    if (!song || typeof song !== "object" || typeof song.title !== "string" || song.title.length === 0) {
      throw new Error(`Supplemental chart metadata schema changed: ${context}.title must be a non-empty string.`);
    }
    if (!Array.isArray(song.sheets)) {
      throw new Error(`Supplemental chart metadata schema changed: ${context}.sheets must be an array.`);
    }

    song.sheets.forEach((sheet, sheetIndex) => {
      const sheetContext = `${context}.sheets[${sheetIndex}]`;
      if (!sheet || typeof sheet !== "object" || typeof sheet.type !== "string") {
        throw new Error(`Supplemental chart metadata schema changed: ${sheetContext}.type must be a string.`);
      }
      if (sheet.type === "utage") return;
      if (typeof song.artist !== "string") {
        throw new Error(`Supplemental chart metadata schema changed: ${context}.artist must be a string.`);
      }
      const chartType = chartTypes.get(sheet.type);
      const difficulty = difficulties.get(sheet.difficulty);
      if (!chartType || !difficulty) {
        throw new Error(`Supplemental chart metadata schema changed: unsupported chart type or difficulty at ${sheetContext}.`);
      }
      const rawCharter = String(sheet.noteDesigner ?? "").trim();
      const metadata = {
        chartConstant: exactConstant(sheet.internalLevel, sheetContext),
        charter: rawCharter && rawCharter !== "-" ? rawCharter : null,
      };
      const key = chartKey(song.title, song.artist, chartType, difficulty);
      if (charts.has(key)) {
        throw new Error(`Supplemental chart metadata is ambiguous: duplicate chart for ${song.title} by ${song.artist} (${chartType} ${difficulty}).`);
      }
      charts.set(key, metadata);
      const titleKey = titleChartKey(song.title, chartType, difficulty);
      const titleMatches = chartsByTitle.get(titleKey) ?? [];
      titleMatches.push(metadata);
      chartsByTitle.set(titleKey, titleMatches);
      supportedChartCount += 1;
    });
  });

  if (supportedChartCount < minimumCharts) {
    throw new Error(`Supplemental chart metadata coverage regressed: expected at least ${minimumCharts} supported charts, received ${supportedChartCount}.`);
  }

  return {
    updateTime: new Date(payload.updateTime).toISOString(),
    metadata(title, artist, chartType, difficulty) {
      const exact = charts.get(chartKey(title, artist, chartType, difficulty));
      if (exact) return exact;
      const titleMatches = chartsByTitle.get(titleChartKey(title, chartType, difficulty)) ?? [];
      if (titleMatches.length === 1) return titleMatches[0];
      if (titleMatches.length > 1) {
        throw new Error(`Supplemental chart metadata is ambiguous for ${title} (${chartType} ${difficulty}); artist did not resolve the match.`);
      }
      return {};
    },
  };
}
