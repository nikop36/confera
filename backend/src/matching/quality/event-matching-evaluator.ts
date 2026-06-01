import { EmbeddingService } from '../embedding.service';
import {
  average,
  meanReciprocalRank,
  ndcgAtK,
  precisionAtK,
  recallAtK,
} from './metrics';

export type MatchingProfile = {
  uid: string;
  bio?: string;
  affiliation?: string;
  interests?: string[];
  competencies?: string[];
  researchKeywords?: string[];
  tags?: string[];
  connectionUids?: string[];
};

export type MatchingEvent = {
  id: string;
  description: string;
  tags?: string[];
  friendAttendeeUids?: string[];
};

export type MatchingQuery = {
  uid: string;
  relevantEventIds: string[];
};

export type MatchingDataset = {
  name: string;
  createdAt: string;
  kValues: number[];
  profiles: MatchingProfile[];
  events: MatchingEvent[];
  queries: MatchingQuery[];
};

type RankingModel = 'ai_model' | 'tag_baseline';

export type EvaluationResult = {
  model: RankingModel;
  queryCount: number;
  metrics: Record<
    string,
    {
      precisionAtK?: number;
      recallAtK?: number;
      ndcgAtK?: number;
      mrr: number;
    }
  >;
  overall: {
    meanMrr: number;
    meanPrecisionAtK: Record<string, number>;
    meanRecallAtK: Record<string, number>;
    meanNdcgAtK: Record<string, number>;
  };
};

export function evaluateEventMatchingQuality(dataset: MatchingDataset): {
  aiModel: EvaluationResult;
  baseline: EvaluationResult;
  comparison: {
    mrrDelta: number;
    precisionAtKDelta: Record<string, number>;
    recallAtKDelta: Record<string, number>;
    ndcgAtKDelta: Record<string, number>;
  };
} {
  const embeddingService = new EmbeddingService();
  const aiModel = evaluateModel(dataset, embeddingService, 'ai_model');
  const baseline = evaluateModel(dataset, embeddingService, 'tag_baseline');

  const precisionAtKDelta: Record<string, number> = {};
  const recallAtKDelta: Record<string, number> = {};
  const ndcgAtKDelta: Record<string, number> = {};

  for (const k of dataset.kValues) {
    const key = String(k);
    precisionAtKDelta[key] =
      aiModel.overall.meanPrecisionAtK[key] -
      baseline.overall.meanPrecisionAtK[key];
    recallAtKDelta[key] =
      aiModel.overall.meanRecallAtK[key] - baseline.overall.meanRecallAtK[key];
    ndcgAtKDelta[key] =
      aiModel.overall.meanNdcgAtK[key] - baseline.overall.meanNdcgAtK[key];
  }

  return {
    aiModel,
    baseline,
    comparison: {
      mrrDelta: aiModel.overall.meanMrr - baseline.overall.meanMrr,
      precisionAtKDelta,
      recallAtKDelta,
      ndcgAtKDelta,
    },
  };
}

function evaluateModel(
  dataset: MatchingDataset,
  embeddingService: EmbeddingService,
  model: RankingModel,
): EvaluationResult {
  const profileMap = new Map(
    dataset.profiles.map((profile) => [profile.uid, profile]),
  );
  const eventIds = dataset.events.map((event) => event.id);

  const metricBuckets: Record<
    string,
    {
      precisionAtK?: number;
      recallAtK?: number;
      ndcgAtK?: number;
      mrr: number;
    }
  > = {};

  const mrrValues: number[] = [];
  const precisionBuckets: Record<string, number[]> = {};
  const recallBuckets: Record<string, number[]> = {};
  const ndcgBuckets: Record<string, number[]> = {};

  for (const k of dataset.kValues) {
    const key = String(k);
    precisionBuckets[key] = [];
    recallBuckets[key] = [];
    ndcgBuckets[key] = [];
  }

  for (const query of dataset.queries) {
    const profile = profileMap.get(query.uid);
    if (!profile) continue;

    const relevantSet = new Set(query.relevantEventIds);
    const rankedEvents = rankEvents(
      dataset.events,
      profile,
      embeddingService,
      model,
    );
    const rankedIds = rankedEvents.map((event) => event.id);
    mrrValues.push(meanReciprocalRank(rankedIds, relevantSet));

    for (const k of dataset.kValues) {
      const key = String(k);
      precisionBuckets[key].push(precisionAtK(rankedIds, relevantSet, k));
      recallBuckets[key].push(recallAtK(rankedIds, relevantSet, k));
      ndcgBuckets[key].push(ndcgAtK(rankedIds, relevantSet, k));
    }

    // Safety: ensure ranking covers known events
    if (rankedIds.length !== eventIds.length) {
      throw new Error(
        `Ranking output mismatch for uid=${query.uid}. Expected ${eventIds.length}, got ${rankedIds.length}.`,
      );
    }
  }

  for (const k of dataset.kValues) {
    const key = String(k);
    metricBuckets[key] = {
      precisionAtK: average(precisionBuckets[key]),
      recallAtK: average(recallBuckets[key]),
      ndcgAtK: average(ndcgBuckets[key]),
      mrr: average(mrrValues),
    };
  }

  const meanPrecisionAtK: Record<string, number> = {};
  const meanRecallAtK: Record<string, number> = {};
  const meanNdcgAtK: Record<string, number> = {};
  for (const k of dataset.kValues) {
    const key = String(k);
    meanPrecisionAtK[key] = average(precisionBuckets[key]);
    meanRecallAtK[key] = average(recallBuckets[key]);
    meanNdcgAtK[key] = average(ndcgBuckets[key]);
  }

  return {
    model,
    queryCount: dataset.queries.length,
    metrics: metricBuckets,
    overall: {
      meanMrr: average(mrrValues),
      meanPrecisionAtK,
      meanRecallAtK,
      meanNdcgAtK,
    },
  };
}

function rankEvents(
  events: MatchingEvent[],
  profile: MatchingProfile,
  embeddingService: EmbeddingService,
  model: RankingModel,
) {
  const userTags = collectUserTags(profile);
  const userEmbedding = embeddingService.createEmbedding(
    buildUserEmbeddingText(profile),
  );

  const scored = events.map((event) => {
    const tags = event.tags ?? [];
    const overlapCount = tags.filter((tag) => userTags.has(tag)).length;
    const tagScore = tags.length > 0 ? overlapCount / tags.length : 0;

    const friendCount = (event.friendAttendeeUids ?? []).filter((uid) =>
      (profile.connectionUids ?? []).includes(uid),
    ).length;
    const friendBoost = Math.min(0.2, friendCount * 0.08);

    if (model === 'tag_baseline') {
      return {
        event,
        score: tagScore + friendBoost,
      };
    }

    const eventEmbedding = embeddingService.createEmbedding(
      buildEventEmbeddingText(event),
    );
    const semanticScore = cosineSimilarity(userEmbedding, eventEmbedding);
    const score = semanticScore * 0.35 + tagScore * 0.55 + friendBoost;

    return {
      event,
      score,
    };
  });

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.event.id.localeCompare(b.event.id);
    })
    .map((item) => item.event);
}

export function buildUserEmbeddingText(profile: MatchingProfile): string {
  const interests = profile.interests ?? [];
  const competencies = profile.competencies ?? [];
  const keywords = profile.researchKeywords ?? [];
  const tags = profile.tags ?? [];

  const fields = [
    `bio: ${profile.bio ?? ''}`,
    `affiliation: ${profile.affiliation ?? ''}`,
    `interests: ${interests.join(', ')}`,
    `competencies: ${competencies.join(', ')}`,
    `keywords: ${keywords.join(', ')}`,
    `priority_interests: ${interests.join(', ')}`,
    `priority_keywords: ${keywords.join(', ')}`,
    `tags: ${tags.join(', ')}`,
  ];

  return fields
    .map((field) => field.trim())
    .filter(Boolean)
    .join(' | ');
}

export function buildEventEmbeddingText(event: MatchingEvent): string {
  const tags = event.tags ?? [];
  return [
    `description: ${event.description}`,
    `tags: ${tags.join(', ')}`,
    `priority_tags: ${tags.join(', ')}`,
  ]
    .map((field) => field.trim())
    .filter(Boolean)
    .join(' | ');
}

function collectUserTags(profile: MatchingProfile): Set<string> {
  const tags = new Set<string>();
  const add = (values?: string[]) => {
    (values ?? [])
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => {
        tags.add(value);
        tags.add(toSlug(value));
        const alias = USER_TAG_ALIASES[toSlug(value)];
        if (alias) tags.add(alias);
      });
  };

  add(profile.interests);
  add(profile.competencies);
  add(profile.researchKeywords);
  add(profile.tags);
  return tags;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
  }
  return Math.max(0, dot);
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const USER_TAG_ALIASES: Record<string, string> = {
  'umetna-inteligenca': 'artificial-intelligence',
  'strojno-ucenje': 'machine-learning',
  robotika: 'robotics',
  'podatkovna-znanost': 'data-science',
  'kibernetska-varnost': 'cybersecurity',
  'racunalniski-vid': 'computer-vision',
  nlp: 'natural-language-processing',
  'internet-stvari': 'internet-of-things',
  digitalizacija: 'digitalization',
  'razvoj-programske-opreme': 'software-development',
  frontend: 'frontend-development',
  backend: 'backend-development',
  analitika: 'analytics',
  avtomatizacija: 'automation',
  trajnost: 'sustainability',
  vzdrznost: 'resilience',
};
