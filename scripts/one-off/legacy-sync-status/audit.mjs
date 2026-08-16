import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { createGoogleClients, requiredEnvironment } from "../../lib/google-auth.mjs";
import { mapConcurrent } from "../../lib/import-concurrency.mjs";
import { scoreFingerprint } from "../../lib/import-fingerprints.mjs";
import { prepareOcrImage } from "../../lib/ocr-image.mjs";
import { SCORE_OCR_PROMPT_VERSION } from "../../lib/openai-score-ocr.mjs";
import { readScoreSheetWithRows } from "../../lib/sheet-scores.mjs";
import { parseSyncStatus, SYNC_STATUS_AUDIT_PROMPT_VERSION } from "./sync-status-ocr.mjs";

const IMPORT_LOG_SHEET_NAME = "_ScoreImportLog";

function argumentsFrom(commandLine) {
  const apply = commandLine.includes("--apply");
  const applyReportIndex = commandLine.indexOf("--apply-report");
  const applyReport = applyReportIndex === -1 ? null : commandLine[applyReportIndex + 1]?.trim();
  const limitIndex = commandLine.indexOf("--limit");
  const limit = limitIndex === -1 ? Infinity : Number(commandLine[limitIndex + 1]);
  const fileIndex = commandLine.indexOf("--drive-file-id");
  const driveFileId = fileIndex === -1 ? null : commandLine[fileIndex + 1]?.trim();
  if (limit !== Infinity && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error("--limit must be a positive integer.");
  }
  if (fileIndex !== -1 && !driveFileId) throw new Error("--drive-file-id requires a value.");
  if (applyReportIndex !== -1 && !applyReport) throw new Error("--apply-report requires a path.");
  if (applyReport && (apply || limitIndex !== -1 || fileIndex !== -1)) {
    throw new Error("--apply-report cannot be combined with audit options.");
  }
  return { apply, applyReport, limit, driveFileId };
}

function positiveInteger(value, fallback) {
  const parsed = Number(value || fallback);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error("SYNC_AUDIT_CONCURRENCY must be positive.");
  return parsed;
}

export function syncAuditDecision(current, { positionState, sync }, combo) {
  if (positionState === "unreadable") return { apply: false, value: current };
  const value = positionState === "empty" ? null : sync;
  if (combo === "Clear" && value !== null && value !== "Sync") {
    return { apply: false, value: current };
  }
  return { apply: value !== current, value };
}

function escapedSheetName(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

export function resolveScoreRow(record, scoreRows) {
  const fingerprintMatches = record.scoreFingerprint
    ? scoreRows.filter(({ score }) => scoreFingerprint(score) === record.scoreFingerprint)
    : [];
  const identityMatches = scoreRows.filter(({ score }) =>
    score.songTitle === record.canonicalTitle && score.playedAt === record.captureTime);
  const matches = fingerprintMatches.length === 1 ? fingerprintMatches : identityMatches;
  return matches.length === 1
    ? { rowNumber: matches[0].rowNumber, score: matches[0].score, error: null }
    : {
        rowNumber: null,
        score: null,
        error: `Expected one score matching fingerprint or title and capture time; found ${matches.length}.`,
      };
}

async function applyUpdates(results) {
  const updates = results.filter(({ shouldUpdate }) => shouldUpdate);
  if (!updates.length) return;
  const liveScoreRows = await readScoreSheetWithRows();
  const resolvedUpdates = updates.map((result) => ({
    result,
    resolution: resolveScoreRow(result, liveScoreRows),
  }));
  const unresolved = resolvedUpdates.filter(({ resolution }) => resolution.error);
  if (unresolved.length) {
    throw new Error(
      `Refusing to update because ${unresolved.length} score row(s) could not be uniquely re-resolved.`,
    );
  }
  const spreadsheetId = requiredEnvironment("GOOGLE_SPREADSHEET_ID");
  const sheetName = requiredEnvironment("GOOGLE_SHEET_NAME");
  const { sheets } = await createGoogleClients();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: resolvedUpdates.map(({ result, resolution }) => ({
        range: `${escapedSheetName(sheetName)}!I${resolution.rowNumber}`,
        values: [[result.recommended ?? ""]],
      })),
    },
  });
}

export function auditReport({ mode, candidateCount, results, complete = results.length === candidateCount }) {
  return {
    generatedAt: new Date().toISOString(),
    mode,
    complete,
    promptVersion: SYNC_STATUS_AUDIT_PROMPT_VERSION,
    candidateCount,
    completedCount: results.length,
    detectedBadgeCount: results.filter(({ detected }) => detected !== null).length,
    recommendedUpdateCount: results.filter(({ shouldUpdate }) => shouldUpdate).length,
    errorCount: results.filter(({ status }) => status === "error").length,
    results,
  };
}

async function writeReport(reportPath, report) {
  await mkdir(path.dirname(reportPath), { recursive: true });
  const temporaryPath = `${reportPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(report, null, 2)}\n`);
  await rename(temporaryPath, reportPath);
}

async function applySavedReport(reportPath) {
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  if (report.promptVersion !== SYNC_STATUS_AUDIT_PROMPT_VERSION) {
    throw new Error("The saved audit report uses a different prompt version.");
  }
  if (!report.complete || report.completedCount !== report.candidateCount) {
    throw new Error(
      `Refusing to apply an incomplete audit report (${report.completedCount}/${report.candidateCount}).`,
    );
  }
  await applyUpdates(report.results);
  await writeReport(reportPath, { ...report, mode: "apply", appliedAt: new Date().toISOString() });
  console.log(`Applied ${report.recommendedUpdateCount} saved recommendation(s).`);
}

async function auditSources() {
  const spreadsheetId = requiredEnvironment("GOOGLE_SPREADSHEET_ID");
  const processedFolderId = requiredEnvironment("GOOGLE_PROCESSED_FOLDER_ID");
  const { drive, sheets } = await createGoogleClients();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${IMPORT_LOG_SHEET_NAME}'!A2:N`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const importedRecords = (response.data.values ?? []).flatMap((row, index) => {
    if (row[5] !== "IMPORTED" || !row[0] || !row[2] || !row[3]) return [];
    return [{
      logRow: index + 2,
      driveFileId: String(row[0]),
      originalFilename: String(row[1] ?? ""),
      canonicalTitle: String(row[2]),
      captureTime: new Date(row[3]).toISOString(),
      loggedSpreadsheetRow: Number(row[4]) || null,
      scoreFingerprint: String(row[9] ?? ""),
      promptVersion: String(row[12] ?? ""),
    }];
  });
  return {
    importedRecords,
    async processedFile(fileId) {
      const fileResponse = await drive.files.get({
        fileId,
        fields: "id,name,mimeType,size,parents",
      });
      return fileResponse.data.parents?.includes(processedFolderId) ? fileResponse.data : null;
    },
    async download(fileId) {
      const fileResponse = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" },
      );
      return Buffer.from(fileResponse.data);
    },
  };
}

export async function main() {
  const { apply, applyReport, limit, driveFileId } = argumentsFrom(process.argv.slice(2));
  if (applyReport) {
    await applySavedReport(path.resolve(applyReport));
    return;
  }
  const concurrency = positiveInteger(process.env.SYNC_AUDIT_CONCURRENCY, 4);
  const [sources, scoreRows] = await Promise.all([
    auditSources(),
    readScoreSheetWithRows(),
  ]);
  const latestByDriveFile = new Map();
  sources.importedRecords.forEach((record) => {
    latestByDriveFile.set(record.driveFileId, record);
  });
  const candidates = [...latestByDriveFile.values()]
    .filter((record) => record.promptVersion !== SCORE_OCR_PROMPT_VERSION)
    .filter((record) => !driveFileId || record.driveFileId === driveFileId)
    .map((record) => {
      const resolution = resolveScoreRow(record, scoreRows);
      return {
        ...record,
        spreadsheetRow: resolution.rowNumber,
        score: resolution.score,
        resolutionError: resolution.error,
      };
    })
    .slice(0, limit);
  if (driveFileId && !candidates.length) {
    throw new Error(`No legacy imported record was found for Drive file ${driveFileId}.`);
  }

  const reportPath = path.join(process.cwd(), ".sync", "sync-status-audit.json");
  const completedResults = [];
  let reportWrites = Promise.resolve();
  function checkpoint(results = completedResults) {
    const snapshot = [...results].sort((left, right) => left.candidateIndex - right.candidateIndex);
    reportWrites = reportWrites.then(() => writeReport(reportPath, auditReport({
      mode: apply ? "apply" : "preview",
      candidateCount: candidates.length,
      results: snapshot,
    })));
    return reportWrites;
  }
  await checkpoint();
  console.log(`Auditing ${candidates.length} legacy imported image(s)${apply ? " with updates enabled" : " in preview mode"}.`);
  const results = await mapConcurrent(candidates, concurrency, async (record, index) => {
    const score = record.score;
    const base = {
      driveFileId: record.driveFileId,
      originalFilename: record.originalFilename,
      canonicalTitle: record.canonicalTitle,
      captureTime: record.captureTime,
      scoreFingerprint: record.scoreFingerprint,
      candidateIndex: index,
      spreadsheetRow: record.spreadsheetRow,
      current: score?.sync ?? null,
      positionState: null,
      detected: null,
      recommended: null,
      shouldUpdate: false,
      status: "processing",
      responseId: null,
      usage: null,
      error: null,
    };
    try {
      if (record.resolutionError) throw new Error(record.resolutionError);
      const file = await sources.processedFile(record.driveFileId);
      if (!file) throw new Error("Drive file is no longer in the processed-images folder.");
      const source = await sources.download(file.id);
      const image = await prepareOcrImage({
        buffer: source,
        mimeType: file.mimeType,
        fileName: file.name,
      });
      const audit = await parseSyncStatus(image);
      base.positionState = audit.positionState;
      base.detected = audit.sync;
      const decision = syncAuditDecision(base.current, audit, score.combo);
      base.recommended = decision.value;
      base.shouldUpdate = decision.apply;
      base.status = decision.apply ? "update-recommended" : "unchanged";
      base.responseId = audit.responseId;
      base.usage = audit.usage;
      console.log(
        `[${index + 1}/${candidates.length}] ${file.name}: ${base.current ?? "null"} -> ${audit.sync ?? "null"}`,
      );
    } catch (error) {
      base.status = "error";
      base.error = String(error?.message ?? error);
      console.error(`[${index + 1}/${candidates.length}] ${record.originalFilename}: ${base.error}`);
    }
    completedResults.push(base);
    await checkpoint();
    return base;
  });

  await checkpoint(results);
  const report = auditReport({ mode: apply ? "apply" : "preview", candidateCount: candidates.length, results });
  if (apply) await applyUpdates(results);
  console.log(`${apply ? "Applied" : "Previewed"} ${report.recommendedUpdateCount} recommended update(s).`);
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
