export const IMPORTABLE_FIELDS = [
  'bio',
  'affiliation',
  'meetingType',
  'tags',
] as const;

export type ImportableField = (typeof IMPORTABLE_FIELDS)[number];
