import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { selectCaptureTime } from "./lib/capture-time.mjs";
import { createDriveImageStore } from "./lib/drive-images.mjs";
import { scoreFingerprint, sourceFingerprint } from "./lib/import-fingerprints.mjs";
import { createImportLog } from "./lib/import-log.mjs";
import { imageCaptureMetadata, ocrImageOptions, prepareOcrImage } from "./lib/ocr-image.mjs";
import {
  parseScoreImage,
  SCORE_OCR_PROMPT_VERSION,
  scoreOcrOptions,
} from "./lib/openai-score-ocr.mjs";
import { createReviewQueue, REVIEW_STATUSES } from "./lib/review-queue.mjs";
import { proposedScoreRecord } from "./lib/score-import-record.mjs";
import {
  applyReviewCorrections,
  manualScoreFromReview,
} from "./lib/score-review-corrections.mjs";
import { createScoreSheetWriter } from "./lib/score-sheet-writer.mjs";
import { readScoreSheetWithRows } from "./lib/sheet-scores.mjs";
import { createSongTitleResolver } from "./lib/song-title-resolver.mjs";

function argumentsFrom(commandLine) {
  const limitIndex = commandLine.indexOf("--limit");
  const limit = limitIndex === -1 ? Infinity : Number(commandLine[limitIndex + 1]);
  if (limit !== Infinity && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error("--limit must be a positive integer.");
  }
  return { limit };
}

function reportedError(error) {
  return {
    name: error?.name ?? "Error",
    code: error?.code ?? null,
    message: String(error?.message ?? error),
    candidates: error?.candidates ?? [],
  };
}

function correctedUtcTime(value) {
  if (!value) return null;
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    throw new Error("Corrected Capture Time must include Z or an explicit UTC offset.");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Corrected Capture Time is invalid.");
  return parsed.toISOString();
}

function cachedScore(record, sourceHash) {
  if (
    !record?.ocrJson
    || record.sourceHash !== sourceHash
    || record.promptVersion !== SCORE_OCR_PROMPT_VERSION
  ) return null;
  try {
    return JSON.parse(record.ocrJson);
  } catch {
    return null;
  }
}

async function main() {
  const { limit } = argumentsFrom(process.argv.slice(2));
  const timeZone = process.env.SCORE_CAPTURE_TIME_ZONE?.trim();
  if (!timeZone) throw new Error("SCORE_CAPTURE_TIME_ZONE is required.");
  const drive = await createDriveImageStore();
  const resolver = createSongTitleResolver();
  const [importLog, scoreWriter, reviewQueue, existingScoreRows] = await Promise.all([
    createImportLog(), createScoreSheetWriter(), createReviewQueue(), readScoreSheetWithRows(),
  ]);
  const existingScoresByFingerprint = new Map(existingScoreRows.map(({ rowNumber, score }) => [
    scoreFingerprint(score),
    { canonicalTitle: score.songTitle, captureTime: score.playedAt, spreadsheetRow: rowNumber },
  ]));
  const files = await drive.listIncoming();
  const results = [];
  let actionCount = 0;

  console.log(`Import found ${files.length} incoming image(s) to inspect.`);
  for (const [index, file] of files.entries()) {
    console.log(`[${index + 1}/${files.length}] Processing ${file.name} (${file.id})`);
    const result = {
      status: "processing",
      driveFile: { id: file.id, name: file.name, mimeType: file.mimeType, size: file.size },
      captureTime: null,
      preparedImage: null,
      ocr: null,
      resolution: null,
      proposedScore: null,
      openai: null,
      importLogRow: null,
      spreadsheetRow: null,
      processedDriveFile: null,
      sourceHash: null,
      scoreFingerprint: null,
      usedCachedOcr: false,
      usedManualEntry: false,
      appliedCorrections: null,
      error: null,
    };
    let committed = false;
    try {
      const latestImport = await importLog.latest(file.id);
      const initialReview = await reviewQueue.find(file.id);
      result.appliedCorrections = initialReview ? {
          correctedTitle: initialReview.correctedTitle,
          correctedArtist: initialReview.correctedArtist,
          correctedCaptureTime: initialReview.correctedCaptureTime,
          correctedScoreFields: initialReview.correctedScoreFields,
          correctedJudgments: initialReview.correctedJudgments,
      } : null;
        if (initialReview?.status === REVIEW_STATUSES.ignored) {
          result.status = "ignored";
          console.log("  Skipped because the review row is marked Ignored.");
          results.push(result);
          continue;
        }
        if (latestImport?.status === "REJECTED" && !reviewQueue.shouldRetry(initialReview)) {
          result.status = "awaiting-review";
          result.importLogRow = latestImport.rowNumber;
          console.log("  Awaiting a checked Retry box in Score Import Review; no OCR request made.");
          results.push(result);
          continue;
        }
        if (actionCount >= limit) break;
        actionCount += 1;
        if (["IMPORTED", "DUPLICATE"].includes(latestImport?.status)) {
          if (!latestImport.canonicalTitle || !latestImport.captureTime) {
            throw new Error(`Imported log row ${latestImport.rowNumber} is missing its title or capture time.`);
          }
          result.importLogRow = latestImport.rowNumber;
          result.spreadsheetRow = latestImport.spreadsheetRow;
          const moveLoggedFile = latestImport.status === "DUPLICATE"
            ? drive.moveToDuplicates
            : drive.moveToProcessed;
          result.processedDriveFile = await moveLoggedFile(file, {
            canonicalTitle: latestImport.canonicalTitle,
            capturedAt: latestImport.captureTime,
          });
          await reviewQueue.markImported(file.id, latestImport.spreadsheetRow);
          result.status = "reconciled";
          console.log(`  Reconciled previously imported row ${latestImport.spreadsheetRow}; no OCR request made.`);
          results.push(result);
          continue;
        }
        if (latestImport?.status === "PROCESSING" && latestImport.spreadsheetRow) {
          throw new Error(
            `Processing log row ${latestImport.rowNumber} already references spreadsheet row ${latestImport.spreadsheetRow}; manual reconciliation is required.`,
          );
        }
        if (["PROCESSING", "REJECTED"].includes(latestImport?.status)) {
          result.importLogRow = latestImport.rowNumber;
          await importLog.resume(latestImport.rowNumber);
        } else {
          result.importLogRow = await importLog.begin({
              driveFileId: file.id,
              originalFilename: file.name,
              captureTime: "",
            });
        }
        if (reviewQueue.shouldRetry(initialReview)) await reviewQueue.markRetryStarted(initialReview.rowNumber);
      const original = await drive.download(file.id);
      const sourceHash = sourceFingerprint(original);
      result.sourceHash = sourceHash;
      {
        const duplicate = await importLog.findSuccessfulBySourceHash(sourceHash);
        if (duplicate && duplicate.driveFileId !== file.id) {
          await importLog.markDuplicate(result.importLogRow, duplicate, sourceHash);
          committed = true;
          result.spreadsheetRow = duplicate.spreadsheetRow;
          result.processedDriveFile = await drive.moveToDuplicates(file, {
            canonicalTitle: duplicate.canonicalTitle,
            capturedAt: duplicate.captureTime,
          });
          result.status = "duplicate";
          await reviewQueue.markImported(file.id, duplicate.spreadsheetRow);
          console.log(`  Duplicate image of spreadsheet row ${duplicate.spreadsheetRow}; no OCR request made.`);
          results.push(result);
          continue;
        }
      }
      const embedded = await imageCaptureMetadata(original);
      const captureTime = selectCaptureTime({ embedded, driveFile: file, timeZone });
      {
        const review = await reviewQueue.find(file.id);
        const override = correctedUtcTime(review?.correctedCaptureTime);
        if (override) {
          captureTime.capturedAt = override;
          captureTime.source = "review-correction";
        }
      }
      result.captureTime = captureTime;
      const latest = await importLog.latest(file.id);
      const review = await reviewQueue.find(file.id);
      let rawOcr = manualScoreFromReview(review);
      if (rawOcr) {
        result.usedManualEntry = true;
        console.log("  Using complete review-sheet manual entry; no OpenAI request made.");
      } else {
        rawOcr = cachedScore(latest, sourceHash);
      }
      if (rawOcr && !result.usedManualEntry) {
        result.usedCachedOcr = true;
        result.openai = {
          responseId: latest.openaiResponseId,
          model: latest.ocrModel,
          promptVersion: latest.promptVersion,
          usage: null,
        };
        console.log("  Reusing cached OCR JSON; no OpenAI request made.");
      } else if (!rawOcr) {
        const prepared = await prepareOcrImage({
          buffer: original,
          mimeType: file.mimeType,
          fileName: file.name,
        }, ocrImageOptions());
        result.preparedImage = { width: prepared.width, height: prepared.height, bytes: prepared.bytes };
        const options = scoreOcrOptions();
        const parsed = await parseScoreImage(prepared, { options });
        rawOcr = parsed.score;
        result.openai = {
          responseId: parsed.responseId,
          model: options.model,
          promptVersion: SCORE_OCR_PROMPT_VERSION,
          usage: parsed.usage,
        };
        await importLog.cacheOcr(result.importLogRow, {
          sourceHash,
          score: rawOcr,
          model: options.model,
          promptVersion: SCORE_OCR_PROMPT_VERSION,
          responseId: parsed.responseId,
        });
      }
      result.ocr = rawOcr;
      const resolvedOcr = applyReviewCorrections(rawOcr, review);
      const resolution = await resolver.resolve(resolvedOcr);
      result.resolution = {
        canonicalTitle: resolution.canonicalTitle,
        matchType: resolution.matchType,
        chart: resolution.chart,
      };
      const proposedScore = proposedScoreRecord({
        ocr: resolvedOcr,
        resolution,
        capturedAt: captureTime.capturedAt,
      });
      result.proposedScore = proposedScore;
      const fingerprint = scoreFingerprint(proposedScore);
      result.scoreFingerprint = fingerprint;
      {
        const loggedDuplicate = await importLog.findSuccessfulByScoreFingerprint(fingerprint);
        const duplicate = loggedDuplicate && loggedDuplicate.driveFileId !== file.id
          ? loggedDuplicate
          : existingScoresByFingerprint.get(fingerprint);
        if (duplicate) {
          await importLog.markDuplicate(result.importLogRow, duplicate, sourceHash);
          committed = true;
          result.spreadsheetRow = duplicate.spreadsheetRow;
          result.processedDriveFile = await drive.moveToDuplicates(file, {
            canonicalTitle: resolution.canonicalTitle,
            capturedAt: captureTime.capturedAt,
          });
          result.status = "duplicate";
          await reviewQueue.markImported(file.id, duplicate.spreadsheetRow);
          console.log(`  Duplicate score of spreadsheet row ${duplicate.spreadsheetRow}; no row inserted.`);
          results.push(result);
          continue;
        }
        result.spreadsheetRow = await scoreWriter.append(proposedScore, {
          rowNumber: result.importLogRow,
          scoreFingerprint: fingerprint,
        });
        existingScoresByFingerprint.set(fingerprint, {
          canonicalTitle: proposedScore.songTitle,
          captureTime: proposedScore.playedAt,
          spreadsheetRow: result.spreadsheetRow,
        });
        committed = true;
        result.status = "imported";
        try {
          await reviewQueue.markImported(file.id, result.spreadsheetRow);
          result.processedDriveFile = await drive.moveToProcessed(file, {
            canonicalTitle: resolution.canonicalTitle,
            capturedAt: captureTime.capturedAt,
          });
          console.log(`  Imported spreadsheet row ${result.spreadsheetRow} and moved the source image.`);
        } catch (error) {
          result.status = "imported-move-pending";
          result.error = reportedError(error);
          console.error(`  Score was imported, but the Drive move must be retried: ${error?.message ?? error}`);
        }
      }
    } catch (error) {
      result.status = "rejected";
      result.error = reportedError(error);
      if (error?.openAiDiagnostics) {
        console.error(`  OpenAI diagnostics: ${JSON.stringify(error.openAiDiagnostics)}`);
      }
      if (result.importLogRow && !committed) {
        try {
          await importLog.reject(result.importLogRow, error);
        } catch (logError) {
          result.error.importLogError = String(logError?.message ?? logError);
        }
        try {
          await reviewQueue.upsertRejection({
            driveFileId: file.id,
            filename: file.name,
            error,
            ocrTitle: result.ocr?.visibleTitle ?? "",
            candidates: error?.candidates ?? [],
          });
        } catch (reviewError) {
          result.error.reviewQueueError = String(reviewError?.message ?? reviewError);
        }
      }
      console.error(`  Rejected: ${error?.message ?? error}`);
    }
    results.push(result);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    requestedLimit: Number.isFinite(limit) ? limit : null,
    processedCount: results.length,
    importedCount: results.filter(({ status }) => status === "imported").length,
    reconciledCount: results.filter(({ status }) => status === "reconciled").length,
    movePendingCount: results.filter(({ status }) => status === "imported-move-pending").length,
    duplicateCount: results.filter(({ status }) => status === "duplicate").length,
    awaitingReviewCount: results.filter(({ status }) => status === "awaiting-review").length,
    ignoredCount: results.filter(({ status }) => status === "ignored").length,
    rejectedCount: results.filter(({ status }) => status === "rejected").length,
    results,
  };
  const reportPath = path.join(
    process.cwd(),
    ".sync",
    "image-import.json",
  );
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Import report written to ${path.relative(process.cwd(), reportPath)}.`);
  // Reviewable image-level failures are recorded in the report and review
  // sheet. They should not fail the job or prevent accepted scores from
  // continuing through the archive and catalog stages.
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
