export function precisionAtK(
  rankedIds: string[],
  relevantIds: Set<string>,
  k: number,
): number {
  if (k <= 0) return 0;
  const topK = rankedIds.slice(0, k);
  const hits = topK.filter((id) => relevantIds.has(id)).length;
  return hits / k;
}

export function recallAtK(
  rankedIds: string[],
  relevantIds: Set<string>,
  k: number,
): number {
  if (relevantIds.size === 0) return 0;
  const topK = rankedIds.slice(0, k);
  const hits = topK.filter((id) => relevantIds.has(id)).length;
  return hits / relevantIds.size;
}

export function meanReciprocalRank(
  rankedIds: string[],
  relevantIds: Set<string>,
): number {
  const index = rankedIds.findIndex((id) => relevantIds.has(id));
  if (index === -1) return 0;
  return 1 / (index + 1);
}

export function ndcgAtK(
  rankedIds: string[],
  relevantIds: Set<string>,
  k: number,
): number {
  if (k <= 0 || relevantIds.size === 0) return 0;
  const topK = rankedIds.slice(0, k);

  let dcg = 0;
  for (let i = 0; i < topK.length; i += 1) {
    const rel = relevantIds.has(topK[i]) ? 1 : 0;
    if (rel > 0) {
      dcg += rel / Math.log2(i + 2);
    }
  }

  const idealHits = Math.min(k, relevantIds.size);
  let idcg = 0;
  for (let i = 0; i < idealHits; i += 1) {
    idcg += 1 / Math.log2(i + 2);
  }

  if (idcg === 0) return 0;
  return dcg / idcg;
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
