import { createGoogleClients, requiredEnvironment } from "./google-auth.mjs";

const REVIEW_SHEET_NAME = "Score Import Review";
export const REVIEW_STATUSES = Object.freeze({
  review: "Review",
  imported: "Imported",
  ignored: "Ignored",
});

const headers = [
  "Filename",
  "Status",
  "Error",
  "OCR Title",
  "Candidate Titles",
  "Corrected Title",
  "Corrected Artist",
  "Corrected Capture Time (UTC)",
  "Corrected Rating Change",
  "Retry",
  "Spreadsheet Row",
  "Last Attempted (UTC)",
  "Drive File ID",
];

function quotedSheetName() {
  return `'${REVIEW_SHEET_NAME.replace(/'/g, "''")}'`;
}

function record(row, index) {
  return {
    rowNumber: index + 2,
    filename: String(row[0] ?? ""),
    status: String(row[1] ?? ""),
    error: String(row[2] ?? ""),
    ocrTitle: String(row[3] ?? ""),
    candidates: String(row[4] ?? ""),
    correctedTitle: String(row[5] ?? "").trim(),
    correctedArtist: String(row[6] ?? "").trim(),
    correctedCaptureTime: String(row[7] ?? "").trim(),
    correctedRatingChange: row[8] ?? "",
    retry: row[9] === true,
    spreadsheetRow: row[10] === "" || row[10] === undefined ? null : Number(row[10]),
    lastAttempted: String(row[11] ?? ""),
    driveFileId: String(row[12] ?? ""),
  };
}

export async function createReviewQueue() {
  const spreadsheetId = requiredEnvironment("GOOGLE_SPREADSHEET_ID");
  const { sheets } = await createGoogleClients();
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quotedSheetName()}!A1:M1`,
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
      range: `${quotedSheetName()}!A2:M`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    recordCache = (response.data.values ?? []).map(record);
    return recordCache;
  }

  return {
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
            { range: `${quotedSheetName()}!J${rowNumber}`, values: [[false]] },
            { range: `${quotedSheetName()}!L${rowNumber}`, values: [[new Date().toISOString()]] },
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
                range: `${quotedSheetName()}!A${existing.rowNumber}:E${existing.rowNumber}`,
                values: [[filename, REVIEW_STATUSES.review, String(error?.message ?? error), ocrTitle, candidates.join(" | ")]],
              },
              { range: `${quotedSheetName()}!J${existing.rowNumber}`, values: [[false]] },
              { range: `${quotedSheetName()}!L${existing.rowNumber}`, values: [[attemptedAt]] },
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
      const empty = entries.find((entry) => !entry.driveFileId);
      const rowNumber = empty?.rowNumber ?? (entries.at(-1)?.rowNumber ?? 1) + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${quotedSheetName()}!A${rowNumber}:M${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: { values: [[
          filename,
          REVIEW_STATUSES.review,
          String(error?.message ?? error),
          ocrTitle,
          candidates.join(" | "),
          "", "", "", "", false, "", attemptedAt, driveFileId,
        ]] },
      });
      const newRecord = record([
        filename, REVIEW_STATUSES.review, String(error?.message ?? error),
        ocrTitle, candidates.join(" | "), "", "", "", "", false, "", attemptedAt, driveFileId,
      ], rowNumber - 2);
      if (empty) Object.assign(empty, newRecord);
      else entries.push(newRecord);
      return rowNumber;
    },

    async markImported(driveFileId, spreadsheetRow) {
      const existing = await this.find(driveFileId);
      if (!existing) return;
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: [
            { range: `${quotedSheetName()}!B${existing.rowNumber}:C${existing.rowNumber}`, values: [[REVIEW_STATUSES.imported, ""]] },
            { range: `${quotedSheetName()}!J${existing.rowNumber}:L${existing.rowNumber}`, values: [[false, spreadsheetRow, new Date().toISOString()]] },
          ],
        },
      });
      Object.assign(existing, {
        status: REVIEW_STATUSES.imported, error: "", retry: false,
        spreadsheetRow, lastAttempted: new Date().toISOString(),
      });
    },
  };
}
