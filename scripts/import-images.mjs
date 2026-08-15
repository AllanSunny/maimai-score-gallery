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
import { createScoreSheetWriter } from "./lib/score-sheet-writer.mjs";
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

function correctedOcr(score, review) {
  if (!review) return score;
  const corrected = structuredClone(score);
  if (review.correctedTitle) {
    corrected.visibleTitle = review.correctedTitle;
    corrected.titleTruncated = false;
  }
  if (review.correctedArtist) corrected.visibleArtist = review.correctedArtist;
  if (review.correctedRatingChange !== "") {
    const ratingChange = Number(review.correctedRatingChange);
    if (!Number.isInteger(ratingChange)) throw new Error("Corrected Rating Change must be an integer.");
    corrected.ratingChange = ratingChange;
  }
  return corrected;
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
  const timeZone = process.env.SCORE_CAPTURE_TIME_ZONE?.trim() || "America/New_York";
  const drive = await createDriveImageStore();
  const resolver = createSongTitleResolver();
  const [importLog, scoreWriter, reviewQueue] = await Promise.all([
    createImportLog(), createScoreSheetWriter(), createReviewQueue(),
  ]);
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
          correctedRatingChange: initialReview.correctedRatingChange,
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
          result.processedDriveFile = await drive.moveToProcessed(file, {
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
          result.processedDriveFile = await drive.moveToProcessed(file, {
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
      let rawOcr = cachedScore(latest, sourceHash);
      if (rawOcr) {
        result.usedCachedOcr = true;
        result.openai = {
          responseId: latest.openaiResponseId,
          model: latest.ocrModel,
          promptVersion: latest.promptVersion,
          usage: null,
        };
        console.log("  Reusing cached OCR JSON; no OpenAI request made.");
      } else {
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
      const review = await reviewQueue.find(file.id);
      const resolvedOcr = correctedOcr(rawOcr, review);
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
        const duplicate = await importLog.findSuccessfulByScoreFingerprint(fingerprint);
        if (duplicate && duplicate.driveFileId !== file.id) {
          await importLog.markDuplicate(result.importLogRow, duplicate, sourceHash);
          committed = true;
          result.spreadsheetRow = duplicate.spreadsheetRow;
          result.processedDriveFile = await drive.moveToProcessed(file, {
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
