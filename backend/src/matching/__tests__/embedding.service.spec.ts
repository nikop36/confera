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
});
