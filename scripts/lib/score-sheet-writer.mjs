import { createGoogleClients, requiredEnvironment } from "./google-auth.mjs";
import { IMPORT_LOG_SHEET_NAME } from "./import-log.mjs";
import { ensureSheetRow } from "./sheet-grid.mjs";

const SCORE_HEADERS = {
  first: ["Date / Time", "Song Title", "Chart Type", "Difficulty", "Chart Level", "Achievement %"],
  statuses: ["Combo Status", "Sync Status", "Rating", "Rating Change"],
  judgments: [
    "Critical Perfect", "Perfect", "Great", "Good", "Miss", "Fast", "Slow",
    "Critical Perfect Breaks", "Perfect Breaks", "Great Breaks", "Good Breaks", "Miss Breaks",
    "Critical Perfect Taps", "Perfect Taps", "Great Taps", "Good Taps", "Miss Taps",
    "Critical Perfect Holds", "Perfect Holds", "Great Holds", "Good Holds", "Miss Holds",
    "Critical Perfect Slides", "Perfect Slides", "Great Slides", "Good Slides", "Miss Slides",
    "Critical Perfect Touches", "Perfect Touches", "Great Touches", "Good Touches", "Miss Touches",
  ],
};

function escapedSheetName(sheetName) {
  return sheetName.replace(/'/g, "''");
}

function normalizedHeader(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function assertHeaders(actual, expected, startColumn) {
  expected.forEach((header, index) => {
    const actualHeader = actual[startColumn + index];
    const alternatives = Array.isArray(header) ? header : [header];
    if (!alternatives.some((candidate) => normalizedHeader(actualHeader) === normalizedHeader(candidate))) {
      throw new Error(
        `Expected ${alternatives.join(" or ")} in column ${startColumn + index + 1}, found ${JSON.stringify(actualHeader ?? "")}.`,
      );
    }
  });
}

function utcTimestamp(playedAt) {
  const date = new Date(playedAt);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid playedAt value: ${JSON.stringify(playedAt)}.`);
  return date.toISOString();
}

function judgmentValues(set) {
  if (!set) return ["", "", "", "", ""];
  return [set.criticalPerfect, set.perfect, set.great, set.good, set.miss];
}

export function scoreSheetValues(score) {
  const breakdown = score.judgmentsByType;
  const noteTypeValues = ["break", "tap", "hold", "slide", "touch"]
    .flatMap((noteType) => breakdown ? judgmentValues(breakdown[noteType]) : ["", "", "", "", ""]);
  return {
    first: [
      utcTimestamp(score.playedAt),
      score.songTitle,
      score.chartType,
      score.difficulty,
      score.level,
      score.achievement / 100,
    ],
    statuses: [score.combo, score.sync ?? "", score.rating, score.ratingChange],
    judgments: [
      ...judgmentValues(score.judgments),
      score.fast ?? "",
      score.slow ?? "",
      ...noteTypeValues,
    ],
  };
}

const managedScoreColumns = Array.from({ length: 44 }, (_, index) => index)
  .filter((index) => index !== 6 && index !== 11);

export function firstAvailableScoreRow(rows) {
  const emptyIndex = rows.findIndex((row) => managedScoreColumns.every((index) => {
    const value = row[index];
    return value === null || value === undefined || String(value).trim() === "";
  }));
  return emptyIndex === -1 ? rows.length + 2 : emptyIndex + 2;
}

export function importedLogValues({ canonicalTitle, captureTime, spreadsheetRow }, updatedAt) {
  return [canonicalTitle, captureTime, spreadsheetRow, "IMPORTED", updatedAt, ""];
}

export async function createScoreSheetWriter() {
  const spreadsheetId = requiredEnvironment("GOOGLE_SPREADSHEET_ID");
  const sheetName = requiredEnvironment("GOOGLE_SHEET_NAME");
  const quotedSheet = `'${escapedSheetName(sheetName)}'`;
  const quotedImportLog = `'${escapedSheetName(IMPORT_LOG_SHEET_NAME)}'`;
  const { sheets } = await createGoogleClients();
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "properties(timeZone),sheets.properties(sheetId,title,gridProperties.rowCount)",
  });
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quotedSheet}!1:1`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const worksheet = metadata.data.sheets?.find(({ properties }) => properties?.title === sheetName);
  if (!worksheet?.properties?.sheetId && worksheet?.properties?.sheetId !== 0) {
    throw new Error(`Worksheet ${JSON.stringify(sheetName)} was not found.`);
  }
  if (!metadata.data.properties?.timeZone) throw new Error("Spreadsheet timezone is unavailable.");
  const headers = headerResponse.data.values?.[0] ?? [];
  assertHeaders(headers, SCORE_HEADERS.first, 0);
  assertHeaders(headers, SCORE_HEADERS.statuses, 7);
  assertHeaders(headers, SCORE_HEADERS.judgments, 12);
  const scoreResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quotedSheet}!A2:AR`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const rows = scoreResponse.data.values ?? [];
  let rowCount = worksheet.properties.gridProperties?.rowCount ?? 0;

  return {
    async append(score, importedLog = null) {
      const rowNumber = firstAvailableScoreRow(rows);
      const values = scoreSheetValues(score);

      rowCount = await ensureSheetRow({
        sheets,
        spreadsheetId,
        sheetId: worksheet.properties.sheetId,
        rowNumber,
        rowCount,
      });

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            repeatCell: {
              range: {
                sheetId: worksheet.properties.sheetId,
                startRowIndex: rowNumber - 1,
                endRowIndex: rowNumber,
                startColumnIndex: 10,
                endColumnIndex: 11,
              },
              cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "+0;-0;0" } } },
              fields: "userEnteredFormat.numberFormat",
            },
          }],
        },
      });

      const data = [
        { range: `${quotedSheet}!A${rowNumber}:F${rowNumber}`, values: [values.first] },
        { range: `${quotedSheet}!H${rowNumber}:K${rowNumber}`, values: [values.statuses] },
        { range: `${quotedSheet}!M${rowNumber}:AR${rowNumber}`, values: [values.judgments] },
      ];
      if (importedLog) {
        data.push({
          range: `${quotedImportLog}!C${importedLog.rowNumber}:H${importedLog.rowNumber}`,
          values: [importedLogValues({
            canonicalTitle: score.songTitle,
            captureTime: score.playedAt,
            spreadsheetRow: rowNumber,
          }, new Date().toISOString())],
        });
        data.push({
          range: `${quotedImportLog}!J${importedLog.rowNumber}`,
          values: [[importedLog.scoreFingerprint]],
        });
      }
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "RAW",
          data,
        },
      });
      rows[rowNumber - 2] = [
        ...values.first,
        "",
        ...values.statuses,
        "",
        ...values.judgments,
      ];
      return rowNumber;
    },
  };
}
