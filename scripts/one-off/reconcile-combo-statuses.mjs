import { createGoogleClients, requiredEnvironment } from "../lib/google-auth.mjs";
import { parseScoreRows } from "../lib/sheet-scores.mjs";

function quotedSheetName(name) {
  return `'${name.replace(/'/g, "''")}'`;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const spreadsheetId = requiredEnvironment("GOOGLE_SPREADSHEET_ID");
  const sheetName = requiredEnvironment("GOOGLE_SHEET_NAME");
  const quotedSheet = quotedSheetName(sheetName);
  const { sheets } = await createGoogleClients();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quotedSheet}!A:AR`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const [headers = [], ...rows] = response.data.values ?? [];
  const comboColumn = headers.indexOf("Combo Status");
  if (comboColumn === -1) throw new Error("Combo Status column was not found.");

  const changes = rows.flatMap((row, index) => {
    const [score] = parseScoreRows([headers, row]);
    if (!score) return [];
    const current = String(row[comboColumn] ?? "").trim();
    const desired = score.combo ?? "";
    return current === desired ? [] : [{ rowNumber: index + 2, current, desired }];
  });
  const transitions = Object.groupBy(changes, ({ current, desired }) =>
    `${current || "(blank)"} -> ${desired || "(blank)"}`);

  console.log(`Found ${changes.length} combo status change(s).`);
  Object.entries(transitions).forEach(([transition, entries]) => {
    console.log(`  ${transition}: ${entries.length}`);
  });
  if (!apply || changes.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: changes.map(({ rowNumber, desired }) => ({
        range: `${quotedSheet}!H${rowNumber}`,
        values: [[desired]],
      })),
    },
  });
  console.log(`Applied ${changes.length} combo status change(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
