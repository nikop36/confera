import { BadRequestException } from '@nestjs/common';
import { IMPORTABLE_FIELDS } from '../../common/constants/importable-fields';
import { UserProfile } from '../../common/interfaces/user.interface';

const MEETING_TYPES = ['online', 'in-person', 'both'] as const;
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_ITEMS = 20;
const MAX_ITEM_LENGTH = 100;

const ARRAY_FIELDS = [
  'interests',
  'goals',
  'competencies',
  'researchKeywords',
] as const;

// Splits pipe-separated string into array and validates each item
function parseArrayField(value: string, fieldName: string): string[] {
  const items = value
    .split('|')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (items.length > MAX_ARRAY_ITEMS) {
    throw new BadRequestException(
      `Field "${fieldName}" cannot contain more than ${MAX_ARRAY_ITEMS} values`,
    );
  }

  for (const item of items) {
    if (item.length > MAX_ITEM_LENGTH) {
      throw new BadRequestException(
        `The value "${item}" in field "${fieldName}" is too long`,
      );
    }
  }

  return items;
}

function toStringValue(value: unknown, fieldName: string): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value).trim();
  throw new BadRequestException(`Field "${fieldName}" has to be text`);
}

// Takes a raw parsed row and returns only safe, validated fields
export function sanitizeImportRow(
  raw: Record<string, unknown>,
): Partial<UserProfile> {
  const result: Partial<UserProfile> = {};

  for (const field of IMPORTABLE_FIELDS) {
    const value = raw[field];

    if (value === undefined || value === null || value === '') continue;

    if ((ARRAY_FIELDS as readonly string[]).includes(field)) {
      const strValue = toStringValue(value, field);
      (result as Record<string, unknown>)[field] = parseArrayField(
        strValue,
        field,
      );
      continue;
    }

    if (field === 'meetingType') {
      const strValue = toStringValue(value, field);
      if (!MEETING_TYPES.includes(strValue as (typeof MEETING_TYPES)[number])) {
        throw new BadRequestException(
          `The "meetingType" field must be one of the values: ${MEETING_TYPES.join(', ')}`,
        );
      }
      result.meetingType = strValue as UserProfile['meetingType'];
      continue;
    }

    const strValue = toStringValue(value, field);
    if (strValue.length > MAX_STRING_LENGTH) {
      throw new BadRequestException(
        `Field "${field}" is too long — maximum ${MAX_STRING_LENGTH} characters`,
      );
    }
    (result as Record<string, unknown>)[field] = strValue;
  }

  return result;
}
