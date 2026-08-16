export function catalogOutput(previous, songs, generatedAt = new Date().toISOString()) {
  const sortedSongs = [...songs]
    .sort((left, right) => left.titles.canonical.localeCompare(right.titles.canonical));
  if (JSON.stringify(sortedSongs) === JSON.stringify(previous.songs)) {
    return { catalog: previous, changed: false };
  }
  return {
    catalog: { generatedAt, songs: sortedSongs },
    changed: true,
  };
}
