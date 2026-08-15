import { createGoogleClients, requiredEnvironment } from "./google-auth.mjs";

const SCORE_HEADERS = {
  first: ["Date / Time", "Song Title", "Chart Type", "Difficulty", "Chart Level", "Achievement %"],
  statuses: ["Combo Status", "Sync Status", "Rating (At Time)", "Rating Change"],
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
    if (normalizedHeader(actualHeader) !== normalizedHeader(header)) {
      throw new Error(
        `Expected ${header} in column ${startColumn + index + 1}, found ${JSON.stringify(actualHeader ?? "")}.`,
      );
    }
  });
}

function formattedLocalTime(playedAt, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(playedAt)).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function judgmentValues(set) {
  return [set.criticalPerfect, set.perfect, set.great, set.good, set.miss];
}

export function scoreSheetValues(score, timeZone) {
  const breakdown = score.judgmentsByType;
  const noteTypeValues = ["break", "tap", "hold", "slide", "touch"]
    .flatMap((noteType) => breakdown ? judgmentValues(breakdown[noteType]) : ["", "", "", "", ""]);
  return {
    first: [
      formattedLocalTime(score.playedAt, timeZone),
      score.songTitle,
      score.chartType,
      score.difficulty,
      score.level,
      score.achievement / 100,
    ],
    statuses: [score.combo, score.sync, score.rating, score.ratingChange],
    judgments: [
      ...judgmentValues(score.judgments),
      score.fast,
      score.slow,
      ...noteTypeValues,
    ],
  };
}

export async function createScoreSheetWriter() {
  const spreadsheetId = requiredEnvironment("GOOGLE_SPREADSHEET_ID");
  const sheetName = requiredEnvironment("GOOGLE_SHEET_NAME");
  const quotedSheet = `'${escapedSheetName(sheetName)}'`;
  const { sheets } = await createGoogleClients();
  const [metadata, headerResponse] = await Promise.all([
    sheets.spreadsheets.get({
      spreadsheetId,
      fields: "properties(timeZone),sheets.properties(sheetId,title)",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quotedSheet}!1:1`,
      valueRenderOption: "FORMATTED_VALUE",
    }),
  ]);
  const worksheet = metadata.data.sheets?.find(({ properties }) => properties?.title === sheetName);
  if (!worksheet?.properties?.sheetId && worksheet?.properties?.sheetId !== 0) {
    throw new Error(`Worksheet ${JSON.stringify(sheetName)} was not found.`);
  }
  const timeZone = metadata.data.properties?.timeZone;
  if (!timeZone) throw new Error("Spreadsheet timezone is unavailable.");
  const headers = headerResponse.data.values?.[0] ?? [];
  assertHeaders(headers, SCORE_HEADERS.first, 0);
  assertHeaders(headers, SCORE_HEADERS.statuses, 7);
  assertHeaders(headers, SCORE_HEADERS.judgments, 12);

  return {
    async append(score) {
      const dateColumn = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${quotedSheet}!A2:A`,
        valueRenderOption: "FORMATTED_VALUE",
      });
      const rows = dateColumn.data.values ?? [];
      const emptyIndex = rows.findIndex((row) => !row[0]);
      const rowNumber = emptyIndex === -1 ? rows.length + 2 : emptyIndex + 2;
      const values = scoreSheetValues(score, timeZone);

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: [
            { range: `${quotedSheet}!A${rowNumber}:F${rowNumber}`, values: [values.first] },
            { range: `${quotedSheet}!H${rowNumber}:K${rowNumber}`, values: [values.statuses] },
            { range: `${quotedSheet}!M${rowNumber}:AR${rowNumber}`, values: [values.judgments] },
          ],
        },
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
      return rowNumber;
    },
  };
}
