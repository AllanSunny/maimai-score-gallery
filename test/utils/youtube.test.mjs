import test from "node:test";
import assert from "node:assert/strict";
import { youtubeChartSearchUrl } from "../../src/utils/youtube.ts";

const searchOptions = {
  title: "Magical Flavor",
  chartType: "DX",
  difficulty: "MASTER",
};

test("uses the Japanese deluxe text for a multi-version DX chart", () => {
  const url = youtubeChartSearchUrl({ ...searchOptions, hasMultipleVersions: true });

  assert.equal(new URL(url).searchParams.get("search_query"), "Magical Flavor でらっくす MASTER maimai");
});

test("uses the Japanese standard text for a multi-version STD chart", () => {
  const url = youtubeChartSearchUrl({ ...searchOptions, chartType: "STD", hasMultipleVersions: true });

  assert.equal(new URL(url).searchParams.get("search_query"), "Magical Flavor スタンダード MASTER maimai");
});

test("omits the chart type when the song has one version", () => {
  const url = youtubeChartSearchUrl({ ...searchOptions, hasMultipleVersions: false });

  assert.equal(new URL(url).searchParams.get("search_query"), "Magical Flavor MASTER maimai");
});
