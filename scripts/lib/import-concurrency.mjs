export function createSerialQueue() {
  let tail = Promise.resolve();

  return function serial(task) {
    const result = tail.then(task, task);
    tail = result.catch(() => {});
    return result;
  };
}

export async function mapConcurrent(values, concurrency, callback) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("concurrency must be a positive integer.");
  }
  let nextIndex = 0;
  const results = Array(values.length);
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}
