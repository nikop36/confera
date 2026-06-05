import { createHash } from 'node:crypto';
import { User, UserProfile } from '../common/interfaces/user.interface';

export type SearchableProfile = User & UserProfile;

export function buildProfileSearchText(profile: SearchableProfile) {
  const tagText = profile.tags?.length
    ? profile.tags.map((s) => s.replaceAll('-', ' ')).join(', ')
    : 'Ni navedeno';

  return `Oznake: ${tagText}`;
}

export function hashProfileSearchText(profileText: string) {
  return createHash('sha256').update(profileText).digest('hex');
}
