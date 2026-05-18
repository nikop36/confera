import { UserRoleEnum } from '../../common/enums/roles.enum';
import { DatabaseService } from '../../database/database.service';
import { EmbeddingService } from '../embedding.service';
import { MatchingIndexService } from '../matching-index.service';
import { SearchableProfile } from '../profile-search-document';

describe('MatchingIndexService', () => {
  const mockQuery: jest.MockedFunction<
    (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>
  > = jest.fn();
  const databaseService = {
    enabled: true,
    query: mockQuery,
  } as unknown as DatabaseService;

  const embeddingService = new EmbeddingService();
  let service: MatchingIndexService;

  const profile: SearchableProfile = {
    uid: 'uid-1',
    email: 'ales@example.com',
    displayName: 'Aleš Močnik',
    role: UserRoleEnum.PARTICIPANT,
    profileStatus: 'complete',
    createdAt: new Date('2026-05-18T10:00:00.000Z'),
    affiliation: 'Univerza v Mariboru',
    bio: 'Zanima me AI mreženje.',
    interests: ['Umetna inteligenca', 'Strojno učenje'],
    goals: ['Zaposlitev'],
    competencies: ['Backend'],
    researchKeywords: ['LLM'],
    meetingType: 'both',
  };

  beforeEach(() => {
    service = new MatchingIndexService(databaseService, embeddingService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should upsert a profile into the SQL matching index', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await service.upsertProfile(profile);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const firstCall = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(firstCall[0]).toContain('insert into participant_profile_index');
    expect(firstCall[1]).toEqual(
      expect.arrayContaining([
        profile.uid,
        profile.displayName,
        profile.email,
        profile.affiliation,
        profile.bio,
        profile.interests,
        profile.goals,
        profile.competencies,
        profile.researchKeywords,
        profile.meetingType,
        expect.stringContaining('Področja interesa: Umetna inteligenca'),
        expect.stringMatching(/^\[/),
        embeddingService.model,
        expect.stringMatching(/^[a-f0-9]{64}$/),
      ]),
    );
  });

  it('should skip upsert when database is disabled', async () => {
    const disabledService = new MatchingIndexService(
      { enabled: false, query: mockQuery } as unknown as DatabaseService,
      embeddingService,
    );

    await disabledService.upsertProfile(profile);

    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should return ranked matches with explanation reasons', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
      rows: [
        {
          uid: 'uid-2',
          display_name: 'Dr. Petra Kos',
          affiliation: 'Univerza v Ljubljani',
          bio: 'Raziskujem LLM sisteme.',
          interests: ['Umetna inteligenca'],
          goals: ['Raziskovalno sodelovanje'],
          competencies: ['Strojno učenje'],
          research_keywords: ['LLM'],
          meeting_type: 'online',
          score: '0.031',
        },
      ],
    });

    const result = await service.findMatches(profile, 5);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    const secondCall = mockQuery.mock.calls[1] as [string, unknown[]];
    expect(secondCall[0]).toContain('hybrid_profile_search');
    expect(secondCall[1]).toEqual([
      expect.stringContaining('Ime: Aleš Močnik'),
      expect.stringMatching(/^\[/),
      'uid-1',
      5,
    ]);
    expect(result[0]).toMatchObject({
      uid: 'uid-2',
      displayName: 'Dr. Petra Kos',
      score: 0.031,
    });
    expect(result[0]?.reasons).toEqual(
      expect.arrayContaining([
        'Skupna področja interesa: Umetna inteligenca',
        'Ujemanje ključnih besed: LLM',
        'Združljiva preferenca za način srečanja',
      ]),
    );
  });

  it('should swallow index sync errors in safeUpsertProfile', async () => {
    mockQuery.mockRejectedValue(new Error('database unavailable'));

    await expect(service.safeUpsertProfile(profile)).resolves.toBeUndefined();
  });
});
