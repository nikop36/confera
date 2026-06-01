import {
  buildEventEmbeddingText,
  buildUserEmbeddingText,
  evaluateEventMatchingQuality,
  type MatchingDataset,
} from '../quality/event-matching-evaluator';
import {
  average,
  meanReciprocalRank,
  ndcgAtK,
  precisionAtK,
  recallAtK,
} from '../quality/metrics';

describe('event matching quality evaluator', () => {
  const dataset: MatchingDataset = {
    name: 'test-dataset',
    createdAt: '2026-06-01T00:00:00.000Z',
    kValues: [1, 3],
    profiles: [
      {
        uid: 'u1',
        interests: ['Artificial intelligence', 'Machine learning'],
        competencies: ['Data science'],
        researchKeywords: ['LLM', 'semantic search'],
        tags: ['artificial-intelligence', 'machine-learning'],
        connectionUids: ['f1'],
      },
      {
        uid: 'u2',
        interests: ['Cybersecurity'],
        competencies: ['Monitoring'],
        researchKeywords: ['zero trust'],
        tags: ['cybersecurity'],
      },
    ],
    events: [
      {
        id: 'ai-1',
        description: 'LLM and semantic search workshop',
        tags: ['artificial-intelligence', 'machine-learning', 'llm'],
        friendAttendeeUids: ['f1'],
      },
      {
        id: 'cyber-1',
        description: 'Zero trust security architecture',
        tags: ['cybersecurity', 'devsecops'],
      },
      {
        id: 'random-1',
        description: 'General networking',
        tags: ['community'],
      },
    ],
    queries: [
      {
        uid: 'u1',
        relevantEventIds: ['ai-1'],
      },
      {
        uid: 'u2',
        relevantEventIds: ['cyber-1'],
      },
    ],
  };

  it('computes metrics and comparison vs baseline', () => {
    const result = evaluateEventMatchingQuality(dataset);
    const kKey = String(dataset.kValues[0]);

    expect(result.aiModel.queryCount).toBe(2);
    expect(result.baseline.queryCount).toBe(2);
    expect(result.aiModel.overall.meanMrr).toBeGreaterThan(0);
    expect(result.baseline.overall.meanMrr).toBeGreaterThan(0);
    expect(Number.isFinite(result.comparison.mrrDelta)).toBe(true);
    expect(Number.isFinite(result.comparison.precisionAtKDelta[kKey])).toBe(
      true,
    );
    expect(Number.isFinite(result.comparison.recallAtKDelta[kKey])).toBe(true);
    expect(Number.isFinite(result.comparison.ndcgAtKDelta[kKey])).toBe(true);
  });

  it('builds stable user/event texts used for embeddings', () => {
    const userText = buildUserEmbeddingText(dataset.profiles[0]);
    const eventText = buildEventEmbeddingText(dataset.events[0]);

    expect(userText).toContain('interests: Artificial intelligence');
    expect(userText).toContain('priority_keywords: LLM');
    expect(eventText).toContain(
      'description: LLM and semantic search workshop',
    );
    expect(eventText).toContain('priority_tags: artificial-intelligence');
  });
});

describe('quality metrics helpers', () => {
  it('computes precision/recall/mrr/ndcg correctly for simple ranking', () => {
    const ranked = ['a', 'b', 'c', 'd'];
    const relevant = new Set(['b', 'd']);

    expect(precisionAtK(ranked, relevant, 1)).toBe(0);
    expect(precisionAtK(ranked, relevant, 2)).toBe(0.5);
    expect(recallAtK(ranked, relevant, 2)).toBe(0.5);
    expect(meanReciprocalRank(ranked, relevant)).toBe(0.5);
    expect(ndcgAtK(ranked, relevant, 3)).toBeGreaterThan(0);
    expect(ndcgAtK(ranked, relevant, 3)).toBeLessThanOrEqual(1);
  });

  it('returns zero-safe defaults and average helper works', () => {
    const emptySet = new Set<string>();
    expect(recallAtK(['a'], emptySet, 3)).toBe(0);
    expect(precisionAtK(['a'], emptySet, 0)).toBe(0);
    expect(meanReciprocalRank(['a'], emptySet)).toBe(0);
    expect(ndcgAtK(['a'], emptySet, 5)).toBe(0);
    expect(average([])).toBe(0);
    expect(average([1, 2, 3])).toBe(2);
  });
});
