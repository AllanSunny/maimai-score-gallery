import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { selectCaptureTime } from "./lib/capture-time.mjs";
import { createDriveImageStore } from "./lib/drive-images.mjs";
import {
  normalizedCaptureTimestamp,
  scoreFingerprint,
  sourceFingerprint,
} from "./lib/import-fingerprints.mjs";
import { createImportLog } from "./lib/import-log.mjs";
import { createSerialQueue, mapConcurrent } from "./lib/import-concurrency.mjs";
import { resolveLiveScoreReference } from "./lib/logged-score-reference.mjs";
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

function positiveIntegerSetting(name, value, fallback) {
  const parsed = Number(value || fallback);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function importReport(results, limit) {
  const completed = results.filter(Boolean);
  return {
    generatedAt: new Date().toISOString(),
    requestedLimit: Number.isFinite(limit) ? limit : null,
    processedCount: completed.length,
    importedCount: completed.filter(({ status }) => status === "imported").length,
    reconciledCount: completed.filter(({ status }) => status === "reconciled").length,
    movePendingCount: completed.filter(({ status }) => status === "imported-move-pending").length,
    duplicateCount: completed.filter(({ status }) => status === "duplicate").length,
    awaitingReviewCount: completed.filter(({ status }) => status === "awaiting-review").length,
    ignoredCount: completed.filter(({ status }) => status === "ignored").length,
    rejectedCount: completed.filter(({ status }) => status === "rejected").length,
    results: completed,
  };
}

async function main() {
  const { limit } = argumentsFrom(process.argv.slice(2));
  const concurrency = positiveIntegerSetting(
    "SCORE_IMPORT_CONCURRENCY",
    process.env.SCORE_IMPORT_CONCURRENCY,
    4,
  );
  const timeZone = process.env.SCORE_CAPTURE_TIME_ZONE?.trim();
  if (!timeZone) throw new Error("SCORE_CAPTURE_TIME_ZONE is required.");
  const drive = await createDriveImageStore();
  const resolver = createSongTitleResolver();
  // Every Sheets and catalog operation uses this queue. Image downloads,
  // conversion, metadata extraction, and OpenAI OCR may run concurrently.
  const serial = createSerialQueue();
  const sheetWrite = (task) => serial(async () => {
    try {
      return await task();
    } catch (error) {
      if (error?.code === 429 || /quota metric 'Write requests'/i.test(error?.message ?? "")) {
        // Do not replay a possibly partial write. Cool down the shared queue so
        // later images do not cascade into the same per-minute quota failure.
        await new Promise((resolve) => setTimeout(resolve, 60_000));
      }
      throw error;
    }
  }, { minimumDelayMs: 1_800 });
  const importLog = await serial(createImportLog);
  const scoreWriter = await serial(createScoreSheetWriter);
  const reviewQueue = await serial(createReviewQueue);
  const existingScoreRows = await serial(readScoreSheetWithRows);
  const existingScoresByFingerprint = new Map(existingScoreRows.map(({ rowNumber, score }) => {
    const fingerprint = scoreFingerprint(score);
    return [fingerprint, {
      canonicalTitle: score.songTitle,
      captureTime: score.playedAt,
      spreadsheetRow: rowNumber,
      scoreFingerprint: fingerprint,
    }];
  }));
  const existingScoresByCaptureTimestamp = new Map(existingScoreRows.map(({ rowNumber, score }) => {
    const fingerprint = scoreFingerprint(score);
    return [normalizedCaptureTimestamp(score.playedAt), {
      canonicalTitle: score.songTitle,
      captureTime: score.playedAt,
      spreadsheetRow: rowNumber,
      scoreFingerprint: fingerprint,
    }];
  }));
  const files = await drive.listIncoming();
  const results = [];
  let actionCount = 0;
  const reportPath = path.join(process.cwd(), ".sync", "image-import.json");
  let reportWrites = Promise.resolve();
  function writeReport() {
    reportWrites = reportWrites.then(async () => {
      await mkdir(path.dirname(reportPath), { recursive: true });
      await writeFile(reportPath, `${JSON.stringify(importReport(results, limit), null, 2)}\n`);
    });
    return reportWrites;
  }
  process.once("SIGTERM", () => {
    writeReport().finally(() => process.exit(143));
  });

  const manualEntries = await serial(() => reviewQueue.manualEntries());
  console.log(`Import found ${manualEntries.length} checked manual review row(s).`);
  for (const review of manualEntries) {
    const result = {
      status: "processing",
      source: "manual-review",
      reviewRow: review.rowNumber,
      driveFile: null,
      captureTime: null,
      resolution: null,
      proposedScore: null,
      spreadsheetRow: null,
      scoreFingerprint: null,
      usedManualEntry: true,
      error: null,
    };
    try {
      await sheetWrite(() => reviewQueue.markRetryStarted(review.rowNumber));
      const capturedAt = correctedUtcTime(review.correctedCaptureTime);
      if (!capturedAt) {
        throw new Error("A fully manual entry requires Corrected Capture Time (UTC).");
      }
      result.captureTime = { capturedAt, source: "review-correction" };
      const rawScore = manualScoreFromReview(review);
      if (!rawScore) {
        throw new Error(
          "A fully manual entry requires corrected title, chart type, difficulty, achievement, combo, sync, and rating. Judgment totals and note-type judgments may be entirely blank; if supplied, they must be complete enough to validate.",
        );
      }
      const resolution = await serial(() => resolver.resolve(rawScore));
      result.resolution = {
        canonicalTitle: resolution.canonicalTitle,
        matchType: resolution.matchType,
        chart: resolution.chart,
      };
      const proposedScore = proposedScoreRecord({
        ocr: rawScore,
        resolution,
        capturedAt,
      });
      result.proposedScore = proposedScore;
      const fingerprint = scoreFingerprint(proposedScore);
      result.scoreFingerprint = fingerprint;
      const duplicate = existingScoresByFingerprint.get(fingerprint);
      if (duplicate) {
        result.status = "duplicate";
        result.spreadsheetRow = duplicate.spreadsheetRow;
        await sheetWrite(() => reviewQueue.markRowImported(review.rowNumber, duplicate.spreadsheetRow));
        console.log(
          `Manual review row ${review.rowNumber} duplicates spreadsheet row ${duplicate.spreadsheetRow}; no row inserted.`,
        );
      } else {
        result.spreadsheetRow = await sheetWrite(() => scoreWriter.append(proposedScore));
        existingScoresByFingerprint.set(fingerprint, {
          canonicalTitle: proposedScore.songTitle,
          captureTime: proposedScore.playedAt,
          spreadsheetRow: result.spreadsheetRow,
          scoreFingerprint: fingerprint,
        });
        existingScoresByCaptureTimestamp.set(
          normalizedCaptureTimestamp(proposedScore.playedAt),
          {
            canonicalTitle: proposedScore.songTitle,
            captureTime: proposedScore.playedAt,
            spreadsheetRow: result.spreadsheetRow,
            scoreFingerprint: fingerprint,
          },
        );
        await sheetWrite(() => reviewQueue.markRowImported(review.rowNumber, result.spreadsheetRow));
        result.status = "imported";
        console.log(
          `Imported manual review row ${review.rowNumber} as spreadsheet row ${result.spreadsheetRow}.`,
        );
      }
    } catch (error) {
      result.status = "rejected";
      result.error = reportedError(error);
      try {
        await sheetWrite(() => reviewQueue.markRowRejected(review.rowNumber, error, error?.candidates ?? []));
      } catch (reviewError) {
        result.error.reviewQueueError = String(reviewError?.message ?? reviewError);
      }
      console.error(`Manual review row ${review.rowNumber} rejected: ${error?.message ?? error}`);
    }
    results.push(result);
    await writeReport();
  }

  console.log(`Import found ${files.length} incoming image(s) to inspect.`);
  await mapConcurrent(files, concurrency, async (file, index) => {
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
      const latestImport = await serial(() => importLog.latest(file.id));
      const initialReview = await serial(() => reviewQueue.find(file.id));
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
          await writeReport();
          return;
        }
        if (latestImport?.status === "REJECTED" && !initialReview) {
          let cachedTitle = "";
          try {
            cachedTitle = JSON.parse(latestImport.ocrJson || "null")?.visibleTitle ?? "";
          } catch {
            // A malformed old cache should not prevent recreating its review row.
          }
          await sheetWrite(() => reviewQueue.upsertRejection({
            driveFileId: file.id,
            filename: file.name,
            error: latestImport.error || "The previous import attempt was rejected.",
            ocrTitle: cachedTitle,
          }));
          result.status = "awaiting-review";
          result.importLogRow = latestImport.rowNumber;
          console.log("  Recreated the missing Score Import Review row; no OCR request made.");
          results.push(result);
          await writeReport();
          return;
        }
        if (latestImport?.status === "REJECTED" && !reviewQueue.shouldRetry(initialReview)) {
          result.status = "awaiting-review";
          result.importLogRow = latestImport.rowNumber;
          console.log("  Awaiting a checked Retry box in Score Import Review; no OCR request made.");
          results.push(result);
          await writeReport();
          return;
        }
        const withinLimit = await serial(() => {
          if (actionCount >= limit) return false;
          actionCount += 1;
          return true;
        });
        if (!withinLimit) return;
        if (["IMPORTED", "DUPLICATE"].includes(latestImport?.status)) {
          if (!latestImport.canonicalTitle || !latestImport.captureTime) {
            throw new Error(`Imported log row ${latestImport.rowNumber} is missing its title or capture time.`);
          }
          result.importLogRow = latestImport.rowNumber;
          const liveReference = resolveLiveScoreReference(latestImport, existingScoresByFingerprint);
          if (!liveReference) {
            throw new Error(
              `Import log row ${latestImport.rowNumber} has no matching live MainInfo score; its stored row number is informational only.`,
            );
          }
          result.spreadsheetRow = liveReference.spreadsheetRow;
          const moveLoggedFile = latestImport.status === "DUPLICATE"
            ? drive.moveToDuplicates
            : drive.moveToProcessed;
          result.processedDriveFile = await serial(() => moveLoggedFile(file, {
            canonicalTitle: liveReference.canonicalTitle,
            capturedAt: liveReference.captureTime,
          }));
          await sheetWrite(() => reviewQueue.markImported(file.id, liveReference.spreadsheetRow));
          result.status = "reconciled";
          console.log(`  Reconciled previously imported row ${liveReference.spreadsheetRow}; no OCR request made.`);
          results.push(result);
          await writeReport();
          return;
        }
        if (latestImport?.status === "PROCESSING") {
          const liveReference = resolveLiveScoreReference(latestImport, existingScoresByFingerprint);
          if (liveReference) {
            throw new Error(
              `Processing log row ${latestImport.rowNumber} matches live MainInfo row ${liveReference.spreadsheetRow}; manual reconciliation is required.`,
            );
          }
        }
        if (["PROCESSING", "REJECTED"].includes(latestImport?.status)) {
          result.importLogRow = latestImport.rowNumber;
          await sheetWrite(() => importLog.resume(latestImport.rowNumber));
        } else {
          result.importLogRow = await sheetWrite(() => importLog.begin({
              driveFileId: file.id,
              originalFilename: file.name,
              captureTime: "",
            }));
        }
        if (reviewQueue.shouldRetry(initialReview)) {
          await sheetWrite(() => reviewQueue.markRetryStarted(initialReview.rowNumber));
        }
        const listedCaptureTime = selectCaptureTime({ embedded: {}, driveFile: file, timeZone });
        if (listedCaptureTime.source === "drive-image-metadata") {
          const duplicate = existingScoresByCaptureTimestamp.get(
            normalizedCaptureTimestamp(listedCaptureTime.capturedAt),
          );
          if (duplicate) {
            result.captureTime = listedCaptureTime;
            await sheetWrite(() => importLog.markDuplicate(
              result.importLogRow,
              duplicate,
              "",
              "duplicate capture timestamp",
            ));
            committed = true;
            result.spreadsheetRow = duplicate.spreadsheetRow;
            result.processedDriveFile = await serial(() => drive.moveToDuplicates(file, {
              canonicalTitle: duplicate.canonicalTitle,
              capturedAt: duplicate.captureTime,
            }));
            result.status = "duplicate";
            await sheetWrite(() => reviewQueue.markImported(file.id, duplicate.spreadsheetRow));
            console.log(
              `  Duplicate capture timestamp for spreadsheet row ${duplicate.spreadsheetRow}; no download or OCR request made.`,
            );
            results.push(result);
            await writeReport();
            return;
          }
        }
      const original = await drive.download(file.id);
      const sourceHash = sourceFingerprint(original);
      result.sourceHash = sourceHash;
      {
        const loggedDuplicate = await serial(() => importLog.findSuccessfulBySourceHash(sourceHash));
        const duplicate = resolveLiveScoreReference(loggedDuplicate, existingScoresByFingerprint);
        if (duplicate && duplicate.driveFileId !== file.id) {
          await sheetWrite(() => importLog.markDuplicate(result.importLogRow, duplicate, sourceHash));
          committed = true;
          result.spreadsheetRow = duplicate.spreadsheetRow;
          result.processedDriveFile = await serial(() => drive.moveToDuplicates(file, {
            canonicalTitle: duplicate.canonicalTitle,
            capturedAt: duplicate.captureTime,
          }));
          result.status = "duplicate";
          await sheetWrite(() => reviewQueue.markImported(file.id, duplicate.spreadsheetRow));
          console.log(`  Duplicate image of spreadsheet row ${duplicate.spreadsheetRow}; no OCR request made.`);
          results.push(result);
          await writeReport();
          return;
        }
      }
      const embedded = await imageCaptureMetadata(original);
      const captureTime = selectCaptureTime({ embedded, driveFile: file, timeZone });
      {
        const review = await serial(() => reviewQueue.find(file.id));
        const override = correctedUtcTime(review?.correctedCaptureTime);
        if (override) {
          captureTime.capturedAt = override;
          captureTime.source = "review-correction";
        }
      }
      result.captureTime = captureTime;
      if (captureTime.source === "exif") {
        const duplicate = existingScoresByCaptureTimestamp.get(
          normalizedCaptureTimestamp(captureTime.capturedAt),
        );
        if (duplicate) {
          await sheetWrite(() => importLog.markDuplicate(
            result.importLogRow,
            duplicate,
            sourceHash,
            "duplicate capture timestamp",
          ));
          committed = true;
          result.spreadsheetRow = duplicate.spreadsheetRow;
          result.processedDriveFile = await serial(() => drive.moveToDuplicates(file, {
            canonicalTitle: duplicate.canonicalTitle,
            capturedAt: duplicate.captureTime,
          }));
          result.status = "duplicate";
          await sheetWrite(() => reviewQueue.markImported(file.id, duplicate.spreadsheetRow));
          console.log(
            `  Duplicate capture timestamp for spreadsheet row ${duplicate.spreadsheetRow}; no OCR request made.`,
          );
          results.push(result);
          await writeReport();
          return;
        }
      }
      const latest = await serial(() => importLog.latest(file.id));
      const review = await serial(() => reviewQueue.find(file.id));
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
        await sheetWrite(() => importLog.cacheOcr(result.importLogRow, {
          sourceHash,
          score: rawOcr,
          model: options.model,
          promptVersion: SCORE_OCR_PROMPT_VERSION,
          responseId: parsed.responseId,
        }));
      }
      result.ocr = rawOcr;
      const resolvedOcr = applyReviewCorrections(rawOcr, review);
      const resolution = await serial(() => resolver.resolve(resolvedOcr));
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
        const commit = await sheetWrite(async () => {
          const duplicate = existingScoresByFingerprint.get(fingerprint);
          if (duplicate) {
            await importLog.markDuplicate(result.importLogRow, duplicate, sourceHash);
            return { duplicate, spreadsheetRow: duplicate.spreadsheetRow };
          }
          const spreadsheetRow = await scoreWriter.append(proposedScore, {
            rowNumber: result.importLogRow,
            scoreFingerprint: fingerprint,
          });
          existingScoresByFingerprint.set(fingerprint, {
            canonicalTitle: proposedScore.songTitle,
            captureTime: proposedScore.playedAt,
            spreadsheetRow,
            scoreFingerprint: fingerprint,
          });
          existingScoresByCaptureTimestamp.set(
            normalizedCaptureTimestamp(proposedScore.playedAt),
            {
              canonicalTitle: proposedScore.songTitle,
              captureTime: proposedScore.playedAt,
              spreadsheetRow,
              scoreFingerprint: fingerprint,
            },
          );
          return { duplicate: null, spreadsheetRow };
        });
        result.spreadsheetRow = commit.spreadsheetRow;
        if (commit.duplicate) {
          committed = true;
          result.processedDriveFile = await serial(() => drive.moveToDuplicates(file, {
            canonicalTitle: resolution.canonicalTitle,
            capturedAt: captureTime.capturedAt,
          }));
          result.status = "duplicate";
          await sheetWrite(() => reviewQueue.markImported(file.id, commit.spreadsheetRow));
          console.log(`  Duplicate score of spreadsheet row ${commit.spreadsheetRow}; no row inserted.`);
          results.push(result);
          await writeReport();
          return;
        }
        committed = true;
        result.status = "imported";
        try {
          await sheetWrite(() => reviewQueue.markImported(file.id, result.spreadsheetRow));
          result.processedDriveFile = await serial(() => drive.moveToProcessed(file, {
            canonicalTitle: resolution.canonicalTitle,
            capturedAt: captureTime.capturedAt,
          }));
          console.log(
            `  Imported spreadsheet row ${result.spreadsheetRow} and moved ${file.name}.`,
          );
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
          await sheetWrite(() => importLog.reject(result.importLogRow, error));
        } catch (logError) {
          result.error.importLogError = String(logError?.message ?? logError);
        }
        try {
          await sheetWrite(() => reviewQueue.upsertRejection({
            driveFileId: file.id,
            filename: file.name,
            error,
            ocrTitle: result.ocr?.visibleTitle ?? "",
            candidates: error?.candidates ?? [],
          }));
        } catch (reviewError) {
          result.error.reviewQueueError = String(reviewError?.message ?? reviewError);
        }
      }
      console.error(`  Rejected: ${error?.message ?? error}`);
    }
    results.push(result);
    await writeReport();
  });

  await writeReport();
  console.log(`Import report written to ${path.relative(process.cwd(), reportPath)}.`);
  // Reviewable image-level failures are recorded in the report and review
  // sheet. They should not fail the job or prevent accepted scores from
  // continuing through the archive and catalog stages.
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
