import {
  isStrongRegistrationPassword,
  isValidDisplayName,
  normalizeDisplayName,
  normalizeEmail,
} from './auth-input.validation';

describe('authentication input validation', () => {
  describe('normalization', () => {
    it('normalizes email and display name input', () => {
      expect(normalizeEmail('  USER@Example.COM ')).toBe('user@example.com');
      expect(normalizeDisplayName('  Aleš Močnik  ')).toBe('Aleš Močnik');
    });
  });

  describe('display names', () => {
    it.each(['Aleš Močnik', "O'Connor", 'Ana-Marija', 'Dr. Novak', 'Živa'])(
      'accepts a valid name: %s',
      (value) => {
        expect(isValidDisplayName(value)).toBe(true);
      },
    );

    it.each([
      '',
      ' ',
      '  ',
      'A',
      'John  Doe',
      ' John Doe',
      'John Doe ',
      'John_Doe',
      '<script>',
      '12345',
    ])('rejects an invalid or whitespace-only name: %p', (value) => {
      expect(isValidDisplayName(value)).toBe(false);
    });
  });

  describe('registration passwords', () => {
    it('accepts a password that satisfies every policy requirement', () => {
      expect(isStrongRegistrationPassword('Correct-Horse9!')).toBe(true);
    });

    it.each([
      'Short1!',
      'alllowercase1!',
      'ALLUPPERCASE1!',
      'NoNumberHere!',
      'NoSpecial1234',
      'Contains Space1!',
      `Control${String.fromCharCode(10)}Char1!A`,
    ])('rejects an unsafe or weak password: %p', (value) => {
      expect(isStrongRegistrationPassword(value)).toBe(false);
    });
  });
});
