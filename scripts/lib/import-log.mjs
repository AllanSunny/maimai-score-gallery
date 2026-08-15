import { createGoogleClients, requiredEnvironment } from "./google-auth.mjs";

export const IMPORT_LOG_SHEET_NAME = "_ScoreImportLog";
const headers = [
  "Drive File ID",
  "Original Filename",
  "Canonical Title",
  "Capture Time",
  "Spreadsheet Row",
  "Status",
  "Updated At",
  "Error",
];

function quotedSheetName() {
  return `'${IMPORT_LOG_SHEET_NAME.replace(/'/g, "''")}'`;
}

export async function createImportLog() {
  const spreadsheetId = requiredEnvironment("GOOGLE_SPREADSHEET_ID");
  const { sheets } = await createGoogleClients();
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title,hidden)",
  });
  let worksheet = metadata.data.sheets?.find(
    ({ properties }) => properties?.title === IMPORT_LOG_SHEET_NAME,
  );

  if (!worksheet) {
    const created = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: IMPORT_LOG_SHEET_NAME, hidden: true } } }],
      },
    });
    worksheet = { properties: created.data.replies?.[0]?.addSheet?.properties };
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quotedSheetName()}!A1:H1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  } else {
    const existingHeaders = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quotedSheetName()}!A1:H1`,
      valueRenderOption: "FORMATTED_VALUE",
    });
    if (JSON.stringify(existingHeaders.data.values?.[0] ?? []) !== JSON.stringify(headers)) {
      throw new Error(`${IMPORT_LOG_SHEET_NAME} has an unexpected header structure.`);
    }
    if (!worksheet.properties?.hidden) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            updateSheetProperties: {
              properties: { sheetId: worksheet.properties?.sheetId, hidden: true },
              fields: "hidden",
            },
          }],
        },
      });
    }
  }

  async function records() {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quotedSheetName()}!A2:H`,
      valueRenderOption: "FORMATTED_VALUE",
    });
    return (response.data.values ?? []).map((row, index) => ({
      rowNumber: index + 2,
      driveFileId: row[0] ?? "",
      originalFilename: row[1] ?? "",
      canonicalTitle: row[2] ?? "",
      captureTime: row[3] ?? "",
      spreadsheetRow: row[4] ? Number(row[4]) : null,
      status: row[5] ?? "",
      updatedAt: row[6] ?? "",
      error: row[7] ?? "",
    }));
  }

  return {
    async latest(driveFileId) {
      return (await records()).filter((record) => record.driveFileId === driveFileId).at(-1) ?? null;
    },

    async begin({ driveFileId, originalFilename, captureTime }) {
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${quotedSheetName()}!A:H`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [[driveFileId, originalFilename, "", captureTime, "", "PROCESSING", new Date().toISOString(), ""]],
        },
      });
      const range = response.data.updates?.updatedRange ?? "";
      const rowNumber = Number(range.match(/!(?:[A-Z]+)(\d+):/)?.[1]);
      if (!rowNumber) throw new Error("Could not determine the import-log row number.");
      return rowNumber;
    },

    async finish(rowNumber, { canonicalTitle, captureTime, spreadsheetRow }) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${quotedSheetName()}!C${rowNumber}:H${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[canonicalTitle, captureTime, spreadsheetRow, "IMPORTED", new Date().toISOString(), ""]],
        },
      });
    },

    async reject(rowNumber, error) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${quotedSheetName()}!F${rowNumber}:H${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["REJECTED", new Date().toISOString(), String(error?.message ?? error)]],
        },
      });
    },
  };
}
