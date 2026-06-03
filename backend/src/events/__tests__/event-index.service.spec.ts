import { EventIndexService } from '../event-index.service';
import { DatabaseService } from '../../database/database.service';
import { EmbeddingService } from '../../matching/embedding.service';
import { Event } from '../../common/interfaces/event.interface';

describe('EventIndexService', () => {
  let service: EventIndexService;
  const query = jest.fn();
  const createEmbedding = jest.fn();
  const toSqlVector = jest.fn();
  const databaseService = {
    enabled: true,
    query,
  };
  const embeddingService = {
    model: 'test-embedding-model',
    createEmbedding,
    toSqlVector,
  };

  const event: Event = {
    id: 'event-1',
    title: 'AI Workshop',
    description: 'Hands-on machine learning session',
    startAt: new Date('2026-06-10T10:00:00.000Z'),
    endAt: new Date('2026-06-10T11:00:00.000Z'),
    location: 'Room A',
    capacity: 30,
    registeredCount: 12,
    tags: ['artificial-intelligence', 'machine-learning'],
    createdBy: 'organizer-1',
    createdAt: new Date('2026-05-01T10:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    databaseService.enabled = true;
    createEmbedding.mockReturnValue([0.1, 0.2, 0.3]);
    toSqlVector.mockReturnValue('[0.1,0.2,0.3]');
    query.mockResolvedValue({ rows: [] });
    service = new EventIndexService(
      databaseService as unknown as DatabaseService,
      embeddingService as unknown as EmbeddingService,
    );
  });

  it('reflects whether vector database indexing is enabled', () => {
    expect(service.enabled).toBe(true);

    databaseService.enabled = false;

    expect(service.enabled).toBe(false);
  });

  it('does not upsert when indexing is disabled', async () => {
    databaseService.enabled = false;

    await service.upsertEvent(event);

    expect(createEmbedding).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it('upserts event embedding data when indexing is enabled', async () => {
    await service.upsertEvent(event);

    expect(createEmbedding).toHaveBeenCalledWith(
      [
        event.title,
        event.description,
        event.location,
        ...(event.tags ?? []),
      ].join(' | '),
    );
    expect(toSqlVector).toHaveBeenCalledWith([0.1, 0.2, 0.3]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('insert into event_profile_index'),
      expect.arrayContaining([
        event.id,
        event.title,
        event.description,
        event.location,
        event.tags,
        event.startAt,
        event.endAt,
        event.capacity,
        event.registeredCount,
        expect.any(String),
        '[0.1,0.2,0.3]',
        'test-embedding-model',
        expect.any(String),
      ]),
    );
  });

  it('keeps event saving safe when upsert fails', async () => {
    query.mockRejectedValue(new Error('database unavailable'));

    await expect(service.safeUpsertEvent(event)).resolves.toBeUndefined();
  });

  it('removes an event from the index only when enabled', async () => {
    await service.removeEvent('event-1');

    expect(query).toHaveBeenCalledWith(
      'delete from event_profile_index where event_id = $1',
      ['event-1'],
    );

    jest.clearAllMocks();
    databaseService.enabled = false;

    await service.removeEvent('event-1');

    expect(query).not.toHaveBeenCalled();
  });

  it('keeps event deleting safe when index removal fails', async () => {
    query.mockRejectedValue(new Error('delete failed'));

    await expect(service.safeRemoveEvent('event-1')).resolves.toBeUndefined();
  });

  it('returns no semantic matches when indexing is disabled', async () => {
    databaseService.enabled = false;

    await expect(service.semanticSearchEvents('AI', 5)).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it('searches events semantically using the query embedding', async () => {
    query.mockResolvedValue({
      rows: [{ event_id: 'event-1', score: 0.88 }],
    });

    await expect(
      service.semanticSearchEvents('AI workshop', 5),
    ).resolves.toEqual([{ event_id: 'event-1', score: 0.88 }]);
    expect(createEmbedding).toHaveBeenCalledWith('AI workshop');
    expect(query).toHaveBeenCalledWith(
      'select * from semantic_event_search($1::vector, now(), $2)',
      ['[0.1,0.2,0.3]', 5],
    );
  });
});
