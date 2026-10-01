import assert from "node:assert/strict";
import test from "node:test";
import { activeVersionEntry, parseInternationalVersion, parseJapaneseVersion } from "../../../scripts/lib/chart-metadata-version.mjs";

test("parses the latest known International launch marker", () => {
  const html = `
    <p>maimai DX CiRCLE PLUS International Version is launched!</p>
    <p>maimai DX CiRCLE International Version is launched!</p>
  `;
  assert.equal(parseInternationalVersion(html), "CiRCLE PLUS");
});

test("parses the Japanese launch headline", () => {
  assert.equal(parseJapaneseVersion("<span>9/17(木) 『maimai でらっくす MAGiCAL』本日稼働開始！</span>"), "MAGiCAL");
});

test("fails safely when an official marker changes format", () => {
  assert.throws(() => parseInternationalVersion("<p>New version now!</p>"), /Could not find/);
  assert.throws(() => parseJapaneseVersion("<p>新バージョン</p>"), /Could not find/);
});

test("does not skip an unknown newest International version in favor of an older marker", () => {
  const html = `
    <p>maimai DX FUTURE International Version is launched!</p>
    <p>maimai DX CiRCLE PLUS International Version is launched!</p>
  `;
  assert.throws(() => parseInternationalVersion(html), /Unknown International maimai version/);
});

test("resolves the active immutable dataset URL", () => {
  const entry = activeVersionEntry({
    activeInternationalVersion: "CiRCLE PLUS",
    source: {
      path: "packages/dxdata/dxdata.json",
      rawUrlTemplate: "https://example.test/{ref}/{path}",
    },
    versions: {
      "CiRCLE PLUS": {
        status: "final",
        ref: "a".repeat(40),
        sha256: "b".repeat(64),
      },
    },
  });
  assert.equal(entry.url, `https://example.test/${"a".repeat(40)}/packages/dxdata/dxdata.json`);
});
