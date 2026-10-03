const QUERY_BATCH_SIZE = 1000;

export async function fetchAllRows<T>(
  fetchRange: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: unknown;
  }>,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += QUERY_BATCH_SIZE) {
    const { data, error } = await fetchRange(from, from + QUERY_BATCH_SIZE - 1);
    if (error) throw error;

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < QUERY_BATCH_SIZE) return rows;
  }
}