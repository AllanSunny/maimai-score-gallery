import OpenAI from "openai";
import { toHiragana, toRomaji } from "wanakana";

const JAPANESE_TEXT = /[ぁ-んァ-ヶ一-龯々〆ヵヶ]/u;
const BATCH_SIZE = 10;

const enrichmentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    songs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          canonical: { type: "string" },
          kanaReading: { type: "string", minLength: 1 },
          englishTitles: {
            type: "array",
            items: { type: "string", minLength: 1 },
            maxItems: 2,
          },
        },
        required: ["canonical", "kanaReading", "englishTitles"],
      },
    },
  },
  required: ["songs"],
};

function normalized(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/gu, " ").trim().toLocaleLowerCase();
}

function normalizedTitles(values, canonical) {
  const canonicalKey = normalized(canonical);
  return [...new Set(values.map((value) => normalized(value))
    .filter((value) => value && value !== canonicalKey))];
}

function allTitleValues(titles) {
  return [titles.canonical, ...titles.kana, ...titles.romaji, ...titles.english, ...titles.aliases];
}

function appendUniqueTitles(titles, category, values) {
  const seen = new Set(allTitleValues(titles).map(normalized));
  normalizedTitles(values, titles.canonical).forEach((value) => {
    const key = normalized(value);
    if (seen.has(key)) return;
    titles[category].push(value);
    seen.add(key);
  });
}

function needsEnrichment(song) {
  return JAPANESE_TEXT.test(song.titles.canonical)
    && (song.titles.kana.length === 0 || song.titles.romaji.length === 0);
}

function enrichmentPrompt(songs) {
  const inputs = songs.map((song) => ({
    canonical: song.titles.canonical,
    artist: song.artist,
    knownKana: song.titles.kana,
    knownAliases: song.titles.aliases,
  }));
  return `Enrich these Japanese maimai song titles: ${JSON.stringify(inputs)}

Return exactly one result for every input, preserving each canonical title exactly.

- kanaReading must be the full pronunciation in hiragana. Insert normal spaces at meaningful word boundaries.
- Spell long vowels with hiragana letters, not the prolonged sound mark. Example: ローリンガール -> ろうりん がある.
- englishTitles should contain an established English title when known. Otherwise provide a concise, natural English rendering when the Japanese title has a meaningful translation. For katakana loanwords, restore the intended English words; ローリンガール -> Rolling Girl.
- Do not put romaji in englishTitles. Do not include the canonical title, artist, or speculative fan nicknames.`;
}

function requestFor(songs, { model, maxOutputTokens, reasoningEffort }) {
  return {
    model,
    store: false,
    max_output_tokens: maxOutputTokens,
    reasoning: { effort: reasoningEffort },
    text: {
      format: {
        type: "json_schema",
        name: "maimai_title_enrichment",
        strict: true,
        schema: enrichmentSchema,
      },
    },
    input: enrichmentPrompt(songs),
  };
}

function options(environment = process.env) {
  const maxOutputTokens = Number(environment.OPENAI_TITLE_MAX_OUTPUT_TOKENS?.trim() || 5000);
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 500 || maxOutputTokens > 10000) {
    throw new Error("OPENAI_TITLE_MAX_OUTPUT_TOKENS must be an integer from 500 through 10000.");
  }
  return {
    model: environment.OPENAI_TITLE_MODEL?.trim()
      || environment.OPENAI_OCR_MODEL?.trim()
      || "gpt-5.5",
    maxOutputTokens,
    reasoningEffort: environment.OPENAI_REASONING_EFFORT?.trim() || "low",
  };
}

async function enrichBatch(songs, client, settings) {
  const response = await client.responses.create(requestFor(songs, settings));
  if (!response.output_text) {
    const reason = response.incomplete_details?.reason ?? response.status ?? "unknown";
    throw new Error(`OpenAI title enrichment returned no structured output (${reason}).`);
  }
  const parsed = JSON.parse(response.output_text);
  const expected = new Set(songs.map((song) => song.titles.canonical));
  const results = new Map();
  parsed.songs.forEach((result) => {
    if (!expected.has(result.canonical) || results.has(result.canonical)) {
      throw new Error(`OpenAI title enrichment returned an unexpected title: ${JSON.stringify(result.canonical)}.`);
    }
    results.set(result.canonical, result);
  });
  if (results.size !== songs.length) throw new Error("OpenAI title enrichment omitted one or more songs.");
  return results;
}

export async function enrichMissingSongTitles(songs, dependencies = {}) {
  const pending = songs.filter(needsEnrichment);
  if (pending.length === 0) return 0;
  const settings = dependencies.options ?? options();
  const client = dependencies.client ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let changed = 0;

  for (let index = 0; index < pending.length; index += BATCH_SIZE) {
    const batch = pending.slice(index, index + BATCH_SIZE);
    const results = await enrichBatch(batch, client, settings);
    batch.forEach((song) => {
      const result = results.get(song.titles.canonical);
      const kana = normalized(toHiragana(result.kanaReading));
      const romaji = normalized(toRomaji(kana));
      appendUniqueTitles(song.titles, "kana", [kana]);
      appendUniqueTitles(song.titles, "romaji", [romaji]);
      appendUniqueTitles(song.titles, "english", result.englishTitles);
      changed += 1;
      console.log(`Enriched titles for ${song.titles.canonical}: ${romaji}`);
    });
  }
  return changed;
}
