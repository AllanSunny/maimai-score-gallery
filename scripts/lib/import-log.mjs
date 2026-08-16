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
  "Source SHA-256",
  "Score Fingerprint",
  "OCR JSON",
  "OCR Model",
  "Prompt Version",
  "OpenAI Response ID",
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
      range: `${quotedSheetName()}!A1:N1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  } else {
    const existingHeaders = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quotedSheetName()}!A1:N1`,
      valueRenderOption: "FORMATTED_VALUE",
    });
    const existing = existingHeaders.data.values?.[0] ?? [];
    if (JSON.stringify(existing) !== JSON.stringify(headers)) {
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

  let recordCache = null;
  async function records() {
    if (recordCache) return recordCache;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quotedSheetName()}!A2:N`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    recordCache = (response.data.values ?? []).map((row, index) => ({
      rowNumber: index + 2,
      driveFileId: row[0] ?? "",
      originalFilename: row[1] ?? "",
      canonicalTitle: row[2] ?? "",
      captureTime: row[3] ?? "",
      spreadsheetRow: row[4] ? Number(row[4]) : null,
      status: row[5] ?? "",
      updatedAt: row[6] ?? "",
      error: row[7] ?? "",
      sourceHash: row[8] ?? "",
      scoreFingerprint: row[9] ?? "",
      ocrJson: row[10] ?? "",
      ocrModel: row[11] ?? "",
      promptVersion: row[12] ?? "",
      openaiResponseId: row[13] ?? "",
    }));
    return recordCache;
  }

  async function cachedRecord(rowNumber) {
    return (await records()).find((record) => record.rowNumber === rowNumber);
  }

  return {
    async latest(driveFileId) {
      return (await records()).filter((record) => record.driveFileId === driveFileId).at(-1) ?? null;
    },

    async findSuccessfulBySourceHash(sourceHash) {
      return (await records()).find((record) =>
        record.sourceHash === sourceHash && ["IMPORTED", "DUPLICATE"].includes(record.status)) ?? null;
    },

    async begin({ driveFileId, originalFilename, captureTime }) {
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${quotedSheetName()}!A:N`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [[
            driveFileId, originalFilename, "", captureTime, "", "PROCESSING",
            new Date().toISOString(), "", "", "", "", "", "", "",
          ]],
        },
      });
      const range = response.data.updates?.updatedRange ?? "";
      const rowNumber = Number(range.match(/!(?:[A-Z]+)(\d+):/)?.[1]);
      if (!rowNumber) throw new Error("Could not determine the import-log row number.");
      (await records()).push({
        rowNumber, driveFileId, originalFilename, canonicalTitle: "", captureTime,
        spreadsheetRow: null, status: "PROCESSING", updatedAt: new Date().toISOString(),
        error: "", sourceHash: "", scoreFingerprint: "", ocrJson: "", ocrModel: "",
        promptVersion: "", openaiResponseId: "",
      });
      return rowNumber;
    },

    async resume(rowNumber) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${quotedSheetName()}!F${rowNumber}:H${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["PROCESSING", new Date().toISOString(), ""]],
        },
      });
      Object.assign(await cachedRecord(rowNumber), { status: "PROCESSING", error: "" });
    },

    async cacheOcr(rowNumber, {
      sourceHash, score, model, promptVersion, responseId,
    }) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${quotedSheetName()}!I${rowNumber}:N${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[sourceHash, "", JSON.stringify(score), model, promptVersion, responseId]],
        },
      });
      Object.assign(await cachedRecord(rowNumber), {
        sourceHash, ocrJson: JSON.stringify(score), ocrModel: model,
        promptVersion, openaiResponseId: responseId,
      });
    },

    async markDuplicate(rowNumber, duplicate, sourceHash) {
      const duplicateDescription = duplicate.driveFileId
        ? `Duplicate of Drive file ${duplicate.driveFileId}`
        : `Duplicate of existing spreadsheet row ${duplicate.spreadsheetRow}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${quotedSheetName()}!C${rowNumber}:J${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: { values: [[
          duplicate.canonicalTitle,
          duplicate.captureTime,
          duplicate.spreadsheetRow,
          "DUPLICATE",
          new Date().toISOString(),
          duplicateDescription,
          sourceHash,
          duplicate.scoreFingerprint,
        ]] },
      });
      Object.assign(await cachedRecord(rowNumber), {
        canonicalTitle: duplicate.canonicalTitle, captureTime: duplicate.captureTime,
        spreadsheetRow: duplicate.spreadsheetRow, status: "DUPLICATE", sourceHash,
        scoreFingerprint: duplicate.scoreFingerprint,
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
      Object.assign(await cachedRecord(rowNumber), { status: "REJECTED", error: String(error?.message ?? error) });
    },

  };
}
