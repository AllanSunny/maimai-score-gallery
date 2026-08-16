import { createGoogleClients, requiredEnvironment } from "./google-auth.mjs";

const REVIEW_SHEET_NAME = "Score Import Review";
export const REVIEW_STATUSES = Object.freeze({
  review: "Review",
  imported: "Imported",
  ignored: "Ignored",
});

const judgmentNames = ["Critical Perfect", "Perfect", "Great", "Good", "Miss"];
const noteTypeNames = ["Breaks", "Taps", "Holds", "Slides", "Touches"];
const judgmentCorrectionHeaders = [
  ...judgmentNames.map((judgment) => `Corrected ${judgment}`),
  ...noteTypeNames.flatMap((noteType) =>
    judgmentNames.map((judgment) => `Corrected ${judgment} ${noteType}`)),
];
const scoreCorrectionHeaders = [
  "Corrected Chart Type",
  "Corrected Difficulty",
  "Corrected Chart Level",
  "Corrected Achievement %",
  "Corrected Combo Status",
  "Corrected Sync Status",
  "Corrected Rating",
  "Corrected Rating Change",
  "Corrected Fast",
  "Corrected Slow",
];
const headers = [
  "Filename",
  "Status",
  "Retry",
  "Error",
  "OCR Title",
  "Candidate Titles",
  "Corrected Title",
  "Corrected Artist",
  "Corrected Capture Time (UTC)",
  ...scoreCorrectionHeaders,
  ...judgmentCorrectionHeaders,
  "Spreadsheet Row",
  "Last Attempted (UTC)",
  "Drive File ID",
];
const headerIndexes = new Map(headers.map((header, index) => [header, index]));

export function isManualReviewEntry(entry) {
  return !entry.driveFileId && entry.status === REVIEW_STATUSES.review && entry.retry;
}

export function isReusableReviewRow(entry) {
  return !entry.hasContent;
}

function columnName(index) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function columnFor(header) {
  return columnName(headerIndexes.get(header));
}

function value(row, header) {
  return row[headerIndexes.get(header)] ?? "";
}

function correctedJudgments(row) {
  return Object.fromEntries(judgmentCorrectionHeaders.map((header) => [header, value(row, header)]));
}

function correctedScoreFields(row) {
  return Object.fromEntries(scoreCorrectionHeaders.map((header) => [header, value(row, header)]));
}

function rowValues(values) {
  return headers.map((header) => values[header] ?? "");
}

function quotedSheetName() {
  return `'${REVIEW_SHEET_NAME.replace(/'/g, "''")}'`;
}

function record(row, index) {
  return {
    rowNumber: index + 2,
    filename: String(value(row, "Filename")),
    status: String(value(row, "Status")),
    error: String(value(row, "Error")),
    ocrTitle: String(value(row, "OCR Title")),
    candidates: String(value(row, "Candidate Titles")),
    correctedTitle: String(value(row, "Corrected Title")).trim(),
    correctedArtist: String(value(row, "Corrected Artist")).trim(),
    correctedCaptureTime: String(value(row, "Corrected Capture Time (UTC)")).trim(),
    correctedScoreFields: correctedScoreFields(row),
    correctedJudgments: correctedJudgments(row),
    retry: value(row, "Retry") === true,
    spreadsheetRow: value(row, "Spreadsheet Row") === ""
      ? null
      : Number(value(row, "Spreadsheet Row")),
    lastAttempted: String(value(row, "Last Attempted (UTC)")),
    driveFileId: String(value(row, "Drive File ID")),
    hasContent: row.some((cell) => cell !== "" && cell !== null && cell !== undefined),
  };
}

export async function createReviewQueue() {
  const spreadsheetId = requiredEnvironment("GOOGLE_SPREADSHEET_ID");
  const { sheets } = await createGoogleClients();
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quotedSheetName()}!A1:${columnName(headers.length - 1)}1`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  if (JSON.stringify(headerResponse.data.values?.[0] ?? []) !== JSON.stringify(headers)) {
    throw new Error(`${REVIEW_SHEET_NAME} has an unexpected header structure.`);
  }

  let recordCache = null;
  async function records() {
    if (recordCache) return recordCache;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quotedSheetName()}!A2:${columnName(headers.length - 1)}`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    recordCache = (response.data.values ?? []).map(record);
    return recordCache;
  }

  return {
    async manualEntries() {
      return (await records()).filter(isManualReviewEntry);
    },

    async find(driveFileId) {
      return (await records()).find((entry) => entry.driveFileId === driveFileId) ?? null;
    },

    shouldRetry(entry) {
      return entry?.status === REVIEW_STATUSES.review && entry.retry;
    },

    async markRetryStarted(rowNumber) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: [
            { range: `${quotedSheetName()}!${columnFor("Retry")}${rowNumber}`, values: [[false]] },
            { range: `${quotedSheetName()}!${columnFor("Last Attempted (UTC)")}${rowNumber}`, values: [[new Date().toISOString()]] },
          ],
        },
      });
      const existing = (await records()).find((entry) => entry.rowNumber === rowNumber);
      if (existing) Object.assign(existing, { retry: false, lastAttempted: new Date().toISOString() });
    },

    async upsertRejection({ driveFileId, filename, error, ocrTitle = "", candidates = [] }) {
      const existing = await this.find(driveFileId);
      const attemptedAt = new Date().toISOString();
      if (existing) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: "RAW",
            data: [
              {
                range: `${quotedSheetName()}!A${existing.rowNumber}:F${existing.rowNumber}`,
                values: [[
                  filename,
                  REVIEW_STATUSES.review,
                  false,
                  String(error?.message ?? error),
                  ocrTitle,
                  candidates.join(" | "),
                ]],
              },
              { range: `${quotedSheetName()}!${columnFor("Last Attempted (UTC)")}${existing.rowNumber}`, values: [[attemptedAt]] },
            ],
          },
        });
        Object.assign(existing, {
          filename, status: REVIEW_STATUSES.review, error: String(error?.message ?? error),
          ocrTitle, candidates: candidates.join(" | "), retry: false, lastAttempted: attemptedAt,
        });
        return existing.rowNumber;
      }
      const entries = await records();
      const empty = entries.find(isReusableReviewRow);
      const rowNumber = empty?.rowNumber ?? (entries.at(-1)?.rowNumber ?? 1) + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${quotedSheetName()}!A${rowNumber}:${columnName(headers.length - 1)}${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: { values: [rowValues({
          Filename: filename,
          Status: REVIEW_STATUSES.review,
          Retry: false,
          Error: String(error?.message ?? error),
          "OCR Title": ocrTitle,
          "Candidate Titles": candidates.join(" | "),
          "Last Attempted (UTC)": attemptedAt,
          "Drive File ID": driveFileId,
        })] },
      });
      const newRecord = record(rowValues({
        Filename: filename,
        Status: REVIEW_STATUSES.review,
        Retry: false,
        Error: String(error?.message ?? error),
        "OCR Title": ocrTitle,
        "Candidate Titles": candidates.join(" | "),
        "Last Attempted (UTC)": attemptedAt,
        "Drive File ID": driveFileId,
      }), rowNumber - 2);
      if (empty) Object.assign(empty, newRecord);
      else entries.push(newRecord);
      return rowNumber;
    },

    async markImported(driveFileId, spreadsheetRow) {
      const existing = await this.find(driveFileId);
      if (!existing) return;
      await this.markRowImported(existing.rowNumber, spreadsheetRow);
    },

    async markRowImported(rowNumber, spreadsheetRow) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: [
            {
              range: `${quotedSheetName()}!B${rowNumber}:D${rowNumber}`,
              values: [[REVIEW_STATUSES.imported, false, ""]],
            },
            {
              range: `${quotedSheetName()}!${columnFor("Spreadsheet Row")}${rowNumber}:${columnFor("Last Attempted (UTC)")}${rowNumber}`,
              values: [[spreadsheetRow, new Date().toISOString()]],
            },
          ],
        },
      });
      const existing = (await records()).find((entry) => entry.rowNumber === rowNumber);
      Object.assign(existing, {
        status: REVIEW_STATUSES.imported, error: "", retry: false,
        spreadsheetRow, lastAttempted: new Date().toISOString(),
      });
    },

    async markRowRejected(rowNumber, error, candidates = []) {
      const attemptedAt = new Date().toISOString();
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: [
            {
              range: `${quotedSheetName()}!B${rowNumber}:D${rowNumber}`,
              values: [[REVIEW_STATUSES.review, false, String(error?.message ?? error)]],
            },
            {
              range: `${quotedSheetName()}!${columnFor("Candidate Titles")}${rowNumber}`,
              values: [[candidates.join(" | ")]],
            },
            {
              range: `${quotedSheetName()}!${columnFor("Last Attempted (UTC)")}${rowNumber}`,
              values: [[attemptedAt]],
            },
          ],
        },
      });
      const existing = (await records()).find((entry) => entry.rowNumber === rowNumber);
      if (existing) Object.assign(existing, {
        status: REVIEW_STATUSES.review,
        error: String(error?.message ?? error),
        candidates: candidates.join(" | "),
        retry: false,
        lastAttempted: attemptedAt,
      });
    },
  };
}
