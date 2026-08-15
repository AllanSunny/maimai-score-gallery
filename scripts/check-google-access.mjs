import { createGoogleClients, GOOGLE_SCOPES, requiredEnvironment } from "./lib/google-auth.mjs";

const incomingFolderId = requiredEnvironment("GOOGLE_DRIVE_FOLDER_ID");
const processedFolderId = requiredEnvironment("GOOGLE_PROCESSED_FOLDER_ID");
const spreadsheetId = requiredEnvironment("GOOGLE_SPREADSHEET_ID");
const sheetName = requiredEnvironment("GOOGLE_SHEET_NAME");

const { drive, sheets } = await createGoogleClients(GOOGLE_SCOPES.readonly);

async function folderAccess(fileId, label) {
  const response = await drive.files.get({
    fileId,
    fields: "id,name,mimeType,trashed,capabilities(canAddChildren,canEdit,canRemoveChildren)",
    supportsAllDrives: true,
  });
  const folder = response.data;
  if (folder.trashed) throw new Error(`${label} folder is in the trash.`);
  if (folder.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error(`${label} is not a Google Drive folder.`);
  }
  return folder;
}

const [incomingFolder, processedFolder, spreadsheetFile, spreadsheet] = await Promise.all([
  folderAccess(incomingFolderId, "Incoming"),
  folderAccess(processedFolderId, "Processed"),
  drive.files.get({
    fileId: spreadsheetId,
    fields: "id,name,mimeType,trashed,capabilities(canEdit)",
    supportsAllDrives: true,
  }).then(({ data }) => data),
  sheets.spreadsheets.get({
    spreadsheetId,
    fields: "spreadsheetId,properties.title,sheets.properties(sheetId,title,hidden)",
  }).then(({ data }) => data),
]);

if (spreadsheetFile.trashed) throw new Error("Spreadsheet is in the trash.");
if (spreadsheetFile.mimeType !== "application/vnd.google-apps.spreadsheet") {
  throw new Error("GOOGLE_SPREADSHEET_ID does not identify a Google spreadsheet.");
}

const worksheet = spreadsheet.sheets?.find(({ properties }) => properties?.title === sheetName);
if (!worksheet) throw new Error(`Worksheet ${JSON.stringify(sheetName)} was not found.`);

const incomingSample = await drive.files.list({
  q: `'${incomingFolderId}' in parents and trashed = false`,
  fields: "files(id,name,mimeType)",
  pageSize: 1,
  spaces: "drive",
  supportsAllDrives: true,
  includeItemsFromAllDrives: true,
});

console.log("Google API connectivity check passed.");
console.log(`Incoming folder: ${incomingFolder.name}`);
console.log(`Processed folder: ${processedFolder.name}`);
console.log(`Spreadsheet: ${spreadsheet.properties?.title}`);
console.log(`Worksheet: ${worksheet.properties?.title}`);
console.log(`Incoming folder readable: ${incomingSample.data.files !== undefined}`);
console.log(`Incoming folder editable: ${Boolean(incomingFolder.capabilities?.canEdit)}`);
console.log(`Incoming files removable: ${Boolean(incomingFolder.capabilities?.canRemoveChildren)}`);
console.log(`Processed folder accepts files: ${Boolean(processedFolder.capabilities?.canAddChildren)}`);
console.log(`Spreadsheet editable: ${Boolean(spreadsheetFile.capabilities?.canEdit)}`);
