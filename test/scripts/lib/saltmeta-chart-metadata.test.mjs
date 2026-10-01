import assert from "node:assert/strict";
import test from "node:test";
import { indexSaltMetaChartMetadata } from "../../../scripts/lib/saltmeta-chart-metadata.mjs";

function payload(overrides = {}) {
  return { musics: [{ title: "Magical Flavor", artist: "Artist", charts: [{ type: "dx", difficulty: 3, noteDesigner: "Jack", regions: { jp: { level: "13", internalLevel: 13.2 }, intl: { level: "13+", internalLevel: 13.8 } } }] }], ...overrides };
}
function index(value = payload()) { return indexSaltMetaChartMetadata(value, { minimumSongs: 1, minimumCharts: 1 }); }
test("uses the International exact constant and display level", () => { const metadata = index().metadata("Magical Flavor", "Artist", "DX", "MASTER"); assert.equal(metadata.level, "13+"); assert.equal(metadata.chartConstant, 13.8); });
test("maps the note designer to the charter", () => assert.equal(index().metadata("Magical Flavor", "Artist", "DX", "MASTER").charter, "Jack"));
test("falls back to a unique title and chart", () => assert.equal(index().metadata("Magical Flavor", "Other", "DX", "MASTER").chartConstant, 13.8));
test("ignores charts unavailable internationally", () => { const value = payload(); delete value.musics[0].charts[0].regions.intl; assert.deepEqual(indexSaltMetaChartMetadata(value, { minimumSongs: 1, minimumCharts: 0 }).metadata("Magical Flavor", "Artist", "DX", "MASTER"), {}); });
test("rejects missing International constants", () => { const value = payload(); delete value.musics[0].charts[0].regions.intl.internalLevel; assert.throws(() => index(value), /internalLevel must be a finite number/); });
test("rejects coverage regressions", () => assert.throws(() => indexSaltMetaChartMetadata(payload(), { minimumSongs: 2, minimumCharts: 1 }), /coverage regressed/));
