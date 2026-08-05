const PUBLIC_SHEET_NAME = "Sheet1";

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PUBLIC_SHEET_NAME);
  if (!sheet) return jsonResponse_({ error: "Score sheet not found" });

  const rows = sheet.getDataRange().getValues();
  rows.shift();

  const scores = rows
    .filter(function(row) { return row[0] && row[1]; })
    .map(function(row, index) {
      const playedAt = row[0] instanceof Date ? row[0].toISOString() : String(row[0]);
      return {
        id: Utilities.base64EncodeWebSafe(playedAt + "|" + row[1] + "|" + index),
        playedAt: playedAt,
        songTitle: String(row[1] || ""),
        chartType: String(row[2] || "DX"),
        difficulty: String(row[3] || ""),
        level: String(row[4] || ""),
        achievement: percentage_(row[5]),
        rank: String(row[6] || ""),
        combo: String(row[7] || ""),
        sync: String(row[8] || ""),
        rating: number_(row[9]),
        ratingChange: number_(row[10]),
        // Column L (Notes / Location) is deliberately not exposed.
        judgments: {
          criticalPerfect: number_(row[12]),
          perfect: number_(row[13]),
          great: number_(row[14]),
          good: number_(row[15]),
          miss: number_(row[16])
        },
        fast: number_(row[17]),
        slow: number_(row[18])
      };
    });

  return jsonResponse_({ scores: scores, updatedAt: new Date().toISOString() });
}

function number_(value) {
  const parsed = Number(String(value == null ? "" : value).replace(/[,+%]/g, ""));
  return isFinite(parsed) ? parsed : 0;
}

function percentage_(value) {
  const parsed = number_(value);
  // Sheets stores 100.5079% as 1.005079; manually entered values may already be 100.5079.
  return parsed <= 2 ? parsed * 100 : parsed;
}

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
