import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../src/utils/song-titles.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const songTitles = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("song search text normalizes every title variant once", () => {
  const titles = {
    canonical: "オシャマ Scramble!",
    kana: ["おしゃますくらんぶる"],
    romaji: ["Oshama Scramble!"],
    english: ["Mischievous Scramble!"],
    aliases: ["Oshama"],
  };
  assert.equal(songTitles.songSearchText(titles), "オシャマ scramble! おしゃますくらんぶる oshama scramble! mischievous scramble! oshama");
});
