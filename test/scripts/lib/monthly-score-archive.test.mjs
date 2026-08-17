import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  readMonthlyScoreArchive,
  scoreMonth,
  writeMonthlyScoreArchive,
} from "../../../scripts/lib/monthly-score-archive.mjs";

function score(id, playedAt) {
  return { id, playedAt };
}

test("scoreMonth assigns timestamps by UTC month", () => {
  assert.equal(scoreMonth(score("one", "2026-02-01T00:30:00.000Z")), "2026-02");
});

test("monthly archives round-trip scores in chronological order", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "monthly-scores-"));
  const scores = [
    score("february", "2026-02-01T00:00:00.000Z"),
    score("january-late", "2026-01-20T00:00:00.000Z"),
    score("january-early", "2026-01-02T00:00:00.000Z"),
  ];

  const result = await writeMonthlyScoreArchive(scores, directory);
  const archive = await readMonthlyScoreArchive(directory);

  assert.deepEqual(result, { changedFiles: 2, scoreCount: 3 });
  assert.deepEqual(archive.files, ["2026-01.json", "2026-02.json"]);
  assert.deepEqual(archive.scores.map(({ id }) => id), ["january-early", "january-late", "february"]);
  assert.equal(JSON.parse(await readFile(path.join(directory, "2026-01.json"), "utf8")).period, "2026-01");
});

test("unchanged monthly archives are not rewritten", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "monthly-scores-"));
  const scores = [score("one", "2026-01-02T00:00:00.000Z")];

  await writeMonthlyScoreArchive(scores, directory);
  const result = await writeMonthlyScoreArchive(scores, directory);

  assert.equal(result.changedFiles, 0);
});
