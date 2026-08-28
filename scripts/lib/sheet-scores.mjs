import { createHash } from "node:crypto";
import { createGoogleClients, GOOGLE_SCOPES, requiredEnvironment } from "./google-auth.mjs";
import { normalizeLegacyCopiedCriticalPerfects } from "./legacy-judgments.mjs";
import { derivedComboStatus } from "./combo-status.mjs";

const judgmentNames = ["criticalPerfect", "perfect", "great", "good", "miss"];
const judgmentHeaders = {
  criticalPerfect: "Critical Perfect",
  perfect: "Perfect",
  great: "Great",
  good: "Good",
  miss: "Miss",
};
const noteTypes = ["break", "tap", "hold", "slide", "touch"];

function normalizedHeader(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function headerIndex(headerRow) {
  return new Map(headerRow.map((header, index) => [normalizedHeader(header), index]));
}

function cell(row, headers, name) {
  const index = headers.get(normalizedHeader(name));
  return index === undefined ? "" : row[index];
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function numberValue(value, fallback = 0) {
  if (isBlank(value)) return fallback;
  const parsed = Number(String(value)
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/^\+/, "")
    .trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function percentageValue(value) {
  const parsed = numberValue(value, Number.NaN);
  if (!Number.isFinite(parsed)) return null;
  const percentage = parsed <= 2 ? parsed * 100 : parsed;
  return Number(percentage.toFixed(4));
}

function syncValue(value) {
  const sync = String(value ?? "").trim();
  return !sync || sync.toLocaleLowerCase() === "none" ? null : sync;
}

function comboValue(value) {
  const combo = String(value ?? "").trim();
  return combo || null;
}

function timeZoneParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function zonedDateTimeIso(value, timeZone) {
  const text = String(value ?? "").trim();
  const isoLocal = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2}):(\d{2})$/);
  if (!isoLocal) {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime()) && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
      return parsed.toISOString();
    }
    throw new Error(`Unsupported Date / Time value: ${JSON.stringify(text)}.`);
  }

  const [, year, month, day, hour, minute, second] = isoLocal;
  const wallClockUtc = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  let instant = wallClockUtc;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = timeZoneParts(new Date(instant), timeZone);
    const representedUtc = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
      +parts.second,
    );
    instant += wallClockUtc - representedUtc;
  }
  return new Date(instant).toISOString();
}

function utcDateTimeIso(value) {
  const text = String(value ?? "").trim();
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    throw new Error(`Date / Time must be an ISO timestamp with a UTC offset: ${JSON.stringify(text)}.`);
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid Date / Time value: ${JSON.stringify(text)}.`);
  }
  return parsed.toISOString();
}

function judgmentSet(row, headers, suffix = "") {
  const values = Object.fromEntries(judgmentNames.map((name) => [
    name,
    cell(row, headers, `${judgmentHeaders[name]}${suffix}`),
  ]));
  if (Object.values(values).every(isBlank)) return null;
  const criticalPerfect = isBlank(values.criticalPerfect)
    ? null
    : numberValue(values.criticalPerfect);
  return {
    criticalPerfect,
    perfect: numberValue(values.perfect),
    great: numberValue(values.great),
    good: numberValue(values.good),
    miss: numberValue(values.miss),
  };
}

function judgmentBreakdown(row, headers) {
  const hasBreakdown = noteTypes.some((noteType) =>
    judgmentNames.some((name) => !isBlank(cell(
      row,
      headers,
      `${judgmentHeaders[name]} ${noteType === "touch" ? "Touches" : `${noteType[0].toUpperCase()}${noteType.slice(1)}s`}`,
    ))));
  if (!hasBreakdown) return null;

  return Object.fromEntries(noteTypes.map((noteType) => {
    const label = noteType === "touch"
      ? "Touches"
      : `${noteType[0].toUpperCase()}${noteType.slice(1)}s`;
    return [noteType, judgmentSet(row, headers, ` ${label}`) ?? {
      criticalPerfect: 0, perfect: 0, great: 0, good: 0, miss: 0,
    }];
  }));
}

function scoreId(score) {
  const identity = [
    score.playedAt,
    score.songTitle,
    score.chartType,
    score.difficulty,
    score.level,
    score.achievement,
  ].join("|");
  return createHash("sha256").update(identity).digest("base64url");
}

export function parseScoreRows(rows) {
  if (!rows.length) return [];
  const headers = headerIndex(rows[0]);
  const requiredHeaders = [
    "Date / Time",
    "Song Title",
    "Chart Type",
    "Difficulty",
    "Chart Level",
    "Achievement %",
  ];
  requiredHeaders.forEach((name) => {
    if (!headers.has(normalizedHeader(name))) throw new Error(`Missing required sheet column: ${name}.`);
  });

  return rows.slice(1).flatMap((row, rowIndex) => {
    const date = cell(row, headers, "Date / Time");
    const title = String(cell(row, headers, "Song Title") ?? "").trim();
    if (isBlank(date) && !title) return [];
    if (isBlank(date) || !title) throw new Error(`Incomplete score identity on sheet row ${rowIndex + 2}.`);
    const achievement = percentageValue(cell(row, headers, "Achievement %"));
    if (achievement === null) throw new Error(`Invalid achievement on sheet row ${rowIndex + 2}.`);

    const judgments = judgmentSet(row, headers);
    const score = {
      playedAt: utcDateTimeIso(date),
      songTitle: title,
      chartType: String(cell(row, headers, "Chart Type") || "DX").trim().toUpperCase(),
      difficulty: String(cell(row, headers, "Difficulty") || "").trim(),
      level: String(cell(row, headers, "Chart Level") || "").trim(),
      achievement,
      combo: derivedComboStatus({
        achievement,
        judgments,
        fallback: comboValue(cell(row, headers, "Combo Status")),
      }),
      sync: syncValue(cell(row, headers, "Sync Status")),
      rating: numberValue(cell(row, headers, "Rating")),
      ratingChange: numberValue(cell(row, headers, "Rating Change")),
      judgments,
      judgmentsByType: judgmentBreakdown(row, headers),
      fast: isBlank(cell(row, headers, "Fast")) ? null : numberValue(cell(row, headers, "Fast")),
      slow: isBlank(cell(row, headers, "Slow")) ? null : numberValue(cell(row, headers, "Slow")),
    };
    normalizeLegacyCopiedCriticalPerfects(score);
    return [{ ...score, id: scoreId(score) }];
  });
}

export async function readScoreSheet() {
  return (await readScoreSheetWithRows()).map(({ score }) => score);
}

export async function readScoreSheetWithRows() {
  const spreadsheetId = requiredEnvironment("GOOGLE_SPREADSHEET_ID");
  const sheetName = requiredEnvironment("GOOGLE_SHEET_NAME");
  const { sheets } = await createGoogleClients(GOOGLE_SCOPES.readonly);
  const escapedSheetName = sheetName.replace(/'/g, "''");
  const values = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${escapedSheetName}'!A:ZZ`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const rows = values.data.values ?? [];
  if (!rows.length) return [];
  return rows.slice(1).flatMap((row, index) => {
    const parsed = parseScoreRows([rows[0], row]);
    return parsed.map((score) => ({ rowNumber: index + 2, score }));
  });
}
