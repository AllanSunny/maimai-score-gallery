export function additionalRowsRequired(rowNumber, rowCount, minimumGrowth = 100) {
  if (!Number.isInteger(rowNumber) || rowNumber < 1) {
    throw new Error("Target sheet row must be a positive integer.");
  }
  if (!Number.isInteger(rowCount) || rowCount < 0) {
    throw new Error("Sheet row count must be a non-negative integer.");
  }
  if (!Number.isInteger(minimumGrowth) || minimumGrowth < 1) {
    throw new Error("Minimum sheet growth must be a positive integer.");
  }
  if (rowNumber <= rowCount) return 0;
  return Math.max(minimumGrowth, rowNumber - rowCount);
}

export async function ensureSheetRow({
  sheets,
  spreadsheetId,
  sheetId,
  rowNumber,
  rowCount,
  minimumGrowth = 100,
}) {
  const additionalRows = additionalRowsRequired(rowNumber, rowCount, minimumGrowth);
  if (additionalRows === 0) return rowCount;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        appendDimension: {
          sheetId,
          dimension: "ROWS",
          length: additionalRows,
        },
      }],
    },
  });
  return rowCount + additionalRows;
}
