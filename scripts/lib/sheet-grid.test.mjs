import assert from "node:assert/strict";
import test from "node:test";
import { additionalRowsRequired, ensureSheetRow } from "./sheet-grid.mjs";

test("calculates shared sheet growth in bounded batches", () => {
  assert.equal(additionalRowsRequired(1000, 1000), 0);
  assert.equal(additionalRowsRequired(1001, 1000), 100);
  assert.equal(additionalRowsRequired(1250, 1000), 250);
});

test("expands a sheet only when the target row exceeds its grid", async () => {
  const requests = [];
  const sheets = {
    spreadsheets: {
      async batchUpdate(request) { requests.push(request); },
    },
  };
  const unchanged = await ensureSheetRow({
    sheets, spreadsheetId: "spreadsheet", sheetId: 7, rowNumber: 1000, rowCount: 1000,
  });
  const expanded = await ensureSheetRow({
    sheets, spreadsheetId: "spreadsheet", sheetId: 7, rowNumber: 1001, rowCount: unchanged,
  });
  assert.equal(expanded, 1100);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].requestBody.requests[0].appendDimension, {
    sheetId: 7,
    dimension: "ROWS",
    length: 100,
  });
});
