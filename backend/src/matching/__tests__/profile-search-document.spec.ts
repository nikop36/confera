import { UserRoleEnum } from '../../common/enums/roles.enum';
import {
  buildProfileSearchText,
  hashProfileSearchText,
  SearchableProfile,
} from '../profile-search-document';

describe('profile search document helpers', () => {
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

  it('should build a normalized text document from profile fields', () => {
    const result = buildProfileSearchText(profile);

    expect(result).toContain('Ime: Aleš Močnik');
    expect(result).toContain('Organizacija: Univerza v Mariboru');
    expect(result).toContain(
      'Področja interesa: Umetna inteligenca, Strojno učenje',
    );
    expect(result).toContain('Ključne besede: LLM');
    expect(result).toContain('Oznake: Ni navedeno');
  });

  it('should use fallback text for missing optional values', () => {
    const result = buildProfileSearchText({
      ...profile,
      affiliation: undefined,
      bio: undefined,
      interests: undefined,
      goals: undefined,
      competencies: undefined,
      researchKeywords: undefined,
      meetingType: undefined,
    });

    expect(result).toContain('Organizacija: Ni navedeno');
    expect(result).toContain('Opis: Ni navedeno');
    expect(result).toContain('Področja interesa: Ni navedeno');
    expect(result).toContain('Način srečanja: both');
  });

  it('should create a stable hash for equal profile text', () => {
    const text = buildProfileSearchText(profile);

    expect(hashProfileSearchText(text)).toBe(hashProfileSearchText(text));
    expect(hashProfileSearchText(text)).toHaveLength(64);
  });
});
