import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { selectCaptureTime } from "./lib/capture-time.mjs";
import { createDriveImageStore } from "./lib/drive-images.mjs";
import { imageCaptureMetadata, ocrImageOptions, prepareOcrImage } from "./lib/ocr-image.mjs";
import { parseScoreImage, scoreOcrOptions } from "./lib/openai-score-ocr.mjs";
import { proposedScoreRecord } from "./lib/score-import-record.mjs";
import { createSongTitleResolver } from "./lib/song-title-resolver.mjs";

const REPORT_PATH = path.join(process.cwd(), ".sync", "image-import-dry-run.json");

function argumentsFrom(commandLine) {
  if (!commandLine.includes("--dry-run")) {
    throw new Error("Image importing is currently dry-run only. Pass --dry-run.");
  }
  const limitIndex = commandLine.indexOf("--limit");
  const limit = limitIndex === -1 ? 10 : Number(commandLine[limitIndex + 1]);
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) {
    throw new Error("--limit must be an integer from 1 through 25.");
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

async function main() {
  const { limit } = argumentsFrom(process.argv.slice(2));
  const timeZone = process.env.SCORE_CAPTURE_TIME_ZONE?.trim() || "America/New_York";
  const drive = await createDriveImageStore({ readOnly: true });
  const resolver = createSongTitleResolver();
  const files = (await drive.listIncoming()).slice(0, limit);
  const results = [];

  console.log(`Dry run found ${files.length} incoming image(s) to inspect.`);
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
      error: null,
    };
    try {
      const original = await drive.download(file.id);
      const embedded = await imageCaptureMetadata(original);
      const captureTime = selectCaptureTime({ embedded, driveFile: file, timeZone });
      result.captureTime = captureTime;
      const prepared = await prepareOcrImage({
        buffer: original,
        mimeType: file.mimeType,
        fileName: file.name,
      }, ocrImageOptions());
      result.preparedImage = { width: prepared.width, height: prepared.height, bytes: prepared.bytes };
      const parsed = await parseScoreImage(prepared, { options: scoreOcrOptions() });
      result.ocr = parsed.score;
      result.openai = { responseId: parsed.responseId, usage: parsed.usage };
      const resolution = await resolver.resolve(parsed.score);
      result.resolution = {
        canonicalTitle: resolution.canonicalTitle,
        matchType: resolution.matchType,
        chart: resolution.chart,
      };
      const proposedScore = proposedScoreRecord({
        ocr: parsed.score,
        resolution,
        capturedAt: captureTime.capturedAt,
      });
      result.status = "accepted";
      result.proposedScore = proposedScore;
      console.log(`  Accepted as ${resolution.canonicalTitle} (${resolution.chart.chartType} ${resolution.chart.difficulty}).`);
    } catch (error) {
      result.status = "rejected";
      result.error = reportedError(error);
      console.error(`  Rejected: ${error?.message ?? error}`);
    }
    results.push(result);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    requestedLimit: limit,
    processedCount: results.length,
    acceptedCount: results.filter(({ status }) => status === "accepted").length,
    rejectedCount: results.filter(({ status }) => status === "rejected").length,
    results,
  };
  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Dry-run report written to ${path.relative(process.cwd(), REPORT_PATH)}.`);
  if (report.rejectedCount > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
