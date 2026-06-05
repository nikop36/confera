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
    meetingType: 'both',
    tags: ['umetna-inteligenca', 'strojno-ucenje'],
  };

  it('should build a normalized text document from profile tags only', () => {
    const result = buildProfileSearchText(profile);

    expect(result).toBe('Oznake: umetna inteligenca, strojno ucenje');
    expect(result).not.toContain('Ime:');
    expect(result).not.toContain('Področja interesa:');
  });

  it('should use fallback text when tags are missing', () => {
    const result = buildProfileSearchText({
      ...profile,
      tags: undefined,
    });

    expect(result).toBe('Oznake: Ni navedeno');
  });

  it('should create a stable hash for equal profile text', () => {
    const text = buildProfileSearchText(profile);

    expect(hashProfileSearchText(text)).toBe(hashProfileSearchText(text));
    expect(hashProfileSearchText(text)).toHaveLength(64);
  });
});
