import { createHash } from 'crypto';
import { User, UserProfile } from '../common/interfaces/user.interface';

export type SearchableProfile = User & UserProfile;

function list(values?: string[]) {
  return values?.filter(Boolean).join(', ') || 'Ni navedeno';
}

export function buildProfileSearchText(profile: SearchableProfile) {
  return [
    `Ime: ${profile.displayName}`,
    `Organizacija: ${profile.affiliation || 'Ni navedeno'}`,
    `Opis: ${profile.bio || 'Ni navedeno'}`,
    `Področja interesa: ${list(profile.interests)}`,
    `Cilji mreženja: ${list(profile.goals)}`,
    `Kompetence: ${list(profile.competencies)}`,
    `Ključne besede: ${list(profile.researchKeywords)}`,
    `Način srečanja: ${profile.meetingType || 'both'}`,
  ].join('\n');
}

export function hashProfileSearchText(profileText: string) {
  return createHash('sha256').update(profileText).digest('hex');
}
