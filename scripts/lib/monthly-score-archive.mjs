import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const SCORE_DIRECTORY = path.join(process.cwd(), "src", "data", "scores");

const SCORE_FILE_PATTERN = /^\d{4}-\d{2}\.json$/;

export function scoreMonth(score) {
  const playedAt = new Date(score.playedAt);
  if (Number.isNaN(playedAt.getTime())) {
    throw new Error(`Invalid score timestamp: ${JSON.stringify(score.playedAt)}.`);
  }
  return playedAt.toISOString().slice(0, 7);
}

export async function scoreFiles(directory = SCORE_DIRECTORY) {
  try {
    return (await readdir(directory))
      .filter((name) => SCORE_FILE_PATTERN.test(name))
      .sort();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export async function readMonthlyScoreArchive(directory = SCORE_DIRECTORY) {
  const files = await scoreFiles(directory);
  const chunks = await Promise.all(files.map(async (name) => {
    const chunk = JSON.parse(await readFile(path.join(directory, name), "utf8"));
    const expectedPeriod = name.replace(/\.json$/, "");
    if (chunk.period !== expectedPeriod || !Array.isArray(chunk.scores)) {
      throw new Error(`${name} must contain period ${expectedPeriod} and a scores array.`);
    }
    chunk.scores.forEach((score) => {
      if (scoreMonth(score) !== expectedPeriod) {
        throw new Error(`${score.id ?? "Unknown score"} belongs in ${scoreMonth(score)}, not ${name}.`);
      }
    });
    return chunk;
  }));

  return {
    files,
    scores: chunks.flatMap((chunk) => chunk.scores)
      .sort((a, b) => a.playedAt.localeCompare(b.playedAt)),
  };
}

export async function writeMonthlyScoreArchive(scores, directory = SCORE_DIRECTORY) {
  const grouped = new Map();
  scores.forEach((score) => {
    const period = scoreMonth(score);
    const entries = grouped.get(period) ?? [];
    entries.push(score);
    grouped.set(period, entries);
  });

  await mkdir(directory, { recursive: true });
  const existingFiles = await scoreFiles(directory);
  let changedFiles = 0;

  for (const [period, entries] of [...grouped].sort(([a], [b]) => a.localeCompare(b))) {
    entries.sort((a, b) => a.playedAt.localeCompare(b.playedAt));
    const filePath = path.join(directory, `${period}.json`);
    const output = `${JSON.stringify({ period, scores: entries }, null, 2)}\n`;
    const previous = await readFile(filePath, "utf8").catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (previous !== output) {
      await writeFile(filePath, output);
      changedFiles += 1;
    }
  }

  const expectedFiles = new Set([...grouped.keys()].map((period) => `${period}.json`));
  for (const name of existingFiles) {
    if (!expectedFiles.has(name)) {
      await unlink(path.join(directory, name));
      changedFiles += 1;
    }
  }

  return { changedFiles, scoreCount: scores.length };
}
