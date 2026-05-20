export const IMPORTABLE_FIELDS = [
  'bio',
  'affiliation',
  'interests',
  'goals',
  'meetingType',
  'competencies',
  'researchKeywords',
] as const;

export type ImportableField = (typeof IMPORTABLE_FIELDS)[number];
