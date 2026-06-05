import { EmbeddingService } from '../embedding.service';

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    service = new EmbeddingService();
  });

  it('should create a deterministic 384-dimensional embedding', () => {
    const first = service.createEmbedding('Umetna inteligenca in LLM');
    const second = service.createEmbedding('Umetna inteligenca in LLM');

    expect(first).toHaveLength(384);
    expect(second).toEqual(first);
  });

  it('should normalize non-empty embeddings', () => {
    const embedding = service.createEmbedding('Strojno učenje, analitika');
    const length = Math.sqrt(
      embedding.reduce((sum, value) => sum + value * value, 0),
    );

    expect(length).toBeCloseTo(1, 5);
  });

  it('should format vectors for pgvector SQL parameters', () => {
    expect(service.toSqlVector([0.12345678, -0.2, 1])).toBe(
      '[0.123457,-0.2,1]',
    );
  });

  it('should score profiles with shared tags above unrelated profiles', () => {
    const current = service.createEmbedding(
      'Oznake: artificial intelligence, llm, data science',
    );
    const aligned = service.createEmbedding(
      'Oznake: artificial intelligence, llm, startups',
    );
    const unrelated = service.createEmbedding('Oznake: sports, travel, music');

    expect(cosine(current, aligned)).toBeGreaterThan(
      cosine(current, unrelated),
    );
  });
});

function cosine(left: number[], right: number[]) {
  return left.reduce(
    (sum, value, index) => sum + value * (right[index] ?? 0),
    0,
  );
}
