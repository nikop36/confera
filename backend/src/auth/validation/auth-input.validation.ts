import { ValidateBy, ValidationOptions } from 'class-validator';

const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 80;
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

function isUnicodeLetterOrMark(character: string): boolean {
  return /[\p{L}\p{M}]/u.test(character);
}

export function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function normalizeDisplayName(value: unknown): unknown {
  return typeof value === 'string' ? value.normalize('NFKC').trim() : value;
}

export function normalizeInviteToken(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function isValidDisplayName(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (
    value.length < DISPLAY_NAME_MIN_LENGTH ||
    value.length > DISPLAY_NAME_MAX_LENGTH
  ) {
    return false;
  }

  const characters = Array.from(value);
  if (
    !isUnicodeLetterOrMark(characters[0] ?? '') ||
    !isUnicodeLetterOrMark(characters.at(-1) ?? '')
  ) {
    return false;
  }

  let hasLetter = false;
  let previousSeparator: string | null = null;

  for (const character of characters) {
    if (isUnicodeLetterOrMark(character)) {
      hasLetter = true;
      previousSeparator = null;
      continue;
    }

    const isAllowedSeparator =
      character === ' ' ||
      character === '-' ||
      character === "'" ||
      character === '’' ||
      character === '.';

    if (!isAllowedSeparator) return false;
    if (
      previousSeparator &&
      !(previousSeparator === '.' && character === ' ')
    ) {
      return false;
    }
    previousSeparator = character;
  }

  return hasLetter;
}

export function isStrongRegistrationPassword(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (
    value.length < PASSWORD_MIN_LENGTH ||
    value.length > PASSWORD_MAX_LENGTH
  ) {
    return false;
  }

  const hasControlCharacter = Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });

  if (/\s/u.test(value) || hasControlCharacter) {
    return false;
  }

  return (
    /[a-z]/u.test(value) &&
    /[A-Z]/u.test(value) &&
    /[0-9]/u.test(value) &&
    /[^A-Za-z0-9\s]/u.test(value)
  );
}
export function IsValidDisplayName(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isValidDisplayName',
      validator: {
        validate: isValidDisplayName,
        defaultMessage: () =>
          'Display name must be 2-80 characters and contain only letters, single spaces, apostrophes, periods, or hyphens.',
      },
    },
    validationOptions,
  );
}

export function IsStrongRegistrationPassword(
  validationOptions?: ValidationOptions,
) {
  return ValidateBy(
    {
      name: 'isStrongRegistrationPassword',
      validator: {
        validate: isStrongRegistrationPassword,
        defaultMessage: () =>
          'Password must be 12-128 characters and include an uppercase letter, lowercase letter, number, and special character, without whitespace.',
      },
    },
    validationOptions,
  );
}
