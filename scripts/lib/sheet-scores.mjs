import { createHash } from "node:crypto";
import { createGoogleClients, GOOGLE_SCOPES, requiredEnvironment } from "./google-auth.mjs";

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
  return parsed <= 2 ? Number((parsed * 100).toFixed(10)) : parsed;
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

function zonedDateTimeIso(value, timeZone) {
  const text = String(value ?? "").trim();
  const isoLocal = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2}):(\d{2})$/);
  const usLocal = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!isoLocal && !usLocal) {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime()) && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
      return parsed.toISOString();
    }
    throw new Error(`Unsupported Date / Time value: ${JSON.stringify(text)}.`);
  }

  const [, year, month, day, hour, minute, second] = isoLocal
    ?? [usLocal[0], usLocal[3], usLocal[1], usLocal[2], usLocal[4], usLocal[5], usLocal[6]];
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

function judgmentSet(row, headers, suffix = "") {
  const values = Object.fromEntries(judgmentNames.map((name) => [
    name,
    cell(row, headers, `${judgmentHeaders[name]}${suffix}`),
  ]));
  const criticalPerfect = isBlank(values.criticalPerfect)
    ? numberValue(values.perfect)
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
    return [noteType, judgmentSet(row, headers, ` ${label}`)];
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

export function parseScoreRows(rows, timeZone) {
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

    const score = {
      playedAt: zonedDateTimeIso(date, timeZone),
      songTitle: title,
      chartType: String(cell(row, headers, "Chart Type") || "DX").trim().toUpperCase(),
      difficulty: String(cell(row, headers, "Difficulty") || "").trim(),
      level: String(cell(row, headers, "Chart Level") || "").trim(),
      achievement,
      combo: String(cell(row, headers, "Combo Status") || "").trim(),
      sync: String(cell(row, headers, "Sync Status") || "").trim(),
      rating: numberValue(cell(row, headers, "Rating (At Time)")),
      ratingChange: numberValue(cell(row, headers, "Rating Change")),
      judgments: judgmentSet(row, headers),
      judgmentsByType: judgmentBreakdown(row, headers),
      fast: numberValue(cell(row, headers, "Fast")),
      slow: numberValue(cell(row, headers, "Slow")),
    };
    return [{ ...score, id: scoreId(score) }];
  });
}

export async function readScoreSheet() {
  const spreadsheetId = requiredEnvironment("GOOGLE_SPREADSHEET_ID");
  const sheetName = requiredEnvironment("GOOGLE_SHEET_NAME");
  const { sheets } = await createGoogleClients(GOOGLE_SCOPES.readonly);
  const escapedSheetName = sheetName.replace(/'/g, "''");
  const [metadata, values] = await Promise.all([
    sheets.spreadsheets.get({
      spreadsheetId,
      fields: "properties(timeZone)",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${escapedSheetName}'!A:ZZ`,
      valueRenderOption: "FORMATTED_VALUE",
    }),
  ]);
  const timeZone = metadata.data.properties?.timeZone;
  if (!timeZone) throw new Error("Spreadsheet timezone is unavailable.");
  return parseScoreRows(values.data.values ?? [], timeZone);
}
