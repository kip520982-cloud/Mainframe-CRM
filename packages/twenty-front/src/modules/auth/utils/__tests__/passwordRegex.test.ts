import { PASSWORD_REGEX } from '@/auth/utils/passwordRegex';

describe('PASSWORD_REGEX', () => {
  it('should match passwords with at least 4 characters', () => {
    const validPassword = 'password123';
    const invalidPassword = '123';

    expect(PASSWORD_REGEX.test(validPassword)).toBe(true);
    expect(PASSWORD_REGEX.test(invalidPassword)).toBe(false);
  });

  it('should match passwords with at most 50 characters', () => {
    const validPassword = 'a'.repeat(50);
    const invalidPassword = 'a'.repeat(51);

    expect(PASSWORD_REGEX.test(validPassword)).toBe(true);
    expect(PASSWORD_REGEX.test(invalidPassword)).toBe(false);
  });
});
