const knownVersions = [
  "PRiSM PLUS",
  "PRiSM",
  "BUDDiES PLUS",
  "BUDDiES",
  "FESTiVAL PLUS",
  "FESTiVAL",
  "CiRCLE PLUS",
  "CiRCLE",
  "MAGiCAL",
];

function decodeHtml(value) {
  return value.replaceAll("&amp;", "&").replaceAll("&#038;", "&").replaceAll("&nbsp;", " ");
}

export function parseInternationalVersion(html) {
  const text = decodeHtml(String(html));
  const matches = [...text.matchAll(/maimai DX\s+([A-Za-z]+(?:\s+PLUS)?)\s+International Version is launched!/gi)]
    .map((match) => match[1]);
  const version = matches[0];
  if (!version) throw new Error("Could not find a known International launch marker on the official SEGA page.");
  if (!knownVersions.includes(version)) throw new Error(`Unknown International maimai version in the latest official launch marker: ${version}.`);
  return version;
}

export function parseJapaneseVersion(html) {
  const text = decodeHtml(String(html));
  const match = text.match(/『maimai でらっくす\s+([^』]+)』本日稼働開始！/);
  const version = match?.[1]?.trim();
  if (!version || !knownVersions.includes(version)) {
    throw new Error("Could not find a known Japanese launch marker on the official SEGA page.");
  }
  return version;
}

export function activeVersionEntry(ledger) {
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) throw new Error("Chart metadata version ledger must be an object.");
  const version = ledger.activeInternationalVersion;
  const entry = ledger.versions?.[version];
  if (typeof version !== "string" || !knownVersions.includes(version) || !entry) {
    throw new Error("Chart metadata version ledger has no valid active International version entry.");
  }
  if (!["provisional", "final"].includes(entry.status) || !/^[0-9a-f]{40}$/.test(entry.ref)
    || !/^[0-9a-f]{64}$/.test(entry.sha256)) {
    throw new Error(`Chart metadata version ledger entry for ${version} is invalid.`);
  }
  const sourcePath = ledger.source?.path;
  const template = ledger.source?.rawUrlTemplate;
  if (typeof sourcePath !== "string" || !sourcePath || typeof template !== "string"
    || !template.includes("{ref}") || !template.includes("{path}")) {
    throw new Error("Chart metadata version ledger source is invalid.");
  }
  return {
    version,
    ...entry,
    url: template.replace("{ref}", entry.ref).replace("{path}", sourcePath),
  };
}
